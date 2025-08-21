import { Dimensions, Text, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { CanteenSelectionSheetProps } from './types';
import { isWeb } from '@/constants/Constants';
import {
	SET_BUILDINGS,
	SET_CANTEENS,
	SET_SELECTED_CANTEEN,
} from '@/redux/Types/types';
import { getImageUrl } from '@/constants/HelperFunctions';
import { useLanguage } from '@/hooks/useLanguage';
import { DatabaseTypes } from 'repo-depkit-common';
import { CanteenHelper } from '@/redux/actions';
import { BuildingsHelper } from '@/redux/actions/Buildings/Buildings';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';
import CanteenSelection from '../CanteenSelection/CanteenSelection';

const CanteenSelectionSheet: React.FC<CanteenSelectionSheetProps> = ({
	closeSheet,
}) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const dispatch = useDispatch();
	const canteenHelper = new CanteenHelper();
	const buildingsHelper = new BuildingsHelper();
	const { serverInfo, appSettings, primaryColor } = useSelector(
		(state: RootState) => state.settings
	);
	const { isManagement } = useSelector((state: RootState) => state.authReducer);
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
	const defaultImage = getImageUrl(serverInfo?.info?.project?.project_logo);
	const foods_area_color = appSettings?.foods_area_color
		? appSettings?.foods_area_color
		: primaryColor;

	const handleSelectCanteen = (canteen: DatabaseTypes.Canteens) => {
		dispatch({ type: SET_SELECTED_CANTEEN, payload: canteen });
		closeSheet();
	};

	const getCanteensWithBuildings = async () => {
		try {
			const buildingsData = (await buildingsHelper.fetchBuildings(
				{}
			)) as DatabaseTypes.Buildings[];
			const buildings = buildingsData || [];

			const buildingsDict = buildings.reduce(
				(acc: Record<string, any>, building: any) => {
					acc[building.id] = building;
					return acc;
				},
				{}
			);

			dispatch({ type: SET_BUILDINGS, payload: buildings });

			const canteensData = (await canteenHelper.fetchCanteens(
				{}
			)) as DatabaseTypes.Canteens[];

			const filteredCanteens = canteensData.filter(canteen => {
				const status = canteen.status || '';

				// Normal users: only show published
				if (!isManagement) {
					return status === 'published';
				}

				// Management: show all, but only handle published + archived
				return status === 'published' || status === 'archived';
			});

			const sortedCanteens = filteredCanteens.sort((a, b) => {
				const aPublished = a.status === 'published';
				const bPublished = b.status === 'published';

				// Move unpublished (archived) to the end
				if (aPublished !== bPublished) {
					return aPublished ? -1 : 1;
				}

				// If both are same status, sort by sort value
				return (a.sort || 0) - (b.sort || 0);
			});

			const updatedCanteens = sortedCanteens.map(canteen => {
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
			console.error('Error fetching data:', error);
		}
	};

	useEffect(() => {
		getCanteensWithBuildings();
	}, [isManagement]);

	useEffect(() => {
		const handleResize = () => {
			setScreenWidth(Dimensions.get('window').width);
		};

		const subscription = Dimensions.addEventListener('change', handleResize);

		return () => subscription?.remove();
	}, []);

	return (
		<BottomSheetScrollView
			style={{ ...styles.sheetView, backgroundColor: theme.sheet.sheetBg }}
			contentContainerStyle={{
				...styles.contentContainer,
				paddingHorizontal: isWeb ? (screenWidth < 500 ? 5 : 20) : 5,
			}}
		>
			<View
				style={{
					...styles.sheetHeader,
					paddingRight: isWeb ? 10 : 0,
					paddingTop: isWeb ? 10 : 0,
				}}
			></View>
			<Text
				style={{
					...styles.sheetHeading,
					fontSize: isWeb ? 40 : 32,
					color: theme.sheet.text,
				}}
			>
				{translate(TranslationKeys.canteen)}
			</Text>
			<CanteenSelection onSelectCanteen={handleSelectCanteen} />
		</BottomSheetScrollView>
	);
};

export default CanteenSelectionSheet;
