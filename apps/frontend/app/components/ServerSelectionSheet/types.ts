import type { CustomerConfig } from '@/config';

export interface ServerSelectionSheetProps {
	closeSheet: () => void;
	selectedServer: string;
	onSelect: (config: CustomerConfig) => void;
}
