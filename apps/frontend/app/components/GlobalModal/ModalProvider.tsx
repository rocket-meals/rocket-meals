import React, { createContext, useContext, useState, ReactNode, useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import BaseBottomSheet from '@/components/BaseBottomSheet/BaseBottomSheet';
import {useTheme} from "@/hooks/useTheme";

type ModalOptions = {
        backgroundStyle?: any; // styling passed to the BottomSheet background
        headerBackgroundColor?: string;
        overlayStyle?: any; // styling for the fullscreen overlay behind the sheet (e.g. rgba dim)
};

type ModalContextType = {
        open: (content: ReactNode, options?: ModalOptions) => void;
        close: () => void;
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

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
        const [content, setContent] = useState<ReactNode | null>(null);
        const contentRef = useRef<ReactNode | null>(null);
        const [backgroundStyle, setBackgroundStyle] = useState<any>(null);
        // overlay shown over the app (should usually be semi-transparent) - separate from sheet background
        const [overlayStyle, setOverlayStyle] = useState<any>(null);
        const [headerBackgroundColor, setHeaderBackgroundColor] = useState<string | undefined>(undefined);
        const sheetRef = useRef<any>(null);

        const { theme } = useTheme();
        let screenBackgroundColor = headerBackgroundColor || theme.screen.background;

        const [debug, setDebug] = useState<ModalContextType['debug']>({
                lastAction: null,
                contentSet: false,
                backgroundStyleProvided: false,
                sheetRefReady: false,
                openInvocations: 0,
                closeInvocations: 0,
        });

        const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

        const clearCloseTimeout = () => {
                if (closeTimeoutRef.current) {
                        clearTimeout(closeTimeoutRef.current);
                        closeTimeoutRef.current = null;
                }
        };

        const open = (c: ReactNode, options?: ModalOptions) => {
                clearCloseTimeout();

                contentRef.current = c;
                setContent(c);
                const resolvedBackgroundStyle = options?.backgroundStyle ?? null;
                setBackgroundStyle(resolvedBackgroundStyle);
                setOverlayStyle(options?.overlayStyle ?? { backgroundColor: 'rgba(0,0,0,0.5)' });
                const resolvedHeaderBackgroundColor =
                        options?.headerBackgroundColor ?? resolvedBackgroundStyle?.backgroundColor ?? undefined;
                setHeaderBackgroundColor(resolvedHeaderBackgroundColor);
                setDebug(prev => ({
                        ...prev,
                        lastAction: 'open',
                        contentSet: Boolean(c),
                        backgroundStyleProvided: Boolean(options?.backgroundStyle),
                        sheetRefReady: Boolean(sheetRef.current),
                        openInvocations: prev.openInvocations + 1,
                }));
        };

        const close = () => {
                if (!contentRef.current) return;

                contentRef.current = null;
                sheetRef.current?.close?.();
                setBackgroundStyle(null);
                setOverlayStyle(null);
                setHeaderBackgroundColor(undefined);
                clearCloseTimeout();
                closeTimeoutRef.current = setTimeout(() => {
                        setContent(null);
                        clearCloseTimeout();
                }, 200);
                setDebug(prev => ({
                        ...prev,
                        lastAction: 'close',
                        contentSet: false,
                        sheetRefReady: Boolean(sheetRef.current),
                        closeInvocations: prev.closeInvocations + 1,
                }));
        };

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

        useEffect(() => {
                if (!content) return;
                const cancel = ensureExpand();
                return () => cancel();
        }, [content]);

        return (
                <ModalContext.Provider value={{ open, close, debug }}>
                        {children}
                        {content && (
                                <View style={styles.modalContainer} pointerEvents="box-none">
                                       {/* Visual overlay (uses provided overlayStyle or falls back to semi-transparent dim) */}
                                       <View
                                               style={[StyleSheet.absoluteFillObject, overlayStyle ?? { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                                               pointerEvents="none"
                                       />
                                         <BaseBottomSheet
                                                 ref={sheetRef}
                                                 enablePanDownToClose
                                                 onClose={close}
                                                 headerBackgroundColor={screenBackgroundColor}
                                                 backgroundStyle={backgroundStyle}
                                         >
                                                 {content}
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
