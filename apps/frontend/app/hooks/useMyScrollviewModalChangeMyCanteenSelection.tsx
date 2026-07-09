import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { CollectibleAt, DatabaseTypes } from 'repo-depkit-common';
import { SET_SELECTED_CANTEEN, UPDATE_PROFILE } from '@/redux/Types/types';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';
import { useMyScrollviewModalCanteenSelection } from './useMyScrollviewModalCanteenSelection';
import { useAppSelector } from '@/redux/hooks';
import { UserHelper } from '@/helper/UserHelper';
import { ProfileHelper } from '@/redux/actions/Profile/Profile';

export const useMyScrollviewModalChangeMyCanteenSelection = () => {
	const { openCanteenSelectionModal, closeCanteenSelectionModal } = useMyScrollviewModalCanteenSelection();
	const dispatch = useDispatch();
	const { user, profile } = useAppSelector((state) => state.authReducer);
	const profileHelper = useMemo(() => new ProfileHelper(), []);

	const openChangeMyCanteenSelectionModal = useCallback(() => {
		const handleSelectCanteen = async (canteen: DatabaseTypes.Canteens) => {
			dispatch({ type: SET_SELECTED_CANTEEN, payload: canteen });
			// Persist to profile.canteen locally right away, mirroring onboarding's
			// handleSelectCanteen - otherwise anonymous users (and registered users without
			// a server profile yet) would never have this reflected in profile.canteen, which
			// (app)/index.tsx's "already complete" check relies on.
			dispatch({ type: UPDATE_PROFILE, payload: { ...profile, canteen: canteen.id } });
			closeCanteenSelectionModal();

			// Best-effort: also persist to the online profile for registered users who already
			// have a server profile record.
			if (UserHelper.isRegisteredUser(user) && profile?.id) {
				try {
					const updatedPayload = { ...profile, canteen: canteen.id };
					const result = (await profileHelper.updateProfile(updatedPayload)) as DatabaseTypes.Profiles;
					if (result) {
						dispatch({ type: UPDATE_PROFILE, payload: result });
					}
				} catch (error) {
					console.error('Error saving canteen to profile:', error);
				}
			}
		};

		openCanteenSelectionModal({
			onSelectCanteen: handleSelectCanteen,
			children: <CollectibleSpot collectibleKey={CollectibleAt.collectible_at_canteen_selection} />,
		});
	}, [closeCanteenSelectionModal, dispatch, openCanteenSelectionModal, user, profile, profileHelper]);

	return { openChangeMyCanteenSelectionModal };
};

export default useMyScrollviewModalChangeMyCanteenSelection;
