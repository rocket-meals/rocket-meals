import { useSyncExternalStore } from 'react';

// Holds the popup events back until the "new version in the store" notice had
// its turn: the store check finished (or gave up), and the notice, if shown,
// was closed. Lives in memory on purpose, not in the persisted redux store, so
// every app start begins with the gate closed again.
let done = false;
const listeners = new Set<() => void>();

export const AppOutdatedNoticeGate = {
	isDone: (): boolean => done,
	markDone: (): void => {
		if (done) return;
		done = true;
		listeners.forEach(listener => listener());
	},
	subscribe: (listener: () => void): (() => void) => {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	},
	resetForTests: (): void => {
		done = false;
	},
};

export const useAppOutdatedNoticeDone = (): boolean => useSyncExternalStore(AppOutdatedNoticeGate.subscribe, AppOutdatedNoticeGate.isDone, AppOutdatedNoticeGate.isDone);
