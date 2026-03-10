import React, { createContext, useCallback, useContext, useState, ReactNode, useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import BaseBottomSheet from '@/components/BaseBottomSheet/BaseBottomSheet';
import {useTheme} from "@/hooks/useTheme";

type ModalOptions = {
        backgroundStyle?: any; // styling passed to the BottomSheet background
        headerBackgroundColor?: string;
        overlayStyle?: any; // styling for the fullscreen overlay behind the sheet (e.g. rgba dim)
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
};

const ModalContext = createContext<ModalContextType | null>(null);

// Duration to wait after calling sheet.close() before clearing React state, matching the
// sheet's close animation duration so the sheet has finished animating before unmounting.
const SHEET_CLOSE_ANIMATION_MS = 300;
// Extra buffer added on top of SHEET_CLOSE_ANIMATION_MS for the nested-modal fallback timeout,
// ensuring the guard is always reset after any in-flight animation even if timings vary slightly.
const ANIMATION_BUFFER_MS = 50;

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
        const [modalStack, setModalStack] = useState<ModalStackItem[]>([]);
        // Ref mirror of the stack for use inside callbacks (avoids stale closure issues)
        const modalStackRef = useRef<ModalStackItem[]>([]);

        const sheetRef = useRef<any>(null);
        const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
        // Prevents double-close re-entrancy (e.g. backdrop onPress + onChange(-1) both firing).
        // Reset deterministically via handleSheetChange when the sheet transitions back to expanded.
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
                // Clear any in-progress close guard so the new open is never blocked
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
                // Clear any in-progress close guard so the replacement open is never blocked
                isClosingRef.current = false;

                const newItem: ModalStackItem = {
                        content: c,
                        backgroundStyle: options?.backgroundStyle ?? null,
                        overlayStyle: options?.overlayStyle ?? { backgroundColor: 'rgba(0,0,0,0.5)' },
                        headerBackgroundColor:
                                options?.headerBackgroundColor ?? options?.backgroundStyle?.backgroundColor ?? undefined,
                };

                // Replace the entire stack with only this new item
                modalStackRef.current = [newItem];
                setModalStack([newItem]);

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
                // Guard: stack already empty or a close is already in progress
                if (modalStackRef.current.length === 0) return;
                if (isClosingRef.current) return;
                isClosingRef.current = true;

                if (modalStackRef.current.length === 1) {
                        // Last modal — close the sheet entirely
                        modalStackRef.current = [];
                        sheetRef.current?.close?.();
                        clearCloseTimeout();
                        closeTimeoutRef.current = setTimeout(() => {
                                setModalStack([]);
                                clearCloseTimeout();
                                // Stack is empty so length===0 guard handles future re-entrancy;
                                // still reset the flag so open() followed immediately by close() works.
                                isClosingRef.current = false;
                        }, SHEET_CLOSE_ANIMATION_MS);
                } else {
                        // More modals remain — pop the top item and restore the previous one
                        modalStackRef.current = modalStackRef.current.slice(0, -1);
                        setModalStack([...modalStackRef.current]);
                        // Re-expand the sheet in case a swipe-down gesture or backdrop press had already
                        // started a native close animation.  We do NOT reset isClosingRef here; instead we
                        // let handleSheetChange reset it once the sheet is confirmed back at index 0.
                        // This prevents a race where the native close animation completes (~300 ms) before
                        // the rAF expand fires (~16 ms), which would otherwise allow a second close() call
                        // to pop the parent modal.
                        if (typeof requestAnimationFrame !== 'undefined') {
                                requestAnimationFrame(() => {
                                        sheetRef.current?.expand?.();
                                });
                        } else {
                                setTimeout(() => {
                                        sheetRef.current?.expand?.();
                                }, 16);
                        }
                        // Fallback: if the sheet was already at index 0 when the inner modal was closed
                        // (e.g. close-button tap with no ongoing animation), handleSheetChange(0) will
                        // never fire because the sheet index does not change.  Reset the guard after the
                        // maximum animation window so that subsequent closes are not blocked indefinitely.
                        clearCloseTimeout();
                        closeTimeoutRef.current = setTimeout(() => {
                                isClosingRef.current = false;
                                clearCloseTimeout();
                        }, SHEET_CLOSE_ANIMATION_MS + ANIMATION_BUFFER_MS);
                }

                setDebug(prev => ({
                        ...prev,
                        lastAction: 'close',
                        contentSet: modalStackRef.current.length > 0,
                        sheetRefReady: Boolean(sheetRef.current),
                        closeInvocations: prev.closeInvocations + 1,
                }));
        };

        // Reset the re-entrancy guard as soon as the sheet reaches an expanded position.
        // This is the deterministic counterpart to the fallback timeout for the "pop + re-expand" path.
        // When the sheet natively closes to -1 while we still have stacked modals (e.g. backdrop press
        // with pressBehavior='close' completing its animation), re-expand it to show the previous modal.
        const handleSheetChange = useCallback((index: number) => {
                if (index >= 0) {
                        // Sheet is expanded — clear guard and any pending fallback timeout.
                        isClosingRef.current = false;
                        clearCloseTimeout();
                } else if (index === -1 && modalStackRef.current.length > 0) {
                        // Native close animation completed but we still have modals in the stack.
                        // Re-expand so the previous modal is visible again.
                        sheetRef.current?.expand?.();
                }
        }, []);

        // When content is set, ensure the sheet expands once the sheet ref is available
        // helper: keep trying to expand until ref is ready (use rAF for web-friendly timing)
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

        const prevStackLengthRef = useRef(0);
        useEffect(() => {
                const prev = prevStackLengthRef.current;
                const curr = modalStack.length;
                prevStackLengthRef.current = curr;

                if (curr > 0 && prev === 0) {
                        // Transitioning from empty to first modal — expand the sheet
                        const cancel = ensureExpand();
                        return () => cancel();
                }
        }, [modalStack.length]);

        const currentItem = modalStack[modalStack.length - 1] ?? null;
        const screenBackgroundColor = currentItem?.headerBackgroundColor || theme.screen.background;

        return (
                <ModalContext.Provider value={{ open, close, openAndDiscardOthers, closeAll, debug }}>
                        {children}
                        {currentItem && (
                                <View style={styles.modalContainer} pointerEvents="box-none">
                                       {/* Visual overlay (uses provided overlayStyle or falls back to semi-transparent dim) */}
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
                </ModalContext.Provider>
        );
};

export const useModalContext = () => {
        const ctx = useContext(ModalContext);
        if (!ctx) throw new Error('useModalContext must be used within a ModalProvider');
        return ctx;
};

const styles = StyleSheet.create({
        modalContainer: {
                ...StyleSheet.absoluteFillObject,
                zIndex: 999,
        },
});
