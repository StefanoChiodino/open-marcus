/**
 * Settings sub-component types
 * Extracted from Settings.tsx for proper component separation
 */

import type {
	SettingsResponse,
	SttModelInfo,
	TtsVoice,
} from "../../lib/settingsApi";

// Model Selection Section Props
export interface ModelSelectionProps {
	settingsData: SettingsResponse | null;
	isLoadingSettings: boolean;
	isSavingModel: boolean;
	selectedModel: string;
	downloadingModel: string | null;
	downloadProgress: number;
	downloadStatus: string;
	onModelChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

// TTS Settings Section Props
export interface TTSSettingsProps {
	settingsData: SettingsResponse | null;
	isLoadingSettings: boolean;
	isSavingTts: boolean;
	selectedVoice: TtsVoice;
	rateValue: number;
	pitchValue: number;
	onVoiceChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
	onRateChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
	onRateChangeCommit: (
		event:
			| React.ChangeEvent<HTMLInputElement>
			| React.MouseEvent<HTMLInputElement>,
	) => void;
	onPitchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
	onPitchChangeCommit: (
		event:
			| React.ChangeEvent<HTMLInputElement>
			| React.MouseEvent<HTMLInputElement>,
	) => void;
}

// STT Settings Section Props
export interface STTSettingsProps {
	sttModels: SttModelInfo[];
	isLoadingSttModels: boolean;
	isReloadingStt: boolean;
	selectedSttModel: string;
	showSttWarning: boolean;
	onSttModelChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
	onSttWarningDismiss: () => void;
}

// Data Management Props (Export/Import/Clear)
export interface DataManagementProps {
	isExporting: boolean;
	isImporting: boolean;
	isClearing: boolean;
	showClearConfirm: boolean;
	fileInputRef: React.RefObject<HTMLInputElement>;
	onExport: () => void;
	onImportFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
	onClearRequest: () => void;
	onClearConfirm: () => void;
	onClearCancel: () => void;
}
