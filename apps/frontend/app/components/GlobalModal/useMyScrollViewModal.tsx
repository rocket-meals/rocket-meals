import React, { ReactNode, useCallback } from 'react';
import MyScrollViewModal, { MyScrollViewModalProps } from '@/components/MyScrollViewModal';
import { useModal } from './useModal';
import type { ModalOptions } from 'repo-depkit-common-ui';

export type MyScrollViewModalConfig = MyScrollViewModalProps & { children?: ReactNode };

/** The subset of the global modal stack's `ModalOptions` that a scroll-view modal forwards. */
type ScrollViewModalOptions = Pick<ModalOptions, 'backgroundStyle' | 'headerBackgroundColor' | 'onClosed'>;

/** Wraps the content in a MyScrollViewModal and merges the sheet options (pure, no hook state). */
const buildArgs = (
        modalProps: MyScrollViewModalConfig,
        options?: ScrollViewModalOptions,
): [React.ReactElement, ScrollViewModalOptions | undefined] => {
        const { children, backgroundColor, ...restProps } = modalProps;

        const backgroundStyle = backgroundColor
                ? { backgroundColor, ...options?.backgroundStyle }
                : options?.backgroundStyle;
        const headerBackgroundColor = backgroundColor ?? options?.headerBackgroundColor;
        const mergedOptions = options
                ? {
                          ...options,
                          backgroundStyle,
                          headerBackgroundColor,
                  }
                : undefined;

        const element = (
                <MyScrollViewModal backgroundColor={backgroundColor} {...restProps}>
                        {children}
                </MyScrollViewModal>
        );

        return [element, mergedOptions];
};

export const useMyScrollViewModal = () => {
        const { show: showModal, close, showAndDiscardOthers: showAndDiscardOthersModal, closeAll } = useModal();

        const show = useCallback((modalProps: MyScrollViewModalConfig, options?: ScrollViewModalOptions) => {
                const [element, mergedOptions] = buildArgs(modalProps, options);
                showModal(element, mergedOptions);
        }, [showModal]);

        const showAndDiscardOthers = useCallback((modalProps: MyScrollViewModalConfig, options?: ScrollViewModalOptions) => {
                const [element, mergedOptions] = buildArgs(modalProps, options);
                showAndDiscardOthersModal(element, mergedOptions);
        }, [showAndDiscardOthersModal]);

        return { show, close, showAndDiscardOthers, closeAll };
};
