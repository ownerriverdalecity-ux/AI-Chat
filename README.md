# VoiceRoom

A standalone VoiceRoom AI-character and text-to-speech website using HTML, CSS, and vanilla JavaScript. No npm dependencies or frontend frameworks are required.

## Run locally

Requires Node.js 20 or newer.

1. In the repository root, set the Inworld Basic Base64 credential as an environment variable. Copy the credential from your Inworld Portal; do not encode it again.

   macOS / Linux:
   ```sh
   export INWORLD_API_KEY='paste-your-inworld-basic-base64-credential'
   node server.js
   ```

   Windows PowerShell:
   ```powershell
   $env:INWORLD_API_KEY = "paste-your-inworld-basic-base64-credential"
   node server.js
   ```

2. Open http://localhost:3000.

The key is read by `server.js` and is not sent to browser JavaScript. Do not put credentials into `index.html`, `inworld.js`, or any public repository file.

## Inworld features

- Realtime TTS-2 and TTS-2 Flash model selection
- Voice ID selection, including the configured Arthur voice and example voice IDs
- Custom voice design prompt
- Stable, Balanced, and Creative delivery modes (delivery mode is supported by TTS-2)
- Speaking rate from 0.5× to 1.5×
- Optional language selection
- MP3 audio playback

Voice IDs depend on your Inworld account and permissions. If a sample voice is unavailable, select a voice ID from your Inworld voice catalog.

## Notes

- The API integration uses the Inworld `POST /tts/v1/voice` endpoint and returns generated MP3 audio to the page.
- This simple static-style site uses a small built-in Node.js HTTP server as a secure API proxy. It has no third-party packages.
- The character's conversational replies are still demo responses; Inworld integration currently supplies text-to-speech, not the language model that writes those replies.
- Use HTTPS and suitable access controls if deploying publicly. Do not expose the proxy to untrusted users without rate limits and abuse protections.
