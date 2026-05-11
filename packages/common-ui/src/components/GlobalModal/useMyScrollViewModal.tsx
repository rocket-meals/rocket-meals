import React, { ReactNode } from 'react';
import MyScrollViewModal, { MyScrollViewModalProps } from '../MyScrollViewModal';
import { useModal } from './useModal';

export type MyScrollViewModalConfig = Omit<MyScrollViewModalProps, 'closeSheet'> & { children?: ReactNode };

type ScrollViewModalOptions = { backgroundStyle?: any; headerBackgroundColor?: string };

export const useMyScrollViewModal = () => {
	const { show: showModal, close, showAndDiscardOthers: showAndDiscardOthersModal, closeAll, debug } = useModal();

	const buildArgs = (
		modalProps: MyScrollViewModalConfig,
		options?: ScrollViewModalOptions,
	): [React.ReactElement, ScrollViewModalOptions | undefined] => {
		const { children, backgroundColor, ...restProps } = modalProps;

		const backgroundStyle = backgroundColor
			? { backgroundColor, ...options?.backgroundStyle }
			: options?.backgroundStyle;
		const headerBackgroundColor = backgroundColor ?? options?.headerBackgroundColor;
		const mergedOptions: ScrollViewModalOptions = {
			...options,
			backgroundStyle,
			headerBackgroundColor,
		};

		const element = (
			<MyScrollViewModal closeSheet={close} backgroundColor={backgroundColor} {...restProps}>
				{children}
			</MyScrollViewModal>
		);

		return [element, mergedOptions];
	};

	const show = (modalProps: MyScrollViewModalConfig, options?: ScrollViewModalOptions) => {
		const [element, mergedOptions] = buildArgs(modalProps, options);
		showModal(element, mergedOptions);
	};

	const showAndDiscardOthers = (modalProps: MyScrollViewModalConfig, options?: ScrollViewModalOptions) => {
		const [element, mergedOptions] = buildArgs(modalProps, options);
		showAndDiscardOthersModal(element, mergedOptions);
	};

	return { show, close, showAndDiscardOthers, closeAll, debug };
};
