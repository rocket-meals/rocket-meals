export type FirstDayOfWeek = {
	id: string;
	name: string;
};

export interface CourseBottomSheetProps {
	timeTableData: any[];
	closeSheet: () => void;
	isUpdate: boolean;
	selectedEventId: string;
}

export interface CourseBottomSheetState {
	selectedFirstDay: string;
	selectedItem: any | null;
	windowWidth: number;
	data: any[];
	inputValue: string;
}

export type BaseCourseTimetableEvent = {
	id?: string;
	title?: string;
	location?: string;
	color?: string;
	start: string;
	end: string;
	weekday: string;
};

export type EventTypes = {
	id?: string;
	title?: string;
	location?: string;
	color?: string;
	startTime: string;
	endTime: string;
	day: string;
};

export interface CourseTimetableProps {
	events: EventTypes[];
	openSheet: () => void;
	setIsUpdate: React.Dispatch<React.SetStateAction<boolean>>;
	setTimeTableData: React.Dispatch<React.SetStateAction<any>>;
	setSelectedEventId: React.Dispatch<React.SetStateAction<string>>;
}
