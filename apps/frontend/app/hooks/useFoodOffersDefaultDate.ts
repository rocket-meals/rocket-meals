import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';
import { SET_SELECTED_DATE } from '@/redux/Types/types';

const DEFAULT_THRESHOLD = '18:00';

const formatDate = (date: Date) => date.toISOString().split('T')[0];

const parseThreshold = (value: string) => {
	const match = /^(\d{2}):(\d{2})$/.exec(value || '');
	if (!match) {
		return { hours: 18, minutes: 0 };
	}

	const hours = Math.min(23, Math.max(0, Number(match[1])));
	const minutes = Math.min(59, Math.max(0, Number(match[2])));

	return { hours, minutes };
};

const calculateDefaultDate = (now: Date, thresholdTime: string) => {
	const { hours, minutes } = parseThreshold(thresholdTime);
	const threshold = new Date(now);
	threshold.setHours(hours, minutes, 0, 0);

	const baseDate = new Date(now);
	if (now.getTime() >= threshold.getTime()) {
		baseDate.setDate(baseDate.getDate() + 1);
	}

	return formatDate(baseDate);
};

const useFoodOffersDefaultDate = () => {
	const dispatch = useDispatch();
	const { selectedDate } = useSelector((state: RootState) => state.food);
	const { foodOffersNextDayThreshold } = useSelector((state: RootState) => state.settings);

	const [currentTime, setCurrentTime] = useState(() => new Date());
	const threshold = foodOffersNextDayThreshold || DEFAULT_THRESHOLD;

	useEffect(() => {
		const interval = setInterval(() => {
			setCurrentTime(new Date());
		}, 60_000);

		return () => clearInterval(interval);
	}, []);

	const todayString = useMemo(() => formatDate(currentTime), [currentTime]);
	const defaultDate = useMemo(() => calculateDefaultDate(currentTime, threshold), [currentTime, threshold]);

	const hasAppliedRef = useRef(false);
	const initialSelectedDateRef = useRef(selectedDate);
	const previousDefaultRef = useRef(defaultDate);

	useEffect(() => {
		if (previousDefaultRef.current !== defaultDate) {
			previousDefaultRef.current = defaultDate;
			hasAppliedRef.current = false;
		}
	}, [defaultDate]);

	useEffect(() => {
		if (selectedDate === defaultDate) {
			hasAppliedRef.current = true;
			return;
		}

		const shouldApplyDefault = !selectedDate || selectedDate === todayString || selectedDate === initialSelectedDateRef.current;

		if (!shouldApplyDefault || hasAppliedRef.current) {
			return;
		}

		dispatch({ type: SET_SELECTED_DATE, payload: defaultDate });
		hasAppliedRef.current = true;
	}, [defaultDate, dispatch, selectedDate, todayString]);

	const applyDefaultDate = useCallback(() => {
		dispatch({ type: SET_SELECTED_DATE, payload: defaultDate });
	}, [defaultDate, dispatch]);

	return {
		defaultDate,
		isNextDay: defaultDate !== todayString,
		threshold,
		applyDefaultDate,
	};
};

export default useFoodOffersDefaultDate;
