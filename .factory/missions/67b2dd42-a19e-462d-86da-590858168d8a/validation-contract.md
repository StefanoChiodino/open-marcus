# Validation Contract: TTS/STT Settings

This contract defines behavioral assertions for TTS and STT settings functionality.

## Area: TTS Settings

### VAL-TTS-001: Voice dropdown shows curated voices
The TTS settings section displays a voice dropdown with exactly 6 curated English neural voices: en-US-GuyNeural (default), en-US-ChristopherNeural, en-US-BrianNeural, en-GB-ThomasNeural, en-US-JennyNeural, en-US-MichelleNeural.
Tool: agent-browser
Evidence: screenshot, dropdown options list

### VAL-TTS-002: Rate slider controls speech rate
A rate slider allows adjusting speech rate from -50% to +100% (default +25%). The slider updates the displayed value as it changes.
Tool: agent-browser
Evidence: screenshot, slider interaction, value display

### VAL-TTS-003: Pitch slider controls pitch
A pitch slider allows adjusting pitch from -50Hz to +50Hz (default +0Hz). The slider updates the displayed value as it changes.
Tool: agent-browser
Evidence: screenshot, slider interaction, value display

### VAL-TTS-004: TTS settings persist after page refresh
After saving TTS settings (voice, rate, pitch) and refreshing the page, the Settings page displays the previously saved values.
Tool: agent-browser
Evidence: screenshot before refresh, screenshot after refresh showing same values

### VAL-TTS-005: TTS settings save successfully via API
Changing any TTS setting (voice, rate, or pitch) triggers a PUT /api/settings request with the new values and returns a success response.
Tool: agent-browser, curl
Evidence: network(PUT /api/settings -> 200), screenshot toast notification

### VAL-TTS-006: TTS voice playback uses saved voice
When voice output is enabled in a meditation session, Marcus's responses are spoken using the saved TTS voice setting (not the default voice).
Tool: agent-browser
Evidence: screenshot of voice playback with selected voice

## Area: STT Settings

### VAL-STT-001: STT model dropdown lists available models
The STT settings section displays a dropdown listing all sherpa-onnx model directories in servers/stt/ (e.g., sherpa-onnx-whisper-tiny.en).
Tool: agent-browser
Evidence: screenshot, dropdown options list

### VAL-STT-002: Model size displayed in dropdown
Each model in the dropdown shows its approximate disk/memory size requirement.
Tool: agent-browser
Evidence: screenshot showing size next to model name

### VAL-STT-003: Warning shown for larger models
When switching from a smaller to a larger model, a warning message is displayed indicating the model requires more memory.
Tool: agent-browser
Evidence: screenshot of warning message

### VAL-STT-004: Reload Model button triggers API
Clicking "Reload Model" triggers a POST /api/settings/stt-reload request with the selected model.
Tool: agent-browser, curl
Evidence: network(POST /api/settings/stt-reload -> 200)

### VAL-STT-005: Loading indicator during model reload
While the STT model is being reloaded, a loading indicator is displayed in the UI.
Tool: agent-browser
Evidence: screenshot showing loading spinner/text during reload

### VAL-STT-006: Model reload succeeds without server restart
The STT server remains accessible (health check passes) after model reload completes.
Tool: curl
Evidence: curl http://localhost:8765/health -> 200 before and after reload

### VAL-STT-007: Voice input uses reloaded model
After reloading to a different STT model, voice input in a meditation session successfully transcribes audio using the new model.
Tool: agent-browser
Evidence: screenshot of transcription result with new model

### VAL-STT-008: Error handling for failed reload
If the STT model reload fails, an error message is displayed and the previous model remains active.
Tool: agent-browser
Evidence: screenshot of error toast/message

## Cross-Area Flows

### VAL-CROSS-001: TTS settings apply in meditation session
After saving TTS voice/rate/pitch settings in Settings, starting a meditation session and enabling voice output plays Marcus's responses using the saved settings.
Tool: agent-browser
Evidence: screenshot of Settings save, screenshot of meditation with voice playing

### VAL-CROSS-002: STT settings apply in meditation session
After reloading an STT model in Settings, starting a meditation session and using voice input transcribes audio using the newly loaded model.
Tool: agent-browser
Evidence: screenshot of STT reload complete, screenshot of voice transcription working

### VAL-CROSS-003: Settings persist across browser sessions
TTS and STT settings saved in one browser session are preserved and displayed when reopening the Settings page in a new session.
Tool: agent-browser
Evidence: screenshot of settings in session 1, screenshot of same settings in session 2
