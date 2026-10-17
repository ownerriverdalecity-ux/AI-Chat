/* VoiceRoom lightweight Node.js server + Inworld TTS proxy.
   Uses only built-in Node.js modules. Requires Node.js 20+ and INWORLD_API_KEY.
   Keep the Inworld Basic Base64 credential on the server, never in browser code. */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT || 3000);
const API_KEY = process.env.INWORLD_API_KEY;
const ROOT = __dirname;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon"
};
function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (req.method === "POST" && url.pathname === "/api/tts") {
    if (!API_KEY) return sendJson(res, 503, { error: "Inworld is not configured on the server. Set INWORLD_API_KEY to your Inworld Basic Base64 credential, then restart the server." });
    let raw = "";
    req.on("data", chunk => {
      raw += chunk;
      if (raw.length > 100000) req.destroy();
    });
    req.on("end", async () => {
      try {
        const input = JSON.parse(raw || "{}");
        if (typeof input.text !== "string" || !input.text.trim()) return sendJson(res, 400, { error: "Text is required." });
        if (input.text.length > 2000) return sendJson(res, 400, { error: "Text must be 2,000 characters or fewer." });
        const modelId = ["inworld-tts-2", "inworld-tts-2-flash"].includes(input.modelId) ? input.modelId : "inworld-tts-2";
        const rate = Number(input.speakingRate);
        const body = {
          text: input.text,
          modelId,
          audioConfig: { audioEncoding: "MP3" },
          speakingRate: Number.isFinite(rate) ? Math.min(1.5, Math.max(0.5, rate)) : 1
        };
        if (input.voiceId && input.voiceId !== "custom-design") body.voiceId = String(input.voiceId).slice(0, 300);
        else if (typeof input.designPrompt === "string" && input.designPrompt.trim()) body.voiceDesign = { designPrompt: input.designPrompt.trim().slice(0, 1024) };
        else return sendJson(res, 400, { error: "Choose a voice ID or provide a voice design prompt." });
        if (["STABLE", "BALANCED", "CREATIVE"].includes(input.deliveryMode) && modelId === "inworld-tts-2") body.deliveryMode = input.deliveryMode;
        if (typeof input.language === "string" && input.language.trim()) body.language = input.language.trim().slice(0, 35);
        const upstream = await fetch("https://api.inworld.ai/tts/v1/voice", {
          method: "POST",
          headers: { "Authorization": "Basic " + API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(60000)
        });
        const result = await upstream.json().catch(() => ({}));
        if (!upstream.ok) {
          const message = result?.error?.message || result?.message || "Inworld API request failed.";
          return sendJson(res, upstream.status, { error: message });
        }
        if (typeof result.audioContent !== "string") return sendJson(res, 502, { error: "Inworld response did not contain audio." });
        return sendJson(res, 200, { audioContent: result.audioContent, modelId: result.usage?.modelId || modelId, processedCharactersCount: result.usage?.processedCharactersCount });
      } catch (error) {
        return sendJson(res, 500, { error: error.message || "Could not process the Inworld request." });
      }
    });
    return;
  }
  if (req.method !== "GET" && req.method !== "HEAD") return sendJson(res, 405, { error: "Method not allowed." });
  let requested = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const file = path.resolve(ROOT, "." + requested);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return sendJson(res, 403, { error: "Forbidden." });
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Not found");
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "X-Content-Type-Options": "nosniff" });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file).pipe(res);
  });
});
server.listen(PORT, () => {
  console.log("VoiceRoom running at http://localhost:" + PORT);
  if (!API_KEY) console.log("Set INWORLD_API_KEY to enable Inworld TTS.");
});
