import { useCallback, useEffect, useState } from 'react';
import { getValue, setValue } from '@/constants/AsyncStorageHelper';

const ASYNC_STORAGE_KEY_RATING_DEBUG_LOGS = 'ratingDebugLogs';
const MAX_LOG_ENTRIES = 50;

export type RatingDebugLogEntry = {
	message: string;
	timestamp: string;
};

const logsRef: { current: RatingDebugLogEntry[] } = { current: [] };

const useRatingDebugLog = () => {
	const [logs, setLogs] = useState<RatingDebugLogEntry[]>(logsRef.current);

	useEffect(() => {
		getValue(ASYNC_STORAGE_KEY_RATING_DEBUG_LOGS)
			.then((stored) => {
				if (Array.isArray(stored)) {
					logsRef.current = stored;
					setLogs(stored);
				}
			})
			.catch(() => {});
	}, []);

	const appendLog = useCallback((message: string) => {
		const entry: RatingDebugLogEntry = {
			message,
			timestamp: new Date().toISOString(),
		};
		const updated = [...logsRef.current, entry].slice(-MAX_LOG_ENTRIES);
		logsRef.current = updated;
		setLogs(updated);
		setValue(ASYNC_STORAGE_KEY_RATING_DEBUG_LOGS, updated).catch(() => {});
	}, []);

	const clearLogs = useCallback(async () => {
		logsRef.current = [];
		setLogs([]);
		await setValue(ASYNC_STORAGE_KEY_RATING_DEBUG_LOGS, []);
	}, []);

	return { logs, appendLog, clearLogs };
};

export default useRatingDebugLog;
