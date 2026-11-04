import { ReactNode, useCallback } from 'react';
import { useModalActions } from './ModalProvider';
import type { ModalOptions } from './ModalProvider';

export const useModal = () => {
	// Only the stable actions: components that open modals must not re-render on every open/close.
	// The debug state is available separately via useModalDebug().
	const { open, close, openAndDiscardOthers, closeAll } = useModalActions();

	const show = useCallback(
		(content: ReactNode, options?: ModalOptions) => {
			open(content, options);
		},
		[open],
	);

	const closeModal = useCallback(() => {
		close();
	}, [close]);

	const showAndDiscardOthers = useCallback(
		(content: ReactNode, options?: ModalOptions) => {
			openAndDiscardOthers(content, options);
		},
		[openAndDiscardOthers],
	);

	const closeAllModals = useCallback(() => {
		closeAll();
	}, [closeAll]);

	return { show, close: closeModal, showAndDiscardOthers, closeAll: closeAllModals };
};
