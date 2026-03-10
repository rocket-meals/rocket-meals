import React, { createContext, useCallback, useContext, useState, ReactNode, useRef, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
                stackDepth: number;
                sheetRefReady: boolean;
                openInvocations: number;
                closeInvocations: number;
        };
};

const ModalContext = createContext<ModalContextType | null>(null);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
        const [modalStack, setModalStack] = useState<ModalStackItem[]>([]);
        // Ref mirror of the stack for use inside callbacks (avoids stale closure issues)
        const modalStackRef = useRef<ModalStackItem[]>([]);

        const sheetRef = useRef<any>(null);

        const { theme } = useTheme();

        const [debug, setDebug] = useState<ModalContextType['debug']>({
                lastAction: null,
                stackDepth: 0,
                sheetRefReady: false,
                openInvocations: 0,
                closeInvocations: 0,
        });

        const open = (c: ReactNode, options?: ModalOptions) => {
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
                        stackDepth: modalStackRef.current.length,
                        sheetRefReady: Boolean(sheetRef.current),
                        openInvocations: prev.openInvocations + 1,
                }));
        };

        const openAndDiscardOthers = (c: ReactNode, options?: ModalOptions) => {
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
                        stackDepth: 1,
                        sheetRefReady: Boolean(sheetRef.current),
                        openInvocations: prev.openInvocations + 1,
                }));
        };

        // Pop the top item from the stack.
        // The sheet is only physically closed when the stack becomes empty,
        // which is handled by the useEffect below. No re-expand or timing hacks needed.
        const close = () => {
                if (modalStackRef.current.length === 0) return;

                const newStack = modalStackRef.current.slice(0, -1);
                modalStackRef.current = newStack;
                setModalStack([...newStack]);

                setDebug(prev => ({
                        ...prev,
                        lastAction: 'close',
                        stackDepth: newStack.length,
                        sheetRefReady: Boolean(sheetRef.current),
                        closeInvocations: prev.closeInvocations + 1,
                }));
        };

        const closeAll = () => {
                if (modalStackRef.current.length === 0) return;

                modalStackRef.current = [];
                setModalStack([]);

                setDebug(prev => ({
                        ...prev,
                        lastAction: 'close',
                        stackDepth: 0,
                        sheetRefReady: Boolean(sheetRef.current),
                        closeInvocations: prev.closeInvocations + 1,
                }));
        };

        // Keep trying to expand until the ref is available (requestAnimationFrame for web-friendly timing)
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

        // Manage the physical sheet state based on stack changes:
        // - stack empty → non-empty: expand (open) the sheet
        // - stack non-empty → empty: close the sheet
        // - stack changes within non-empty range: just re-render with new content
        const prevStackLengthRef = useRef(0);
        useEffect(() => {
                const prev = prevStackLengthRef.current;
                const curr = modalStack.length;
                prevStackLengthRef.current = curr;

                if (curr > 0 && prev === 0) {
                        const cancel = ensureExpand();
                        return () => cancel();
                } else if (curr === 0 && prev > 0) {
                        sheetRef.current?.close?.();
                }
        }, [modalStack.length]);

        // Safety net: if the sheet is physically closed while items remain in the stack
        // (e.g. some unexpected library behaviour), clear the stack to stay consistent.
        const handleSheetChange = useCallback((index: number) => {
                if (index === -1 && modalStackRef.current.length > 0) {
                        modalStackRef.current = [];
                        setModalStack([]);
                        setDebug(prev => ({
                                ...prev,
                                lastAction: 'close',
                                stackDepth: 0,
                                closeInvocations: prev.closeInvocations + 1,
                        }));
                }
        }, []);

        const currentItem = modalStack[modalStack.length - 1] ?? null;
        const screenBackgroundColor = currentItem?.headerBackgroundColor || theme.screen.background;

        return (
                <ModalContext.Provider value={{ open, close, openAndDiscardOthers, closeAll, debug }}>
                        {children}
                        {currentItem && (
                                <View style={styles.modalContainer} pointerEvents="box-none">
                                        {/*
                                         * Pressable backdrop: covers the full screen behind the sheet.
                                         * Pressing it pops the current modal (same behaviour as the
                                         * close button), working through the stack item by item.
                                         * Because we own this backdrop (backdropComponent={null} on the
                                         * sheet), there is no double-fire and no timing race.
                                         */}
                                        <Pressable
                                                style={[StyleSheet.absoluteFillObject, currentItem.overlayStyle ?? { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                                                onPress={close}
                                        />
                                        <BaseBottomSheet
                                                ref={sheetRef}
                                                enablePanDownToClose={false}
                                                backdropComponent={null}
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
