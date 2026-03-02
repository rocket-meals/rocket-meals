import { ReactNode } from 'react';
import MyScrollViewModal, { MyScrollViewModalProps } from '@/components/MyScrollViewModal';
import { useModal } from './useModal';

export type MyScrollViewModalConfig = Omit<MyScrollViewModalProps, 'closeSheet'> & { children?: ReactNode };

export const useMyScrollViewModal = () => {
        const { show: showModal, close, debug } = useModal();

        const show = (modalProps: MyScrollViewModalConfig, options?: { backgroundStyle?: any; headerBackgroundColor?: string }) => {
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

                showModal(
                        <MyScrollViewModal closeSheet={close} backgroundColor={backgroundColor} {...restProps}>
                                {children}
                        </MyScrollViewModal>,
                        mergedOptions,
                );
        };

        return { show, close, debug };
};
