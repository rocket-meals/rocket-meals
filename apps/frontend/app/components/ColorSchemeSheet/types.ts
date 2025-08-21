export interface ColorSchemeSheetProps {
	closeSheet: () => void;
	selectedTheme: string;
	onSelect: (theme: string) => void;
}
