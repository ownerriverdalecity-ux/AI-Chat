/* VoiceRoom — plain JavaScript only; no external libraries or plugins. */
(function () {
  "use strict";
  const intro = "Hello there. I’m Arthur. I’ve spent a lifetime solving engineering problems, and I still believe curiosity is the best tool we have. What would you like to talk about?";
  const messages = document.getElementById("messages");
  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const sendButton = document.getElementById("send");
  const micButton = document.getElementById("mic");
  const notice = document.getElementById("notice");
  const status = document.getElementById("status");
  let busy = false;
  let recognition = null;

  function tell(text) {
    notice.textContent = text;
    notice.classList.toggle("show", Boolean(text));
  }
  function scrollDown() { messages.scrollTop = messages.scrollHeight; }
  function addMessage(text, who) {
    const bubble = document.createElement("div");
    bubble.className = "bubble " + who;
    bubble.textContent = text;
    messages.appendChild(bubble);
    scrollDown();
  }
  function answerFor(message) {
    const text = message.toLowerCase();
    if (/^(hi|hello|hey|good morning)\b/.test(text)) return "Hello there. It’s lovely to meet you. What have you been curious about lately?";
    if (/engineer|engineering|build|machine|bridge/.test(text)) return "That’s a good engineering question. I like to start with the fundamentals: understand the problem, make the simplest useful model, and test your assumptions. Which part shall we explore first?";
    if (/life|advice|career|work/.test(text)) return "Here’s something years of problem-solving taught me: stay curious, be patient with yourself, and don’t be afraid to ask a simple question. That’s often where the real insight begins.";
    if (/how are you|how do you feel/.test(text)) return "I’m doing well, thank you for asking. A good conversation and a curious mind can brighten just about any day.";
    return "That’s interesting. Let’s take our time with it. Tell me a little more about what matters most to you, and we’ll work through it together.";
  }
  function speak(text) {
    if (!("speechSynthesis" in window)) {
      tell("Speech playback is not supported by this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.92;
    utterance.pitch = 0.85;
    utterance.onstart = () => { status.textContent = "● Arthur is speaking"; };
    utterance.onend = () => { status.textContent = "● Ready to talk"; };
    utterance.onerror = () => { status.textContent = "● Ready to talk"; };
    window.speechSynthesis.speak(utterance);
  }
  function send(text) {
    const value = (text || input.value).trim();
    if (!value || busy) return;
    tell("");
    addMessage(value, "user");
    input.value = "";
    busy = true;
    sendButton.disabled = true;
    const pending = document.createElement("div");
    pending.className = "bubble assistant";
    pending.textContent = "Arthur is thinking…";
    messages.appendChild(pending);
    scrollDown();
    window.setTimeout(() => {
      const reply = answerFor(value);
      pending.remove();
      addMessage(reply, "assistant");
      busy = false;
      sendButton.disabled = !input.value.trim();
      speak(reply);
    }, 450);
  }
  form.addEventListener("submit", event => { event.preventDefault(); send(); });
  input.addEventListener("input", () => { sendButton.disabled = !input.value.trim() || busy; });
  document.querySelectorAll("[data-prompt]").forEach(button => button.addEventListener("click", () => send(button.dataset.prompt)));
  document.getElementById("preview").addEventListener("click", () => speak(intro));
  document.getElementById("reset").addEventListener("click", () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    messages.replaceChildren();
    addMessage("A fresh page. I like that. What’s on your mind?", "assistant");
    tell("");
    status.textContent = "● Ready to talk";
  });
  micButton.addEventListener("click", () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      tell("Speech recognition is unavailable in this browser. Try Chrome or type your message.");
      return;
    }
    if (recognition) { recognition.stop(); return; }
    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => { micButton.classList.add("listening"); micButton.textContent = "■"; tell(""); };
    recognition.onresult = event => send(event.results[0][0].transcript);
    recognition.onerror = () => tell("I couldn't catch that. Check microphone permissions and try again.");
    recognition.onend = () => { micButton.classList.remove("listening"); micButton.textContent = "🎙"; recognition = null; };
    try { recognition.start(); } catch { tell("Microphone could not start. Check browser permissions."); }
  });
  sendButton.disabled = true;
})();
