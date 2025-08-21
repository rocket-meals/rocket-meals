export interface AmountColumnSheetProps {
	closeSheet: () => void;
	selectedAmount: number;
	onSelect: (value: number) => void;
}
