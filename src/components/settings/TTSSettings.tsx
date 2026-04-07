/**
 * TTS Settings Component
 * Handles voice output selection, speed, and pitch adjustments
 */

import { TTS_VOICES, TTS_MIN_RATE, TTS_MAX_RATE, TTS_MIN_PITCH, TTS_MAX_PITCH } from '../../lib/settingsApi';
import type { TTSSettingsProps } from './types';

export function TTSSettings({
  isLoadingSettings,
  selectedVoice,
  rateValue,
  pitchValue,
  isSavingTts,
  onVoiceChange,
  onRateChange,
  onPitchChange,
}: TTSSettingsProps) {
  if (isLoadingSettings) {
    return (
      <div className="loading-spinner" role="status" aria-label="Loading TTS settings">
        Loading TTS settings...
      </div>
    );
  }

  return (
    <div className="tts-settings">
      {/* Voice Selection */}
      <div className="tts-settings__control">
        <label htmlFor="tts-voice-select" className="tts-settings__label">
          Voice
        </label>
        <select
          id="tts-voice-select"
          className="tts-settings__dropdown"
          value={selectedVoice}
          onChange={onVoiceChange}
          disabled={isSavingTts}
        >
          {TTS_VOICES.map((voice) => (
            <option key={voice} value={voice}>
              {voice}
            </option>
          ))}
        </select>
        <p className="tts-settings__help">
          Select the voice used for text-to-speech output during meditation sessions.
        </p>
      </div>

      {/* Rate Slider */}
      <div className="tts-settings__control">
        <label htmlFor="tts-rate-slider" className="tts-settings__label">
          Speed: <span className="tts-settings__value">{rateValue >= 0 ? `+${rateValue}%` : `${rateValue}%`}</span>
        </label>
        <div className="tts-settings__slider-container">
          <span className="tts-settings__slider-range">{TTS_MIN_RATE}%</span>
          <input
            id="tts-rate-slider"
            type="range"
            className="tts-settings__slider"
            min={TTS_MIN_RATE}
            max={TTS_MAX_RATE}
            value={rateValue}
            onChange={onRateChange}
            disabled={isSavingTts}
            aria-describedby="tts-rate-help"
          />
          <span className="tts-settings__slider-range">{TTS_MAX_RATE}%</span>
        </div>
        <p id="tts-rate-help" className="tts-settings__help">
          Adjust speech speed. Default is +25% (faster than normal).
        </p>
      </div>

      {/* Pitch Slider */}
      <div className="tts-settings__control">
        <label htmlFor="tts-pitch-slider" className="tts-settings__label">
          Pitch: <span className="tts-settings__value">{pitchValue >= 0 ? `+${pitchValue}Hz` : `${pitchValue}Hz`}</span>
        </label>
        <div className="tts-settings__slider-container">
          <span className="tts-settings__slider-range">{TTS_MIN_PITCH}Hz</span>
          <input
            id="tts-pitch-slider"
            type="range"
            className="tts-settings__slider"
            min={TTS_MIN_PITCH}
            max={TTS_MAX_PITCH}
            value={pitchValue}
            onChange={onPitchChange}
            disabled={isSavingTts}
            aria-describedby="tts-pitch-help"
          />
          <span className="tts-settings__slider-range">+{TTS_MAX_PITCH}Hz</span>
        </div>
        <p id="tts-pitch-help" className="tts-settings__help">
          Adjust speech pitch. Default is +0Hz (natural pitch).
        </p>
      </div>
    </div>
  );
}