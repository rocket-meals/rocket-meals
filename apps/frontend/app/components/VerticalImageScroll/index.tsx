import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, ScaledSize, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAppSelector } from '@/redux/hooks';
import CardDimensionHelper from '@/helper/CardDimensionHelper';
import AutoImageScroller, { AutoScrollerImage } from '@/components/AutoImageScroller';
import styles from './styles';
import { getImageUrl } from '@/constants/HelperFunctions';
import { loadBestRatedFoodsWithImage } from '@/helper/FoodHelper';

const PAGE_SIZE = 20;
const MAX_ITEMS = 100;

const VerticalImageScroll: React.FC = () => {
	const { theme } = useTheme();
	const { amountColumnsForcard } = useAppSelector((state) => state.settings);
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

	const numColumns = CardDimensionHelper.getNumColumns(screenWidth, amountColumnsForcard);

	useEffect(() => {
		const sub = Dimensions.addEventListener('change', ({ window }: { window: ScaledSize }) => {
			setScreenWidth(window.width);
		});
		return () => sub?.remove();
	}, []);

	const size = amountColumnsForcard === 0 ? CardDimensionHelper.getCardDimension(screenWidth) : CardDimensionHelper.getCardWidth(screenWidth, numColumns);

	const [images, setImages] = useState<AutoScrollerImage[]>([]);
	const offset = useRef(0);

	const fetchImages = async () => {
		if (offset.current >= MAX_ITEMS) return;
		const result = await loadBestRatedFoodsWithImage(Math.min(PAGE_SIZE, MAX_ITEMS - offset.current), offset.current);
		const items = (result ?? [])
			.map((food: any) => ({ uri: getImageUrl(String(food.image)), alt: String(food.alias ?? '') }))
			.filter((item): item is AutoScrollerImage => Boolean(item.uri));
		setImages(prev => [...prev, ...items]);
		offset.current += items.length;
	};

	useEffect(() => {
		void fetchImages();
	}, []);

	const loadMoreImages = () => {
		void fetchImages();
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

export default VerticalImageScroll;
