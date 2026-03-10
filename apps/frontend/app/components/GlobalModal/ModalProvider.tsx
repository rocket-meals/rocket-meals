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
                        // Re-expand the sheet in case a swipe-down gesture had already started closing it.
                        // Keep isClosingRef=true until handleSheetChange resets it when the sheet reaches
                        // index >= 0. This blocks spurious onChange(-1) events that @gorhom/bottom-sheet
                        // fires on native during the expand animation from index -1, which would otherwise
                        // trigger another close() and dismiss the parent modal immediately.
                        // Safety fallback: if the sheet was already at index 0 (e.g. backdrop-click
                        // dismissal), handleSheetChange won't fire, so reset the guard via a timeout.
                        clearCloseTimeout();
                        closeTimeoutRef.current = setTimeout(() => {
                                isClosingRef.current = false;
                                clearCloseTimeout();
                        }, SHEET_CLOSE_ANIMATION_MS);
                        if (typeof requestAnimationFrame !== 'undefined') {
                                requestAnimationFrame(() => {
                                        sheetRef.current?.expand?.();
                                });
                        } else {
                                setTimeout(() => {
                                        sheetRef.current?.expand?.();
                                }, 16);
                        }
                }

                setDebug(prev => ({
                        ...prev,
                        lastAction: 'close',
                        contentSet: modalStackRef.current.length > 0,
                        sheetRefReady: Boolean(sheetRef.current),
                        closeInvocations: prev.closeInvocations + 1,
                }));
        };

        // Reset the re-entrancy guard when the sheet reaches an expanded position.
        // This is the deterministic counterpart to isClosingRef for the "pop + re-expand" path.
        // Also clears the safety timeout that was set as a fallback in case this handler
        // never fires (e.g. sheet was already at 0 on a backdrop-click dismissal).
        //
        // On native, @gorhom/bottom-sheet can fire onChange(-1) AFTER onChange(0) during an
        // expand animation (i.e. the sequence can be: -1 → 0 → -1). If we reset isClosingRef
        // immediately on onChange(0), that trailing -1 would slip past the guard and close the
        // outer modal. To fix this we keep isClosingRef=true for an extra 150 ms after reaching
        // index >= 0 whenever a close was in progress, so any trailing spurious -1 events are
        // still absorbed before we allow the next close.
        const handleSheetChange = useCallback((index: number) => {
                if (index >= 0) {
                        if (isClosingRef.current) {
                                // We are in a "pop and expand" operation — delay the reset so that
                                // any trailing onChange(-1) events from the animation are blocked.
                                if (closeTimeoutRef.current) {
                                        clearTimeout(closeTimeoutRef.current);
                                        closeTimeoutRef.current = null;
                                }
                                closeTimeoutRef.current = setTimeout(() => {
                                        isClosingRef.current = false;
                                        closeTimeoutRef.current = null;
                                }, 150);
                        } else {
                                // No active close — just clear any pending safety timeout.
                                if (closeTimeoutRef.current) {
                                        clearTimeout(closeTimeoutRef.current);
                                        closeTimeoutRef.current = null;
                                }
                        }
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
                                                 backdropPressBehavior="none"
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
