export interface DrawerPositionSheetProps {
	closeSheet: () => void;
	selectedPosition: string;
	onSelect: (position: string) => void;
}
