import { useCallback, useEffect, useState } from 'react';
import { getValue, setValue } from '@/constants/AsyncStorageHelper';

const ASYNC_STORAGE_KEY_RATING_DEBUG_LOGS = 'ratingDebugLogs';
const MAX_LOG_ENTRIES = 50;

export type RatingDebugLogEntry = {
	message: string;
	timestamp: string;
};

const useRatingDebugLog = () => {
	const [logs, setLogs] = useState<RatingDebugLogEntry[]>([]);

	useEffect(() => {
		getValue(ASYNC_STORAGE_KEY_RATING_DEBUG_LOGS)
			.then((stored) => {
				if (Array.isArray(stored)) {
					setLogs(stored);
				}
			})
			.catch(() => {});
	}, []);

	const appendLog = useCallback(async (message: string) => {
		const entry: RatingDebugLogEntry = {
			message,
			timestamp: new Date().toISOString(),
		};
		setLogs((prev) => {
			const updated = [...prev, entry].slice(-MAX_LOG_ENTRIES);
			setValue(ASYNC_STORAGE_KEY_RATING_DEBUG_LOGS, updated);
			return updated;
		});
	}, []);

	const clearLogs = useCallback(async () => {
		setLogs([]);
		await setValue(ASYNC_STORAGE_KEY_RATING_DEBUG_LOGS, []);
	}, []);

	return { logs, appendLog, clearLogs };
};

export default useRatingDebugLog;
