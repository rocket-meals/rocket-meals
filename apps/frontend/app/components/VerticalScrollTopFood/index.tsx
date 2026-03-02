import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';
import CardDimensionHelper from '@/helper/CardDimensionHelper';
import AutoImageScroller from '@/components/AutoImageScroller';
import styles from './styles';
import { getImageUrl } from '@/constants/HelperFunctions';
import { loadMostLikedOrDislikedFoods } from '@/helper/FoodHelper';

const PAGE_SIZE = 20;
const MAX_ITEMS = 100;

const VerticalScrollTopFood: React.FC = () => {
	const { theme } = useTheme();
	const { amountColumnsForcard } = useSelector((state: RootState) => state.settings);
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

	const numColumns = CardDimensionHelper.getNumColumns(screenWidth, amountColumnsForcard);

	useEffect(() => {
		const sub = Dimensions.addEventListener('change', ({ window }) => {
			setScreenWidth(window.width);
		});
		return () => sub?.remove();
	}, []);

	const size = amountColumnsForcard === 0 ? CardDimensionHelper.getCardDimension(screenWidth) : CardDimensionHelper.getCardWidth(screenWidth, numColumns);

	const [images, setImages] = useState<string[]>([]);
	const offset = useRef(0);

	const fetchImages = async () => {
		if (offset.current >= MAX_ITEMS) return;
		const result = await loadMostLikedOrDislikedFoods(Math.min(PAGE_SIZE, MAX_ITEMS - offset.current), offset.current, undefined, true);
		const urls = (result ?? []).map((food: any) => getImageUrl(String((food as any).image))).filter(Boolean);
		setImages(prev => [...prev, ...urls]);
		offset.current += urls.length;
	};

	useEffect(() => {
		fetchImages();
	}, []);

	const loadMoreImages = () => {
		fetchImages();
	};

	const [speedPercent, setSpeedPercent] = useState(5);

	return (
		<View key={amountColumnsForcard} style={[styles.container, { backgroundColor: theme.screen.background }]}>
			<View style={styles.controls}>
				<TouchableOpacity onPress={() => setSpeedPercent(s => Math.max(1, s - 1))}>
					<Ionicons name="remove" size={24} color={theme.primary} />
				</TouchableOpacity>
				<Text style={{ color: theme.primary }}>{Math.round(speedPercent)}%/s</Text>
				<TouchableOpacity onPress={() => setSpeedPercent(s => s + 1)}>
					<Ionicons name="add" size={24} color={theme.primary} />
				</TouchableOpacity>
			</View>
			<AutoImageScroller images={images} numColumns={numColumns} size={size} speedPercent={speedPercent} loadMore={loadMoreImages} />
		</View>
	);
};

export default VerticalScrollTopFood;
