import { useEffect, useState } from 'react';
import { Dimensions, ViewStyle } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';
import { isWeb } from '@/constants/Constants';
import CardDimensionHelper from '@/helper/CardDimensionHelper';
import { useTheme } from '@/hooks/useTheme';

export const useFoodCard = (borderWidth: number = 0) => {
	const { theme } = useTheme();
	const { amountColumnsForcard } = useSelector((state: RootState) => state.settings);
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

	useEffect(() => {
		const handleResize = () => setScreenWidth(Dimensions.get('window').width);
		const subscription = Dimensions.addEventListener('change', handleResize);
		return () => subscription?.remove();
	}, []);

	useEffect(() => {
		CardDimensionHelper.getCardWidth(screenWidth, amountColumnsForcard);
	}, [amountColumnsForcard, screenWidth]);

	const dimension = amountColumnsForcard === 0 ? CardDimensionHelper.getCardDimension(screenWidth) : CardDimensionHelper.getCardWidth(screenWidth, amountColumnsForcard);

	const containerStyle: ViewStyle = {
		width: dimension,
		backgroundColor: theme.card.background,
		borderWidth,
		borderColor: '#FF000095',
	};

	const imageContainerStyle: ViewStyle = {
		height: dimension,
	};

	const contentStyle: ViewStyle = {
		gap: 5,
		paddingHorizontal: 5,
	};

	return { screenWidth, containerStyle, imageContainerStyle, contentStyle };
};

export default useFoodCard;
