import React, { ReactNode } from 'react';
import { Platform, View, Text, useWindowDimensions } from 'react-native';
import { BottomSheetFlatList, BottomSheetScrollView } from '@gorhom/bottom-sheet';
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

	const containerStyle = { backgroundColor: resolvedBackgroundColor };

	// SCROLL FIX (gorhom v5): Do NOT put flex:1 on the outer wrapper View or on the
	// BottomSheetScrollView/BottomSheetFlatList's style prop.  When the wrapper carries
	// flex:1 it expands unconstrained inside the BottomSheet content container, causing
	// gorhom to calculate contentHeight == containerHeight and therefore disable
	// scrolling entirely.  Letting gorhom manage the scroll-view height via its own
	// BottomSheetContext is the correct pattern.
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
			<View style={containerStyle}>
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
			</View>
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
		<View style={containerStyle}>
			<BottomSheetScrollView
				contentContainerStyle={contentStyle}
				showsVerticalScrollIndicator={showsVerticalScrollIndicator}
				keyboardShouldPersistTaps={keyboardShouldPersistTaps}
				scrollIndicatorInsets={scrollInsets}
				stickyHeaderIndices={computedStickyIndices.length > 0 ? computedStickyIndices : undefined}
			>
				{scrollParts}
			</BottomSheetScrollView>
		</View>
	);
};

export default MyScrollViewModal;
