import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useRouter } from 'expo-router';

import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import { performLogout } from '@/helper/logoutHelper';
import useLogoutButtonTranslation from './useLogoutButtonTranslation';
import AppConfirmationDialog from '@/components/AppConfirmationDialog';

const useConfirmLogoutModal = () => {
	const { show, close } = useMyScrollViewModal();
	const dispatch = useDispatch();
	const router = useRouter();
	const { buttonLabel, modalDescription } = useLogoutButtonTranslation();

	const openConfirmLogoutModal = useCallback(() => {
		const handleLogout = async () => {
			close();
			await performLogout(dispatch, router);
		};

		show(
			{
				children: (
					<AppConfirmationDialog
						title={buttonLabel}
						description={modalDescription}
						onConfirm={handleLogout}
						onCancel={close}
					/>
				),
			},
			{}
		);
	}, [buttonLabel, close, dispatch, modalDescription, router, show]);

	return { openConfirmLogoutModal, closeConfirmLogoutModal: close };
};

export default useConfirmLogoutModal;
