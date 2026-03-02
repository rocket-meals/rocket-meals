import React, { ReactNode, useRef } from 'react';
import BaseBottomSheet from '@/components/BaseBottomSheet/BaseBottomSheet';

export interface BaseBottomModalProps {
	children?: ReactNode;
	onClose?: () => void;
	backgroundStyle?: any;
}

const BaseBottomModal: React.FC<BaseBottomModalProps> = ({ children, onClose, backgroundStyle }) => {
	// Simple wrapper around BaseBottomSheet. Consumers can render this inside a provider or directly.
	const ref = useRef<any>(null);

	return (
		<BaseBottomSheet ref={ref} index={0} backgroundStyle={backgroundStyle} enablePanDownToClose onClose={onClose}>
			{children}
		</BaseBottomSheet>
	);
};

export default BaseBottomModal;
