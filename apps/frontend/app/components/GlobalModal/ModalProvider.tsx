import React, { createContext, useCallback, useContext, useState, ReactNode, useRef, useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
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

// On native, @gorhom/bottom-sheet can fire onChange(-1) AFTER onChange(0) during an expand
// animation (sequence: -1 → 0 → -1). When re-expanding after a nested-modal pop (pop-and-expand
// path), we must keep isClosingRef=true until this spurious trailing event has had time to arrive
// and be blocked.  150 ms is long enough for the spurious event but short enough to be imperceptible.
const CLOSE_GUARD_RESET_DELAY_MS = 150;

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
                        // More modals remain — pop the top item and restore the previous one.
                        modalStackRef.current = modalStackRef.current.slice(0, -1);
                        setModalStack([...modalStackRef.current]);
                        // Do NOT call expand() here. If the sheet was dismissed via a swipe-down
                        // gesture, it will naturally reach index -1 and handleSheetChange will
                        // re-expand it. If the close button or backdrop was pressed, the sheet is
                        // already at index 0 and the new content is shown via the React state
                        // update above — calling expand() on an already-open sheet on native
                        // triggers spurious onChange(0)→onChange(-1) events that can fire after
                        // isClosingRef is reset and accidentally close the remaining modal.
                        // Safety timeout: reset the guard in case no onChange fires (e.g. close-
                        // button / backdrop path where the sheet stays at index 0).
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

        // Reset the re-entrancy guard as soon as the sheet reaches an expanded position.
        // Also clears the safety timeout that was set as a fallback in case this handler
        // never fires (e.g. sheet was already at 0 on a close-button or backdrop dismissal).
        // When the sheet reaches -1 but items remain in the stack (swipe-down while a
        // nested modal was visible), re-expand to show the remaining item.
        const handleSheetChange = useCallback((index: number) => {
                if (index >= 0) {
                        // Sheet has reached an expanded position — reset the close guard.
                        // Clear any existing timeout (safety timeout or previous delay).
                        clearCloseTimeout();
                        if (isClosingRef.current) {
                                // Pop-and-expand path (swipe-down on a nested modal):
                                // On native, @gorhom/bottom-sheet can fire a spurious onChange(-1)
                                // AFTER onChange(0) during the expand animation.  Keep the guard
                                // active for CLOSE_GUARD_RESET_DELAY_MS so that spurious event
                                // is blocked and cannot pop an additional modal.
                                closeTimeoutRef.current = setTimeout(() => {
                                        isClosingRef.current = false;
                                        clearCloseTimeout();
                                }, CLOSE_GUARD_RESET_DELAY_MS);
                        }
                } else if (index === -1 && modalStackRef.current.length > 0) {
                        // Sheet was physically closed via swipe-down but more modals remain —
                        // re-expand to show the previous one.
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
                                       {/*
                                         * On web: rendered as a Pressable so backdrop taps close the modal.
                                         * The CustomBackdrop inside BaseBottomSheet is disabled on web
                                         * (see BaseBottomSheet.tsx) because its Animated.View uses
                                         * pointerEvents="box-none" which is not a valid CSS value — the
                                         * browser defaults it to "auto", making the full-screen element
                                         * intercept all click events.
                                         * On native: rendered as a non-interactive View; the CustomBackdrop
                                         * Pressable handles tap-to-close with its Reanimated fade animation.
                                         */}
                                       {Platform.OS === 'web' ? (
                                               <Pressable
                                                       style={[StyleSheet.absoluteFillObject, currentItem.overlayStyle ?? { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                                                       onPress={close}
                                               />
                                       ) : (
                                               <View
                                                       style={[StyleSheet.absoluteFillObject, currentItem.overlayStyle ?? { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                                                       pointerEvents="none"
                                               />
                                       )}
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
