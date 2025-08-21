export interface LanguageSheetProps {
	closeSheet: () => void;
	selectedLanguage: string;
	onSelect: (language: string) => void;
}
