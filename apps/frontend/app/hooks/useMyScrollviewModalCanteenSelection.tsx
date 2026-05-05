import React, { ReactNode, useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { useDispatch } from 'react-redux';
import { DatabaseTypes } from 'repo-depkit-common';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import CanteenSelection from '@/components/CanteenSelection/CanteenSelection';
import { SET_BUILDINGS_DICT, SET_CANTEENS } from '@/redux/Types/types';
import { CanteenHelper } from '@/redux/actions';
import { BuildingsHelper } from '@/redux/actions/Buildings/Buildings';
import { getImageUrl } from '@/constants/HelperFunctions';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { useAppSelector } from '@/redux/hooks';

interface CanteenSelectionContentProps {
	onSelectCanteen: (canteen: DatabaseTypes.Canteens) => void;
	children?: ReactNode;
}

const CanteenSelectionContent: React.FC<CanteenSelectionContentProps> = ({ onSelectCanteen, children }) => {
	const dispatch = useDispatch();
	const { isManagement } = useAppSelector((state) => state.authReducer);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const canteenHelper = new CanteenHelper();
				const buildingsHelper = new BuildingsHelper();

				const buildingsData = (await buildingsHelper.fetchBuildings({})) as DatabaseTypes.Buildings[];
				const buildings = buildingsData || [];

				const buildingsDict = buildings.reduce((acc: Record<string, any>, building: any) => {
					acc[building.id] = building;
					return acc;
				}, {});

				dispatch({ type: SET_BUILDINGS_DICT, payload: buildingsDict });

				const canteensData = (await canteenHelper.fetchCanteens({})) as DatabaseTypes.Canteens[];

				const filteredCanteens = canteensData.filter((canteen) => {
					const status = canteen.status || '';
					if (!isManagement) return status === 'published';
					return status === 'published' || status === 'archived';
				});

				const sortedCanteens = filteredCanteens.sort((a, b) => {
					const aPublished = a.status === 'published';
					const bPublished = b.status === 'published';
					if (aPublished !== bPublished) return aPublished ? -1 : 1;
					return (a.sort || 0) - (b.sort || 0);
				});

				const updatedCanteens = sortedCanteens.map((canteen) => {
					const building = buildingsDict[canteen?.building as string];
					return {
						...canteen,
						imageAssetId: building?.image,
						thumbHash: building?.image_thumb_hash,
						image_url: building?.image_remote_url || getImageUrl(building?.image),
					};
				});

				dispatch({ type: SET_CANTEENS, payload: updatedCanteens });
			} catch (error) {
				console.error('Error fetching canteen data:', error);
			}
		};

		fetchData();
	}, [dispatch, isManagement]);

	return (
		<View>
			<CanteenSelection onSelectCanteen={onSelectCanteen} />
			{children}
		</View>
	);
};

interface OpenCanteenSelectionModalParams {
	onSelectCanteen: (canteen: DatabaseTypes.Canteens) => void;
	title?: string;
	children?: ReactNode;
}

export const useMyScrollviewModalCanteenSelection = () => {
	const { show: showScrollViewModal, close: closeScrollViewModal } = useMyScrollViewModal();
	const { translate } = useLanguage();

	const openCanteenSelectionModal = useCallback(
		({ onSelectCanteen, title, children }: OpenCanteenSelectionModalParams) => {
			showScrollViewModal({
				title: title ?? translate(TranslationKeys.canteen),
				onClose: closeScrollViewModal,
				disableHorizontalPadding: true,
				children: (
					<CanteenSelectionContent onSelectCanteen={onSelectCanteen}>
						{children}
					</CanteenSelectionContent>
				),
			});
		},
		[closeScrollViewModal, showScrollViewModal, translate]
	);

	return { openCanteenSelectionModal, closeCanteenSelectionModal: closeScrollViewModal };
};

export default useMyScrollviewModalCanteenSelection;
