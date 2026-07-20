import { useEffect, useState } from 'react';
import { Dimensions, ViewStyle } from 'react-native';
import { useAppSelector } from '@/redux/hooks';
import CardDimensionHelper from '@/helper/CardDimensionHelper';
import { useTheme } from '@/hooks/useTheme';

export const useFoodCardBase = (
    borderWidth: number | undefined, 
    borderColor: string | undefined, 
    screenWidth: number, 
    theme: any, 
    amountColumnsForcard: number
) => {
	borderWidth ??= 0;
	const dimension = amountColumnsForcard === 0 ? CardDimensionHelper.getCardDimension(screenWidth) : CardDimensionHelper.getCardWidth(screenWidth, amountColumnsForcard);

	const containerStyle: ViewStyle = {
		width: dimension,
		backgroundColor: theme?.card?.background,
		borderWidth,
		borderColor: borderColor || '#FF000095',
	};

	const imageContainerStyle: ViewStyle = {
		width: '100%',
		height: '100%',
	};

	const contentStyle: ViewStyle = {
		gap: 5,
		paddingHorizontal: 5,
	};

	return { screenWidth, containerStyle, imageContainerStyle, contentStyle };
};

export const useFoodCard = (borderWidth: number = 0, borderColor?: string, providedScreenWidth?: number) => {
	const { theme } = useTheme();
	const amountColumnsForcard = useAppSelector((state) => state.settings.amountColumnsForcard);
	const [localScreenWidth, setLocalScreenWidth] = useState(providedScreenWidth || Dimensions.get('window').width);

	const screenWidth = providedScreenWidth || localScreenWidth;

	useEffect(() => {
		if (providedScreenWidth) return;

		const handleResize = () => setLocalScreenWidth(Dimensions.get('window').width);
		const subscription = Dimensions.addEventListener('change', handleResize);
		return () => subscription?.remove();
	}, [providedScreenWidth]);

	useEffect(() => {
		if (!providedScreenWidth) {
			CardDimensionHelper.getCardWidth(screenWidth, amountColumnsForcard);
		}
	}, [amountColumnsForcard, screenWidth, providedScreenWidth]);

    return useFoodCardBase(borderWidth, borderColor, screenWidth, theme, amountColumnsForcard);
};

export default useFoodCard;
