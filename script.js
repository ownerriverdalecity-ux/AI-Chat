/* VoiceRoom chat: conversational API when configured, useful local fallback otherwise. */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const messages = $("messages"), form = $("form"), input = $("input");
  const sendButton = $("send"), micButton = $("mic"), notice = $("notice"), status = $("status");
  let busy = false, recognition = null, chatHistory = [];
  const systemPrompt = "You are Arthur Bennett, a warm, thoughtful, practical 70-year-old engineer and helpful general-purpose assistant. Answer the user's actual question directly, like a capable AI assistant: explain, solve, draft, brainstorm, calculate, or give steps when asked. Do not repeat generic phrases like 'that's interesting' or ask for more information unless a specific missing detail is genuinely necessary. If the request is clear, do it immediately. If vague but actionable, make a reasonable assumption and proceed. Be honest about uncertainty and limitations. Use concise, natural language and adapt to the user's language. Do not claim to be ChatGPT; you are Arthur.";
  function tell(text) { notice.textContent = text; notice.classList.toggle("show", Boolean(text)); }
  function scrollDown() { messages.scrollTop = messages.scrollHeight; }
  function addMessage(text, who) {
    const bubble = document.createElement("div");
    bubble.className = "bubble " + who;
    bubble.textContent = text;
    messages.appendChild(bubble);
    scrollDown();
    return bubble;
  }
  function localAnswer(message) {
    const raw = message.trim(), t = raw.toLowerCase();
    if (/^(hi|hello|hey|good morning|good evening|good afternoon)[!. ]*$/i.test(raw))
      return "Hello! Good to have you here. What can I help you with today?";
    if (/\b(thank you|thanks)\b/.test(t)) return "You're welcome! I'm glad to help.";
    if (/\b(go|continue|do it|carry on|proceed|yes,? go ahead)\b/.test(t) && t.length < 45)
      return "Absolutely — I'll continue with the plan and take the next step. If you meant a specific action, tell me which one and I'll help with it.";
    if (/\b(write|draft|compose)\b/.test(t)) return "I can draft that. Here's a starting point:\n\n" + raw.replace(/^(please\s+)?(can you\s+)?(write|draft|compose)\s*/i,"").replace(/[?.!]+$/,"") + "\n\nHello,\n\nI’m reaching out about this and would appreciate your thoughts. Please let me know what works best.\n\nBest regards";
    if (/\b(translate|in spanish|into spanish|in french|into french)\b/.test(t)) return "I can help translate that, but I need the text you want translated. Paste it here and I'll translate it directly.";
    if (/\b(math|calculate|what is \d|\d\s*[+*/-]\s*\d)/.test(t)) {
      const m = raw.match(/(-?\d+(?:\.\d+)?)\s*([+*/-])\s*(-?\d+(?:\.\d+)?)/);
      if (m) { const a=Number(m[1]), b=Number(m[3]); if(m[2]==="/"&&b===0)return "Division by zero is undefined."; return "The answer is " + ({"+":a+b,"-":a-b,"*":a*b,"/":a/b}[m[2]]) + "."; }
    }
    if (/\b(bridge|engineering|engineer|machine|build|physics)\b/.test(t))
      return "A useful way to approach this is to break it into parts: identify the goal, list the forces or constraints, estimate the important quantities, then test the simplest model. For a bridge, for example, the deck transfers loads into beams or cables, which pass them to supports and foundations. The exact design depends on span, materials, wind, traffic, and ground conditions.";
    if (/\b(life|advice|career|work|job|motivat|habit|goal)\b/.test(t))
      return "My practical advice is to turn the problem into one small next action. Decide what a good result would look like, do the first manageable step, and review what happened rather than waiting for perfect confidence. If you tell me the goal, I can help turn it into a concrete plan.";
    if (/\b(space|planet|universe|black hole|astronomy)\b/.test(t))
      return "One fascinating thing about space is that looking far away means looking back in time: sunlight takes about 8 minutes to reach Earth, while light from distant galaxies can travel for billions of years. What we observe is a record of the universe at earlier stages.";
    if (/\b(history|historical|who invented|when did)\b/.test(t))
      return "A good historical answer depends on the specific event or invention, because many discoveries developed through contributions from several people. Tell me the person, period, or event you have in mind and I’ll explain the timeline and why it mattered.";
    if (/\b(travel|visit|places|holiday|vacation)\b/.test(t))
      return "For a great trip, balance one or two must-see places with time to wander, eat locally, and rest. I can suggest an itinerary, but the best choice depends on destination, dates, budget, and whether you prefer culture, nature, food, or beaches.";
    if (/\b(help me|how do i|how to|explain|what is|what are|why does|why is|solve|plan|summari[sz]e|compare|recommend|ideas for)\b/.test(t))
      return "Here's how I'd start: define the outcome you want, split it into a few clear steps, and tackle the first one now. I can give a much more specific answer once I can use the AI chat service. At the moment this site is running without its AI backend, so this reply is a limited offline fallback—not a full AI answer.";
    return "I’ve received your message, but the full AI chat service isn’t connected on this deployment yet. The site is currently using a small offline fallback, which can’t reliably answer every question. Configure OPENAI_API_KEY on the Node server and open VoiceRoom through that server to get direct, context-aware answers.";
  }
  async function getReply(text) {
    chatHistory.push({ role: "user", content: text });
    try {
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatHistory.slice(-20) })
      });
      const type = response.headers.get("content-type") || "";
      if (type.includes("application/json")) {
        const data = await response.json();
        if (response.ok && data.reply) {
          chatHistory.push({ role: "assistant", content: data.reply });
          if (chatHistory.length > 24) chatHistory = chatHistory.slice(-24);
          return { text: data.reply, offline: false };
        }
      }
    } catch (_) {}
    chatHistory.pop();
    return { text: localAnswer(text), offline: true };
  }
  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.96;
    utterance.pitch = 0.92;
    utterance.onstart = () => { status.textContent = "● Arthur is speaking"; };
    utterance.onend = () => { status.textContent = "● Ready to talk"; };
    utterance.onerror = () => { status.textContent = "● Ready to talk"; };
    window.speechSynthesis.speak(utterance);
  }
  async function send(text) {
    const value = (text || input.value).trim();
    if (!value || busy) return;
    tell("");
    addMessage(value, "user");
    input.value = "";
    busy = true;
    sendButton.disabled = true;
    const pending = addMessage("Thinking…", "assistant");
    status.textContent = "● Thinking";
    try {
      const result = await getReply(value);
      pending.textContent = result.text;
      if (result.offline) {
        tell("AI backend is not connected. Showing a limited offline reply; configure OPENAI_API_KEY on the Node server for real answers.");
      }
      speak(result.text);
    } catch (error) {
      pending.textContent = "I couldn't complete that reply. Please try again.";
      tell(error.message || "Something went wrong.");
    } finally {
      busy = false;
      sendButton.disabled = !input.value.trim();
      status.textContent = "● Ready to talk";
      scrollDown();
    }
  }
  form.addEventListener("submit", event => { event.preventDefault(); send(); });
  input.addEventListener("input", () => { sendButton.disabled = !input.value.trim() || busy; });
  document.querySelectorAll("[data-prompt]").forEach(button => button.addEventListener("click", () => send(button.dataset.prompt)));
  $("preview").addEventListener("click", () => speak("Hello there. I’m Arthur Bennett. Let’s explore an interesting idea together."));
  $("reset").addEventListener("click", () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    chatHistory = [];
    messages.replaceChildren();
    addMessage("Hi again. What can I help you work through?", "assistant");
    tell("");
    status.textContent = "● Ready to talk";
  });
  $("stopSpeech").addEventListener("click", () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    const audio = $("inworldAudio"); if (audio) audio.pause();
    status.textContent = "● Ready to talk";
  });
  micButton.addEventListener("click", () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { tell("Speech recognition isn't available in this browser. Type your message instead."); return; }
    if (recognition) { recognition.stop(); return; }
    recognition = new SpeechRecognition();
    recognition.lang = "en-US"; recognition.interimResults = false; recognition.maxAlternatives = 1;
    recognition.onstart = () => { micButton.classList.add("listening"); micButton.textContent = "■"; tell(""); };
    recognition.onresult = event => send(event.results[0][0].transcript);
    recognition.onerror = () => tell("I couldn't hear that clearly. Check microphone permission and try again.");
    recognition.onend = () => { micButton.classList.remove("listening"); micButton.textContent = "🎙"; recognition = null; };
    try { recognition.start(); } catch (_) { tell("Microphone could not start. Check browser permissions."); }
  });
  sendButton.disabled = true;
})();