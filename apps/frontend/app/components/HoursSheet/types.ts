export interface HourSheetProps {
	closeSheet: () => void;
}

export interface BusinessHour {
	id: string;
	monday: boolean;
	tuesday: boolean;
	wednesday: boolean;
	thursday: boolean;
	friday: boolean;
	saturday: boolean;
	sunday: boolean;
	time_start: string | null;
	time_end: string | null;
	date_valid_from?: string | null;
	date_valid_till?: string | null;
}
