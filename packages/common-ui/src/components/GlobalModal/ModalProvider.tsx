import React, { createContext, useCallback, useContext, useMemo, useState, ReactNode, useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import BaseBottomSheet from '../BaseBottomSheet';
import { useTheme } from '../../context/ThemeContext';

/**
 * Why an item left the modal stack:
 * - 'closed': it was actually closed - header button, backdrop tap, swipe-down,
 *   close() or closeAll() - and, for the last stack item, the sheet's close animation
 *   has FINISHED (confirmed via the sheet's own onChange(-1) signal, never guessed
 *   via a timer).
 * - 'discarded': it was replaced or superseded without being properly closed, e.g. by
 *   openAndDiscardOthers() or by a new open() interrupting an in-flight close.
 */
export type ModalCloseReason = 'closed' | 'discarded';

export type ModalOptions = {
	backgroundStyle?: any;
	headerBackgroundColor?: string;
	overlayStyle?: any;
	/**
	 * Called exactly once when this modal has left the stack. For the last stack item a
	 * 'closed' notification only fires after the sheet's close animation is confirmed
	 * finished, so it is always safe to open the next modal from inside this callback -
	 * it can never be torn down by a stale close animation still in flight.
	 */
	onClosed?: (reason: ModalCloseReason) => void;
};

type ModalStackItem = ModalOptions & {
	content: ReactNode;
};

type ModalContextType = {
	open: (content: ReactNode, options?: ModalOptions) => void;
	close: () => void;
	openAndDiscardOthers: (content: ReactNode, options?: ModalOptions) => void;
	closeAll: () => void;
	debug: {
		lastAction: 'open' | 'close' | null;
		contentSet: boolean;
		backgroundStyleProvided: boolean;
		sheetRefReady: boolean;
		openInvocations: number;
		closeInvocations: number;
	};
	/** @internal used by ModalRenderer */
	_currentItem: ModalStackItem | null;
	/** @internal used by ModalRenderer */
	_sheetRef: React.MutableRefObject<any>;
	/** @internal used by ModalRenderer */
	_handleSheetChange: (index: number) => void;
	/** @internal used by ModalRenderer */
	_screenBackgroundColor: string;
	/** @internal used by ModalRenderer - how many modals are stacked, to decide whether the header button shows a back-chevron (stack) or an X (single modal) */
	_stackDepth: number;
	/** @internal used by ModalRenderer - true while the sheet's close animation is in flight, so the static overlay can hide immediately instead of lingering until the close is confirmed */
	_isSheetClosing: boolean;
};

const ModalContext = createContext<ModalContextType | null>(null);

// Pure safety net: close()/closeAll() are finalized when the sheet's onChange(-1)
// confirmation arrives (see handleSheetChange), and synchronously when no sheet ref is
// mounted at all - so in practice this timer never fires. It only exists so that a
// missing or buggy onChange can never leave the app stuck mid-close. It is NOT part of
// the regular close flow and nothing is allowed to rely on its timing.
const CLOSE_CONFIRMATION_FALLBACK_MS = 1500;

export const ModalContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const [modalStack, setModalStack] = useState<ModalStackItem[]>([]);
	const modalStackRef = useRef<ModalStackItem[]>([]);
	// React-state twin of isClosingRef, only for rendering: while true, ModalRenderer
	// hides its static overlay right away so the screen behind brightens the moment a
	// close starts - the sheet's own animated backdrop handles the smooth fade-out.
	// Waiting for the confirmed finalize here (which can only happen once the close
	// animation has fully settled) made closing feel slow, since the overlay stayed at
	// full opacity the entire time even though the sheet was already sliding away.
	const [isSheetClosing, setIsSheetClosing] = useState(false);

	const sheetRef = useRef<any>(null);
	const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	// True from the moment the sheet is asked to close - via close()/closeAll(), or via
	// BaseBottomSheet's onDismissAll/onClose reacting to a user gesture - until the sheet's
	// onChange confirms index -1 was actually reached. Finalizing (clearing modalStack and
	// notifying onClosed) only ever happens in reaction to that real confirmation - never
	// on a guessed timeout - so a next modal can never be opened while the previous one's
	// close animation is still in flight, and there's nothing stale left to race it.
	const isClosingRef = useRef(false);
	// Items that close()/closeAll() already removed from the stack but whose onClosed
	// notification must wait until the close is actually confirmed (or superseded).
	const pendingClosedRef = useRef<ModalStackItem[]>([]);

	const { theme } = useTheme();

	const [debug, setDebug] = useState<ModalContextType['debug']>({
		lastAction: null,
		contentSet: false,
		backgroundStyleProvided: false,
		sheetRefReady: false,
		openInvocations: 0,
		closeInvocations: 0,
	});

	const clearCloseTimeout = useCallback(() => {
		if (closeTimeoutRef.current) {
			clearTimeout(closeTimeoutRef.current);
			closeTimeoutRef.current = null;
		}
	}, []);

	const notifyClosed = useCallback((items: ModalStackItem[], reason: ModalCloseReason) => {
		for (const item of items) {
			try {
				item.onClosed?.(reason);
			} catch (e) {
				// A consumer's onClosed callback must never break the modal stack itself.
			}
		}
	}, []);

	const takePendingClosed = useCallback((): ModalStackItem[] => {
		const items = pendingClosedRef.current;
		pendingClosedRef.current = [];
		return items;
	}, []);

	// The single place a confirmed close is finalized: unmount the sheet's content and
	// only THEN notify the closed items, so an onClosed callback that opens the next
	// modal (e.g. the popup-event queue) always starts from a settled, empty sheet.
	const finalizeConfirmedClose = useCallback(() => {
		isClosingRef.current = false;
		setIsSheetClosing(false);
		clearCloseTimeout();
		setModalStack([]);
		notifyClosed(takePendingClosed(), 'closed');
	}, [clearCloseTimeout, notifyClosed, takePendingClosed]);

	const open = useCallback((c: ReactNode, options?: ModalOptions) => {
		const supersededClose = isClosingRef.current;
		clearCloseTimeout();
		isClosingRef.current = false;
		setIsSheetClosing(false);
		if (supersededClose) {
			// A new modal interrupts an in-flight close: the closing items are already off
			// the stack but their close was never confirmed - notify them as discarded so
			// no onClosed is silently swallowed.
			notifyClosed(takePendingClosed(), 'discarded');
		}

		const newItem: ModalStackItem = {
			content: c,
			backgroundStyle: options?.backgroundStyle ?? null,
			overlayStyle: options?.overlayStyle ?? { backgroundColor: 'rgba(0,0,0,0.5)' },
			headerBackgroundColor:
				options?.headerBackgroundColor ?? options?.backgroundStyle?.backgroundColor ?? undefined,
			onClosed: options?.onClosed,
		};

		modalStackRef.current = [...modalStackRef.current, newItem];
		setModalStack([...modalStackRef.current]);
		setOpenCount(c => c + 1);

		setDebug(prev => ({
			...prev,
			lastAction: 'open',
			contentSet: true,
			backgroundStyleProvided: Boolean(options?.backgroundStyle),
			sheetRefReady: Boolean(sheetRef.current),
			openInvocations: prev.openInvocations + 1,
		}));
	}, [clearCloseTimeout, notifyClosed, takePendingClosed]);

	const openAndDiscardOthers = useCallback((c: ReactNode, options?: ModalOptions) => {
		clearCloseTimeout();
		isClosingRef.current = false;
		setIsSheetClosing(false);
		// Everything still pending from an in-flight close plus everything currently on
		// the stack is being replaced without a proper close.
		const discarded = [...takePendingClosed(), ...modalStackRef.current];

		const newItem: ModalStackItem = {
			content: c,
			backgroundStyle: options?.backgroundStyle ?? null,
			overlayStyle: options?.overlayStyle ?? { backgroundColor: 'rgba(0,0,0,0.5)' },
			headerBackgroundColor:
				options?.headerBackgroundColor ?? options?.backgroundStyle?.backgroundColor ?? undefined,
			onClosed: options?.onClosed,
		};

		modalStackRef.current = [newItem];
		setModalStack([newItem]);
		setOpenCount(c => c + 1);
		notifyClosed(discarded, 'discarded');

		setDebug(prev => ({
			...prev,
			lastAction: 'open',
			contentSet: true,
			backgroundStyleProvided: Boolean(options?.backgroundStyle),
			sheetRefReady: Boolean(sheetRef.current),
			openInvocations: prev.openInvocations + 1,
		}));
	}, [clearCloseTimeout, notifyClosed, takePendingClosed]);

	const closeAll = useCallback(() => {
		if (modalStackRef.current.length === 0) return;
		if (isClosingRef.current) return;

		const closingItems = modalStackRef.current;
		modalStackRef.current = [];

		if (!sheetRef.current?.close) {
			// No sheet mounted - there is no close animation to wait for, so finalize
			// synchronously instead of waiting for a confirmation that can never come.
			clearCloseTimeout();
			setModalStack([]);
			notifyClosed(closingItems, 'closed');
		} else {
			// Ask the sheet to close, but don't touch modalStack (React state) yet -
			// handleSheetChange finalizes it once the sheet's onChange confirms index -1
			// was actually reached, whether that's from this call or a user gesture.
			isClosingRef.current = true;
			setIsSheetClosing(true);
			pendingClosedRef.current = closingItems;
			sheetRef.current.close();
			clearCloseTimeout();
			closeTimeoutRef.current = setTimeout(finalizeConfirmedClose, CLOSE_CONFIRMATION_FALLBACK_MS);
		}

		setDebug(prev => ({
			...prev,
			lastAction: 'close',
			contentSet: false,
			sheetRefReady: Boolean(sheetRef.current),
			closeInvocations: prev.closeInvocations + 1,
		}));
	}, [clearCloseTimeout, notifyClosed, finalizeConfirmedClose]);

	const close = useCallback(() => {
		if (modalStackRef.current.length === 0) return;
		if (isClosingRef.current) return;

		if (modalStackRef.current.length === 1) {
			const closingItems = modalStackRef.current;
			modalStackRef.current = [];

			if (!sheetRef.current?.close) {
				// No sheet mounted - nothing to animate, finalize synchronously.
				clearCloseTimeout();
				setModalStack([]);
				notifyClosed(closingItems, 'closed');
			} else {
				// Ask the sheet to close, but don't touch modalStack (React state) yet -
				// handleSheetChange finalizes it once the sheet's onChange confirms index -1
				// was actually reached, whether that's from this call or a user gesture.
				isClosingRef.current = true;
				setIsSheetClosing(true);
				pendingClosedRef.current = closingItems;
				sheetRef.current.close();
				clearCloseTimeout();
				closeTimeoutRef.current = setTimeout(finalizeConfirmedClose, CLOSE_CONFIRMATION_FALLBACK_MS);
			}
		} else {
			// Popping back to the previous stack item is a pure state swap - the sheet
			// stays open the whole time, there is no native animation to wait for and
			// therefore no timer: fully synchronous and deterministic.
			const poppedItem = modalStackRef.current[modalStackRef.current.length - 1];
			modalStackRef.current = modalStackRef.current.slice(0, -1);
			setModalStack([...modalStackRef.current]);
			clearCloseTimeout();
			notifyClosed([poppedItem], 'closed');
		}

		setDebug(prev => ({
			...prev,
			lastAction: 'close',
			contentSet: modalStackRef.current.length > 0,
			sheetRefReady: Boolean(sheetRef.current),
			closeInvocations: prev.closeInvocations + 1,
		}));
	}, [clearCloseTimeout, notifyClosed, finalizeConfirmedClose]);

	// Desired dismiss behaviour (see BaseBottomSheetProps for the matching prop docs): a
	// backdrop tap or a swipe-down-to-close gesture is a "get me out of here" gesture from
	// the user, independent of how many modals are stacked - both dismiss the ENTIRE stack
	// via onDismissAll/closeAll, called directly by BaseBottomSheet before this onChange
	// handler runs for index === -1. Only the header close/back button steps back one level
	// via onClose/close(). Either way, by the time this sees index === -1 for a real close
	// (as opposed to some other caller's stray/aborted transition), isClosingRef is already
	// true - that's the actual confirmation the close animation finished, so only now is it
	// safe to finalize (unmount the sheet's content) rather than guessing at its timing.
	const handleSheetChange = useCallback((index: number) => {
		if (index >= 0) {
			if (isClosingRef.current) {
				// The sheet snapped back open instead of finishing its close - the close was
				// cancelled (e.g. the user grabbed the sheet and dragged it back up). Restore
				// the pending items so the stack and the visible sheet agree again; otherwise
				// the header close button would be dead afterwards.
				isClosingRef.current = false;
				setIsSheetClosing(false);
				clearCloseTimeout();
				if (modalStackRef.current.length === 0) {
					modalStackRef.current = pendingClosedRef.current;
					pendingClosedRef.current = [];
				} else {
					// Defensive: something already repopulated the stack - the old pending
					// items were superseded rather than restored.
					notifyClosed(takePendingClosed(), 'discarded');
				}
			}
			return;
		}

		if (index === -1) {
			if (isClosingRef.current) {
				// Real confirmation that the close animation actually finished - only now
				// is it safe to finalize (unmount the sheet's content and notify onClosed).
				finalizeConfirmedClose();
			} else if (modalStackRef.current.length > 0) {
				// Closed without us asking for it while something should still be shown -
				// snap back open.
				sheetRef.current?.expand?.();
			}
		}
	}, [clearCloseTimeout, notifyClosed, takePendingClosed, finalizeConfirmedClose]);

	const ensureExpand = () => {
		let tries = 0;
		let cancelled = false;
		const attempt = () => {
			if (cancelled) return;
			try {
				if (sheetRef.current?.expand) {
					sheetRef.current.expand();
					setDebug((prev) => ({
						...prev,
						sheetRefReady: Boolean(sheetRef.current),
					}));
					return;
				}
			} catch (e) {
				// ignore occasional errors from exotic refs
			}
			tries += 1;
			if (tries < 60) {
				if (typeof requestAnimationFrame !== 'undefined') {
					requestAnimationFrame(attempt);
				} else {
					setTimeout(attempt, 16);
				}
			}
		};
		attempt();
		return () => {
			cancelled = true;
		};
	};

	const [openCount, setOpenCount] = useState(0);

	useEffect(() => {
		if (openCount > 0 && modalStack.length > 0) {
			const cancel = ensureExpand();
			return () => cancel();
		}
	}, [openCount]);

	const currentItem = modalStack[modalStack.length - 1] ?? null;
	const screenBackgroundColor = currentItem?.headerBackgroundColor || theme.screen.background;

	const contextValue = useMemo<ModalContextType>(() => ({
		open, close, openAndDiscardOthers, closeAll, debug,
		_currentItem: currentItem,
		_sheetRef: sheetRef,
		_handleSheetChange: handleSheetChange,
		_screenBackgroundColor: screenBackgroundColor,
		_stackDepth: modalStack.length,
		_isSheetClosing: isSheetClosing,
	}), [
		open, close, openAndDiscardOthers, closeAll, debug,
		currentItem, handleSheetChange, screenBackgroundColor,
		modalStack.length, isSheetClosing,
	]);

	return (
		<ModalContext.Provider value={contextValue}>
			{children}
		</ModalContext.Provider>
	);
};

