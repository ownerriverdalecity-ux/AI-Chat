/* VoiceRoom Inworld UI integration. Calls the same-origin JavaScript server; no API key is exposed in this file. */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const voiceSelect = $("inworldVoice");
  const voiceIdInput = $("inworldVoiceId");
  const modelSelect = $("inworldModel");
  const modeSelect = $("inworldMode");
  const languageSelect = $("inworldLanguage");
  const rateInput = $("inworldRate");
  const rateValue = $("inworldRateValue");
  const textInput = $("ttsText");
  const audio = $("inworldAudio");
  const status = $("inworldStatus");
  const generateButton = $("generateInworld");
  const loadButton = $("loadInworldVoices");
  let audioUrl = null;

  function setStatus(message, isError) {
    status.textContent = message;
    status.classList.toggle("error", Boolean(isError));
  }
  rateInput.addEventListener("input", () => {
    rateValue.textContent = Number(rateInput.value).toFixed(2).replace(/0$/, "") + "×";
  });
  voiceSelect.addEventListener("change", () => {
    if (voiceSelect.value === "custom-design") {
      voiceIdInput.value = "";
      voiceIdInput.placeholder = "Describe voice: age, accent, tone, delivery…";
    } else {
      voiceIdInput.value = voiceSelect.value;
      voiceIdInput.placeholder = "Voice ID or describe your voice";
    }
  });
  voiceIdInput.addEventListener("input", () => {
    if (![...voiceSelect.options].some(option => option.value === voiceIdInput.value)) voiceSelect.value = "custom-design";
  });

  async function generate() {
    const text = textInput.value.trim();
    if (!text) {
      setStatus("Enter some text before generating speech.", true);
      textInput.focus();
      return;
    }
    if (text.length > 2000) {
      setStatus("This endpoint supports up to 2,000 characters per request. Shorten the text and try again.", true);
      return;
    }
    generateButton.disabled = true;
    loadButton.disabled = true;
    setStatus("Connecting to Inworld and generating audio…");
    try {
      const selectedVoice = voiceSelect.value;
      const payload = {
        text,
        modelId: modelSelect.value,
        deliveryMode: modeSelect.value,
        speakingRate: Number(rateInput.value),
        language: languageSelect.value || undefined,
        voiceId: selectedVoice === "custom-design" ? undefined : (voiceIdInput.value.trim() || selectedVoice),
        designPrompt: selectedVoice === "custom-design" ? voiceIdInput.value.trim() : undefined
      };
      if (selectedVoice === "custom-design" && !payload.designPrompt) {
        throw new Error("Enter a voice design description in the Voice ID / design prompt field.");
      }
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Inworld request failed (HTTP " + response.status + ").");
      if (!result.audioContent) throw new Error("Inworld returned no audio content.");
      const bytes = Uint8Array.from(atob(result.audioContent), character => character.charCodeAt(0));
      const blob = new Blob([bytes], { type: "audio/mpeg" });
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      audioUrl = URL.createObjectURL(blob);
      audio.src = audioUrl;
      audio.hidden = false;
      await audio.play();
      setStatus("Audio generated with " + (result.modelId || payload.modelId) + ". Use the audio player to replay or save it.");
    } catch (error) {
      setStatus(error.message || "Unable to connect to Inworld.", true);
    } finally {
      generateButton.disabled = false;
      loadButton.disabled = false;
    }
  }
  generateButton.addEventListener("click", generate);
  loadButton.addEventListener("click", () => {
    voiceSelect.focus();
    setStatus("Choose one of the example voice IDs, or select Custom voice design and enter a description. The available voices depend on your Inworld account.");
  });
  audio.hidden = true;
})();
