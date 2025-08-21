export interface NicknameSheetProps {
	closeSheet: () => void;
	value: string;
	onChange: (val: string) => void;
	onSave: () => void;
	disableSave?: boolean;
}
