import {useSynchedCourseTimetableSettingsRaw} from '@/states/SynchedCourseTimetableSettings';
import {useBreakPointValue} from '@/helper/device/DeviceHelper';
import {PersistentStore} from '@/helper/syncState/PersistentStore';
import {useSyncState} from '@/helper/syncState/SyncState';
import {Weekday} from '@/helper/date/DateHelper';
import {useSynchedProfile} from "@/states/SynchedProfile";

type MarkerTime =`${number| ''}${number}:${number}${number}`

// Define the base type with optional 'id'
export type BaseCourseTimetableEvent = {
    id?: string,
    title?: string,
    location?: string,
    color?: string,
    start: MarkerTime,
    end: MarkerTime,
    weekday: Weekday
}

export function getNewCourseTimetableEvent(title?: string): BaseCourseTimetableEvent {
	return {
		title: title || 'New Event',
		end: '10:00',
		start: '08:00',
		color: '#FF0000',
		weekday: Weekday.MONDAY
	};
}

// Derive the type for new events where 'id' is optional
export type CourseTimetableEventNewType = BaseCourseTimetableEvent;

// Derive the type for existing events where 'id' is required
export type CourseTimetableEventType = Required<Pick<BaseCourseTimetableEvent, 'id'>> & BaseCourseTimetableEvent;

// Type guard function to check if an object is a CourseTimetableEventType
export function isCourseTimetableEventType(obj: any): obj is CourseTimetableEventType {
	return obj && typeof obj.id === 'string'; // Add more checks as necessary
}


export type CourseTimetableDictType = {
    [id: string]: CourseTimetableEventType
}

export function useCourseTimetableEvents(): [CourseTimetableDictType, (value: CourseTimetableDictType) => void, (partialEvent: CourseTimetableEventNewType) => Promise<boolean>, (item: CourseTimetableEventType) => Promise<boolean>] {
	//const [courseTimetableRaw, setCourseTimetableRaw] = useSyncState<CourseTimetableDictType>(PersistentStore.course_timetable)
	const [profile, setProfile] = useSynchedProfile();

	let profileCourseTimetable = profile.course_timetable || {};
	const usedCourseTimetable = profileCourseTimetable || {};

	const setCourseTimetable = (callback: (value: CourseTimetableDictType) => void) => {
		setProfile((profile) => {
			profile.course_timetable = callback(profile.course_timetable || {});
			return profile;
		});
	}

	const addNewCourseTimetableEvent = (partialEvent: CourseTimetableEventNewType) => {
		setCourseTimetable((usedCourseTimetable) => {
			// find the next free id
			let id = 1;
			while (usedCourseTimetable[id+'']) {
				// id is already taken
				id++;
			}

			const event: CourseTimetableEventType = partialEvent as CourseTimetableEventType;
			event.id = id+'';

			usedCourseTimetable[id] = event;
			return usedCourseTimetable;
		});
	}

	const removeCourseTimetableEvent = async (item: CourseTimetableEventType) => {
		setCourseTimetable((usedCourseTimetable) => {
			delete usedCourseTimetable[item.id];
			return usedCourseTimetable;
		});
	}

	return [usedCourseTimetable, setCourseTimetable, addNewCourseTimetableEvent, removeCourseTimetableEvent];
}

export function usePersonalCourseTimetableTimeStart(): [(string), ((value: string) => Promise<void>)] {
	const [time, setTime] = usePersonalCourseTimetableTime(true);
	return [time, setTime];
}

export function usePersonalCourseTimetableTimeEnd(): [(string), ((value: string) => Promise<void>)] {
	const [time, setTime] = usePersonalCourseTimetableTime(false);
	return [time, setTime];
}

function usePersonalCourseTimetableTime(start: boolean): [string, ((value: string) => Promise<void>)] {
	const [timetableSettings, setTimetableSettings] = useSynchedCourseTimetableSettingsRaw();
	const defaultValueStart: string = '08:00';
	const defaultValueEnd: string = '20:00';
	let time: string = start ? defaultValueStart : defaultValueEnd;
	if (timetableSettings?.start_time && start) {
		time = timetableSettings.start_time;
	}
	if (timetableSettings?.end_time && !start) {
		time = timetableSettings.end_time;
	}
	const setTime = async (value: string | null) => {
		return await setTimetableSettings((currentValue) => {
			let usedValue: string | undefined = undefined
			if (value) {
				usedValue = value
			}
			if (start) {
				currentValue.start_time = usedValue;
			} else {
				currentValue.end_time = usedValue;
			}
		});
	}
	return [time, setTime];
}

export function usePersonalCourseTimetableAmountDaysOnScreen(): [number, (value: number | null) => void] {
	const [timetableSettings, setTimetableSettings] = useSynchedCourseTimetableSettingsRaw();
	const defaultValue = useBreakPointValue({
		sm: 2.1,
		md: 5.1,
		lg: 5.1,
	});
	const amountDaysOnScreen = timetableSettings?.amount_days_to_show || defaultValue;
	const setAmountDaysOnScreen = (value: number | null) => {
		setTimetableSettings((currentValue) => {
			currentValue.amount_days_to_show = undefined
			if (value) {
				currentValue.amount_days_to_show = value;
			}
			return currentValue;
		});
	}
	return [amountDaysOnScreen, setAmountDaysOnScreen];
}

export function usePersonalCourseTimetableTitleIntelligent(): [boolean, (value: boolean) => void] {
	const [timetableSettings, setTimetableSettings] = useSynchedCourseTimetableSettingsRaw();
	const defaultValue = true;
	const titleIntelligent = timetableSettings.intelligent_title || defaultValue;
	const setTitleIntelligent = (value: boolean) => {
		setTimetableSettings((currentValue) => {
			if(currentValue){
				currentValue.intelligent_title = value;
			}
			return currentValue;
		});
	}
	return [titleIntelligent, setTitleIntelligent];
}
