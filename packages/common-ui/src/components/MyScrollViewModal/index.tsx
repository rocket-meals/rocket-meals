import React, { ReactNode } from 'react';
import { Platform, View, Text, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { BottomSheetFlatList, BottomSheetScrollView, useBottomSheetInternal } from '@gorhom/bottom-sheet';
import { useTheme } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface MyScrollViewModalProps {
	title?: string;
	closeSheet?: () => void;
	backgroundColor?: string;
	children?: ReactNode;
	useFlatList?: boolean;
	data?: any[];
	renderItem?: (info: { item: any; index: number }) => ReactNode;
	keyExtractor?: (item: any, index: number) => string;
	ListHeaderComponent?: ReactNode;
	ListFooterComponent?: ReactNode;
	showsVerticalScrollIndicator?: boolean;
	keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
	onClose?: () => void;
	disableHorizontalPadding?: boolean;
	stickyHeaderComponent?: ReactNode;
}

const MyScrollViewModal: React.FC<MyScrollViewModalProps> = ({
	title,
	children,
	useFlatList = false,
	backgroundColor,
	data = [],
	renderItem,
	keyExtractor,
	ListHeaderComponent,
	ListFooterComponent,
	showsVerticalScrollIndicator = true,
	keyboardShouldPersistTaps = 'handled',
	onClose,
	disableHorizontalPadding = false,
	stickyHeaderComponent,
}) => {
	const { theme } = useTheme();
	const insets = useSafeAreaInsets();
	const { height: windowHeight } = useWindowDimensions();

	const WEB_BOTTOM_PADDING_RATIO = 0.2;
	const extraBottomPadding = Platform.OS === 'web' ? windowHeight * WEB_BOTTOM_PADDING_RATIO : 0;

	const resolvedBackgroundColor = backgroundColor ?? theme.screen.background;

	const onCloseRef = React.useRef(onClose);
	React.useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
	React.useEffect(() => () => { onCloseRef.current?.(); }, []);

	const titleElement = title ? (
		<View
			key="__title"
			style={{ backgroundColor: resolvedBackgroundColor, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 4 }}
		>
			<Text style={{ fontSize: 16, fontWeight: '600', color: theme.sheet.text }}>{title}</Text>
		</View>
	) : null;

	const footerComponent = ListFooterComponent || <View style={{ height: Math.max(24, insets.bottom + 16) + extraBottomPadding }} />;

	const contentStyle = { paddingBottom: 24 + insets.bottom + extraBottomPadding, paddingHorizontal: disableHorizontalPadding ? 0 : 20 };
	const scrollInsets = { bottom: insets.bottom };

	const { animatedContainerHeight } = useBottomSheetInternal();

	const containerStyle = { backgroundColor: resolvedBackgroundColor };

	// SCROLL FIX (gorhom v5): Do NOT put flex:1 on the outer wrapper — it causes
	// gorhom to calculate contentHeight == containerHeight (unconstrained expansion)
	// and therefore disables scrolling entirely.
	//
	// WORKAROUND: Instead of flex:1 we use maxHeight:animatedContainerHeight on an
	// Animated.View wrapper.  This is visually identical to flex:1 (the wrapper is
	// capped to the sheet's container height) but the View's natural height is still
	// driven by its content, so gorhom correctly measures contentHeight > maxHeight
	// and enables scrolling.  useBottomSheetInternal() provides animatedContainerHeight
	// as a Reanimated shared value that tracks the live sheet height.
	//
	// NOTE FOR INSIDERS: Every scroll-related change in this modal stack must be
	// documented here (and in MyAvatarEditor's header comment) so future maintainers
	// understand the full history of attempted fixes.
	if (useFlatList && renderItem && keyExtractor) {
		const flatListHeader = (
			<>
				{titleElement}
				{stickyHeaderComponent}
				{ListHeaderComponent}
			</>
		);
		return (
			<Animated.View style={[containerStyle, { maxHeight: animatedContainerHeight }]}>
				<BottomSheetFlatList
					data={data}
					keyExtractor={keyExtractor}
					renderItem={renderItem}
					ListHeaderComponent={flatListHeader}
					ListFooterComponent={footerComponent}
					contentContainerStyle={contentStyle}
					showsVerticalScrollIndicator={showsVerticalScrollIndicator}
					keyboardShouldPersistTaps={keyboardShouldPersistTaps}
					scrollIndicatorInsets={scrollInsets}
				/>
			</Animated.View>
		);
	}

	// Build the children array for BottomSheetScrollView so that stickyHeaderIndices
	// can reference the correct index.  stickyHeaderComponent is placed INSIDE the
	// scroll view (not as a sibling) so gorhom accounts for its height when computing
	// the scrollable range — see SCROLL FIX 3 in MyAvatarEditor.
	const scrollParts: React.ReactNode[] = [];
	const computedStickyIndices: number[] = [];

	if (titleElement) {
		scrollParts.push(titleElement);
	}
	if (stickyHeaderComponent) {
		computedStickyIndices.push(scrollParts.length);
		scrollParts.push(<View key="__sticky">{stickyHeaderComponent}</View>);
	}
	if (ListHeaderComponent) {
		scrollParts.push(<View key="__listHeader">{ListHeaderComponent}</View>);
	}
	scrollParts.push(<View key="__children">{children}</View>);
	scrollParts.push(<View key="__footer">{footerComponent}</View>);

	return (
		<Animated.View style={[containerStyle, { maxHeight: animatedContainerHeight }]}>
			<BottomSheetScrollView
				contentContainerStyle={contentStyle}
				showsVerticalScrollIndicator={showsVerticalScrollIndicator}
				keyboardShouldPersistTaps={keyboardShouldPersistTaps}
				scrollIndicatorInsets={scrollInsets}
				stickyHeaderIndices={computedStickyIndices.length > 0 ? computedStickyIndices : undefined}
			>
				{scrollParts}
			</BottomSheetScrollView>
		</Animated.View>
	);
};

export default MyScrollViewModal;