export const ModalRenderer: React.FC<{ children: ReactNode }> = ({ children }) => {
	const {
		_currentItem: currentItem,
		_sheetRef: sheetRef,
		_handleSheetChange: handleSheetChange,
		_screenBackgroundColor: screenBackgroundColor,
		_stackDepth: stackDepth,
		_isSheetClosing: isSheetClosing,
		close,
		closeAll,
	} = useModalContext();

	return (
		<>
			{children}
			{currentItem && (
				<View style={styles.modalContainer} pointerEvents="box-none">
					{/* Static overlay behind the sheet. Hidden the moment a close starts
					    (not when it's confirmed finished): the sheet keeps its own animated
					    backdrop that fades out in sync with the close animation, so keeping
					    this one up until the confirmed finalize just made closing look slow. */}
					{!isSheetClosing && (
						<View
							style={[StyleSheet.absoluteFill, currentItem.overlayStyle ?? { backgroundColor: 'rgba(0,0,0,0.5)' }]}
							pointerEvents="none"
						/>
					)}
					<BaseBottomSheet
						ref={sheetRef}
						enablePanDownToClose
						onClose={close}
						onDismissAll={closeAll}
						showBackChevron={stackDepth > 1}
						onChange={handleSheetChange}
						headerBackgroundColor={screenBackgroundColor}
						backgroundStyle={currentItem.backgroundStyle}
					>
						{currentItem.content}
					</BaseBottomSheet>
				</View>
			)}
		</>
	);
};

/** Convenience wrapper that combines ModalContextProvider + ModalRenderer. */
export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => (
	<ModalContextProvider>
		<ModalRenderer>{children}</ModalRenderer>
	</ModalContextProvider>
);

export const useModalContext = () => {
	const ctx = useContext(ModalContext);
	if (!ctx) throw new Error('useModalContext must be used within a ModalContextProvider');
	return ctx;
};

const styles = StyleSheet.create({
	modalContainer: {
		...StyleSheet.absoluteFill,
		zIndex: 999,
	},
});
