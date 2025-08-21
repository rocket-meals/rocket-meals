export interface FirstDaySheetProps {
	closeSheet: () => void;
	selectedDay: string;
	onSelect: (day: { id: string; name: string }) => void;
}
