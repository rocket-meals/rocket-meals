import { useEffect, useState } from 'react';

/**
 * The current time, refreshed every `intervalMs` (default one minute). For checks like a news' end date
 * that must also run while the app stays open, without waiting for new data from the server.
 */
const useNow = (intervalMs: number = 60_000): Date => {
	const [now, setNow] = useState(() => new Date());

	useEffect(() => {
		const interval = setInterval(() => setNow(new Date()), intervalMs);
		return () => clearInterval(interval);
	}, [intervalMs]);

	return now;
};

export default useNow;
