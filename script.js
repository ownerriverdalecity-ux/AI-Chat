/* VoiceRoom: vanilla JavaScript chat and browser text-to-speech. */
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
  const ttsText = document.getElementById("ttsText");
  const ttsVoice = document.getElementById("ttsVoice");
  const ttsRate = document.getElementById("ttsRate");
  const rateValue = document.getElementById("rateValue");
  const ttsStatus = document.getElementById("ttsStatus");
  let busy = false;
  let recognition = null;
  let availableVoices = [];

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

  function refreshVoices() {
    if (!("speechSynthesis" in window)) return;
    availableVoices = window.speechSynthesis.getVoices();
    const previous = ttsVoice.value;
    ttsVoice.replaceChildren();
    const defaultOption = document.createElement("option");
    defaultOption.value = "default";
    defaultOption.textContent = "Default English voice";
    ttsVoice.appendChild(defaultOption);
    availableVoices.forEach((voice, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = voice.name + (voice.lang ? " (" + voice.lang + ")" : "");
      ttsVoice.appendChild(option);
    });
    if ([...ttsVoice.options].some(option => option.value === previous)) ttsVoice.value = previous;
  }

  function speak(text, customRate) {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      tell("Speech playback is not supported by this browser. Try a current version of Chrome, Edge, or Safari.");
      ttsStatus.textContent = "Speech synthesis is unavailable in this browser.";
      ttsStatus.classList.add("error");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const selected = ttsVoice.value;
    if (selected !== "default" && availableVoices[Number(selected)]) {
      utterance.voice = availableVoices[Number(selected)];
      utterance.lang = utterance.voice.lang || "en-US";
    } else {
      utterance.lang = "en-US";
    }
    utterance.rate = customRate || Number(ttsRate.value) || 0.92;
    utterance.pitch = 0.85;
    utterance.onstart = () => {
      status.textContent = "● Arthur is speaking";
      ttsStatus.textContent = "Speaking text aloud…";
      ttsStatus.classList.remove("error");
    };
    utterance.onend = () => {
      status.textContent = "● Ready to talk";
      ttsStatus.textContent = "Speech finished.";
    };
    utterance.onerror = event => {
      status.textContent = "● Ready to talk";
      if (event.error !== "canceled" && event.error !== "interrupted") {
        ttsStatus.textContent = "Could not play speech. Try another voice or browser.";
        ttsStatus.classList.add("error");
      }
    };
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
      speak(reply, 0.92);
    }, 450);
  }

  form.addEventListener("submit", event => { event.preventDefault(); send(); });
  input.addEventListener("input", () => { sendButton.disabled = !input.value.trim() || busy; });
  document.querySelectorAll("[data-prompt]").forEach(button => button.addEventListener("click", () => send(button.dataset.prompt)));
  document.getElementById("preview").addEventListener("click", () => speak(intro, 0.92));
  document.getElementById("reset").addEventListener("click", () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    messages.replaceChildren();
    addMessage("A fresh page. I like that. What’s on your mind?", "assistant");
    tell("");
    status.textContent = "● Ready to talk";
  });

  document.getElementById("generateSpeech").addEventListener("click", () => {
    const text = ttsText.value.trim();
    if (!text) {
      ttsStatus.textContent = "Enter some text before generating speech.";
      ttsStatus.classList.add("error");
      ttsText.focus();
      return;
    }
    tell("");
    ttsStatus.classList.remove("error");
    speak(text, Number(ttsRate.value));
  });
  document.getElementById("stopSpeech").addEventListener("click", () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    status.textContent = "● Ready to talk";
    ttsStatus.textContent = "Speech stopped.";
    ttsStatus.classList.remove("error");
  });
  ttsRate.addEventListener("input", () => { rateValue.textContent = Number(ttsRate.value).toFixed(2).replace(/0$/, "") + "×"; });
  if ("speechSynthesis" in window) {
    refreshVoices();
    window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
  }

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
