import React, { useEffect, useRef } from 'react';
import { Dimensions, FlatList, View } from 'react-native';
import { Image } from 'expo-image';
import styles from './styles';

interface AutoImageScrollerProps {
	images: string[];
	numColumns: number;
	size: number;
	speedPercent: number; // percent of screen height per second
	loadMore: () => void;
}

const AutoImageScroller: React.FC<AutoImageScrollerProps> = ({ images, numColumns, size, speedPercent, loadMore }) => {
	const flatListRef = useRef<FlatList<string>>(null);
	const scrollOffset = useRef(0);
	const screenHeight = Dimensions.get('window').height;
	const frameRef = useRef<number>();
	const loadingRef = useRef(false);

	useEffect(() => {
		loadingRef.current = false;
	}, [images]);

	const extendedImages = React.useMemo(() => images, [images]);

	useEffect(() => {
		let lastTime: number | null = null;
		const pxPerSecond = (speedPercent / 100) * screenHeight;

		const step = (time: number) => {
			if (lastTime === null) {
				lastTime = time;
			}
			const delta = time - lastTime;
			lastTime = time;
			const distance = (pxPerSecond * delta) / 1000;
			scrollOffset.current += distance;

			const listHeight = Math.ceil(images.length / numColumns) * size;
			if (!loadingRef.current && scrollOffset.current + screenHeight >= listHeight - size) {
				loadingRef.current = true;
				loadMore();
			}

			flatListRef.current?.scrollToOffset({
				offset: scrollOffset.current,
				animated: false,
			});
			frameRef.current = requestAnimationFrame(step);
		};

		flatListRef.current?.scrollToOffset({
			offset: scrollOffset.current,
			animated: false,
		});
		frameRef.current = requestAnimationFrame(step);
		return () => {
			if (frameRef.current) {
				cancelAnimationFrame(frameRef.current);
			}
		};
	}, [images, numColumns, size, speedPercent, screenHeight]);

	const renderItem = ({ item, index }: { item: string; index: number }) => {
		const columnIndex = index % numColumns;
		const offset = (columnIndex % 3) * (size / 3);
		return (
			<View style={{ transform: [{ translateY: offset }] }}>
				<Image source={{ uri: item }} style={[styles.image, { width: size, height: size }]} contentFit="cover" />
			</View>
		);
	};

	return <FlatList ref={flatListRef} key={numColumns} data={extendedImages} renderItem={renderItem} keyExtractor={(_, idx) => idx.toString()} numColumns={numColumns} showsVerticalScrollIndicator={false} scrollEnabled={false} onEndReached={loadMore} onEndReachedThreshold={0.5} />;
};

export default AutoImageScroller;
