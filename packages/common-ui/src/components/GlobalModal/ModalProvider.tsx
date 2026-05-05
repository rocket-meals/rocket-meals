import React, { createContext, useCallback, useContext, useState, ReactNode, useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import BaseBottomSheet from '../BaseBottomSheet';
import { useTheme } from '../../context/ThemeContext';

type ModalOptions = {
	backgroundStyle?: any;
	headerBackgroundColor?: string;
	overlayStyle?: any;
};

type ModalStackItem = {
	content: ReactNode;
	backgroundStyle: any;
	overlayStyle: any;
	headerBackgroundColor: string | undefined;
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
};

const ModalContext = createContext<ModalContextType | null>(null);

const SHEET_CLOSE_ANIMATION_MS = 300;
const CLOSE_GUARD_RESET_DELAY_MS = 150;

export const ModalContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const [modalStack, setModalStack] = useState<ModalStackItem[]>([]);
	const modalStackRef = useRef<ModalStackItem[]>([]);

	const sheetRef = useRef<any>(null);
	const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const isClosingRef = useRef(false);

	const { theme } = useTheme();

	const [debug, setDebug] = useState<ModalContextType['debug']>({
		lastAction: null,
		contentSet: false,
		backgroundStyleProvided: false,
		sheetRefReady: false,
		openInvocations: 0,
		closeInvocations: 0,
	});

	const clearCloseTimeout = () => {
		if (closeTimeoutRef.current) {
			clearTimeout(closeTimeoutRef.current);
			closeTimeoutRef.current = null;
		}
	};

	const open = (c: ReactNode, options?: ModalOptions) => {
		clearCloseTimeout();
		isClosingRef.current = false;

		const newItem: ModalStackItem = {
			content: c,
			backgroundStyle: options?.backgroundStyle ?? null,
			overlayStyle: options?.overlayStyle ?? { backgroundColor: 'rgba(0,0,0,0.5)' },
			headerBackgroundColor:
				options?.headerBackgroundColor ?? options?.backgroundStyle?.backgroundColor ?? undefined,
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
	};

	const openAndDiscardOthers = (c: ReactNode, options?: ModalOptions) => {
		clearCloseTimeout();
		isClosingRef.current = false;

		const newItem: ModalStackItem = {
			content: c,
			backgroundStyle: options?.backgroundStyle ?? null,
			overlayStyle: options?.overlayStyle ?? { backgroundColor: 'rgba(0,0,0,0.5)' },
			headerBackgroundColor:
				options?.headerBackgroundColor ?? options?.backgroundStyle?.backgroundColor ?? undefined,
		};

		modalStackRef.current = [newItem];
		setModalStack([newItem]);
		setOpenCount(c => c + 1);

		setDebug(prev => ({
			...prev,
			lastAction: 'open',
			contentSet: true,
			backgroundStyleProvided: Boolean(options?.backgroundStyle),
			sheetRefReady: Boolean(sheetRef.current),
			openInvocations: prev.openInvocations + 1,
		}));
	};

	const closeAll = () => {
		if (modalStackRef.current.length === 0) return;
		if (isClosingRef.current) return;
		isClosingRef.current = true;

		modalStackRef.current = [];
		sheetRef.current?.close?.();
		clearCloseTimeout();
		closeTimeoutRef.current = setTimeout(() => {
			setModalStack([]);
			clearCloseTimeout();
			isClosingRef.current = false;
		}, SHEET_CLOSE_ANIMATION_MS);

		setDebug(prev => ({
			...prev,
			lastAction: 'close',
			contentSet: false,
			sheetRefReady: Boolean(sheetRef.current),
			closeInvocations: prev.closeInvocations + 1,
		}));
	};

	const close = () => {
		if (modalStackRef.current.length === 0) return;
		if (isClosingRef.current) return;
		isClosingRef.current = true;

		if (modalStackRef.current.length === 1) {
			modalStackRef.current = [];
			sheetRef.current?.close?.();
			clearCloseTimeout();
			closeTimeoutRef.current = setTimeout(() => {
				setModalStack([]);
				clearCloseTimeout();
				isClosingRef.current = false;
			}, SHEET_CLOSE_ANIMATION_MS);
		} else {
			modalStackRef.current = modalStackRef.current.slice(0, -1);
			setModalStack([...modalStackRef.current]);
			clearCloseTimeout();
			closeTimeoutRef.current = setTimeout(() => {
				isClosingRef.current = false;
				clearCloseTimeout();
			}, SHEET_CLOSE_ANIMATION_MS);
		}

		setDebug(prev => ({
			...prev,
			lastAction: 'close',
			contentSet: modalStackRef.current.length > 0,
			sheetRefReady: Boolean(sheetRef.current),
			closeInvocations: prev.closeInvocations + 1,
		}));
	};

	const handleSheetChange = useCallback((index: number) => {
		if (index >= 0) {
			clearCloseTimeout();
			if (isClosingRef.current) {
				closeTimeoutRef.current = setTimeout(() => {
					isClosingRef.current = false;
					clearCloseTimeout();
				}, CLOSE_GUARD_RESET_DELAY_MS);
			}
		} else if (index === -1 && modalStackRef.current.length > 0) {
			sheetRef.current?.expand?.();
		}
	}, []);

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

	return (
		<ModalContext.Provider value={{
			open, close, openAndDiscardOthers, closeAll, debug,
			_currentItem: currentItem,
			_sheetRef: sheetRef,
			_handleSheetChange: handleSheetChange,
			_screenBackgroundColor: screenBackgroundColor,
		}}>
			{children}
		</ModalContext.Provider>
	);
};

export const ModalRenderer: React.FC<{ children: ReactNode }> = ({ children }) => {
	const { _currentItem: currentItem, _sheetRef: sheetRef, _handleSheetChange: handleSheetChange, _screenBackgroundColor: screenBackgroundColor, close } = useModalContext();

	return (
		<>
			{children}
			{currentItem && (
				<View style={styles.modalContainer} pointerEvents="box-none">
					<View
						style={[StyleSheet.absoluteFillObject, currentItem.overlayStyle ?? { backgroundColor: 'rgba(0,0,0,0.5)' }]}
						pointerEvents="none"
					/>
					<BaseBottomSheet
						ref={sheetRef}
						enablePanDownToClose
						onClose={close}
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
		...StyleSheet.absoluteFillObject,
		zIndex: 999,
	},
});
