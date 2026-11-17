import { Dimensions, Linking, Platform, Text, TouchableOpacity, View, type DimensionValue } from 'react-native';
import React, { useEffect, useState } from 'react';
import styles from './styles';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAppSelector } from '@/redux/hooks';
import { format, parseISO } from 'date-fns';
import { getNewsTranslationByLanguageCode } from '@/helper/resourceHelper';
import useToast from '@/hooks/useToast';
import { useLanguage } from '@/hooks/useLanguage';
import { myContrastColor } from '@/helper/ColorHelper';
import { CustomTooltip, TooltipContent, TooltipText } from '@/components/CustomTooltip';
import { TranslationKeys } from '@/locales/keys';
import MyImage from '@/components/MyImage';
import { getNewsImageUrlForBox } from '@/constants/HelperFunctions';

const ReadMoreTriggerButton = ({
	triggerProps,
	onPress,
	backgroundColor,
	textColor,
	width,
	label,
}: {
	triggerProps: object;
	onPress: () => void;
	backgroundColor: string;
	textColor: string;
	width: DimensionValue;
	label: string;
}) => (
	<TouchableOpacity
		{...triggerProps}
		style={{
			...styles.readMoreButton,
			backgroundColor,
			width,
		}}
		onPress={onPress}
	>
		<Text style={{ ...styles.readMore, color: textColor }}>{label}</Text>
		<FontAwesome6 name="arrow-up-right-from-square" size={20} color={textColor} />
	</TouchableOpacity>
);

const makeReadMoreTrigger = (props: Readonly<{
	onPress: () => void;
	backgroundColor: string;
	textColor: string;
	width: DimensionValue;
	label: string;
}>) => (triggerProps: object) => <ReadMoreTriggerButton triggerProps={triggerProps} {...props} />;

const NEWS_ITEM_WIDE_BREAKPOINT = 768;
const NEWS_ITEM_EXTRA_WIDE_BREAKPOINT = 900;

const NEWS_ITEM_NARROW_LAYOUT = {
	imageContainerWidth: '100%' as const,
	newsContentWidth: '100%' as const,
	cardFlexDirection: 'column' as const,
	imageHeight: 180,
	contentJustifyContent: 'flex-start' as const,
	contentPadding: 0,
	headerMarginTop: 5,
	headerFlexDirection: 'column' as const,
	titleWidth: '100%' as const,
	dateWidth: '100%' as const,
	actionAlignItems: 'center' as const,
	readMoreWidth: '100%' as DimensionValue,
};

/**
 * Resolves all the screenWidth-dependent layout values used by NewsItem's
 * JSX, so the `screenWidth > 768` breakpoint check isn't repeated ~10x.
 */
function resolveNewsItemLayout(screenWidth: number) {
	if (screenWidth <= NEWS_ITEM_WIDE_BREAKPOINT) {
		return NEWS_ITEM_NARROW_LAYOUT;
	}

	const isExtraWide = screenWidth > NEWS_ITEM_EXTRA_WIDE_BREAKPOINT;
	return {
		imageContainerWidth: isExtraWide ? ('20%' as const) : ('30%' as const),
		newsContentWidth: isExtraWide ? ('79%' as const) : ('69%' as const),
		cardFlexDirection: 'row' as const,
		imageHeight: 220,
		contentJustifyContent: 'space-between' as const,
		contentPadding: 10,
		headerMarginTop: 10,
		headerFlexDirection: 'row' as const,
		titleWidth: '80%' as const,
		dateWidth: '20%' as const,
		actionAlignItems: 'flex-start' as const,
		readMoreWidth: 210 as DimensionValue,
	};
}

const NewsItem: React.FC<any> = ({ news }) => {
	const { theme } = useTheme();
	const toast = useToast();
	const { translate } = useLanguage();
	const { primaryColor, language, appSettings, selectedTheme: mode } = useAppSelector(state => state.settings);
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
	const { title, content } = getNewsTranslationByLanguageCode(news?.translations, language);
	const news_area_color = appSettings?.news_area_color ? appSettings?.news_area_color : primaryColor;
	const contrastColor = myContrastColor(news_area_color, theme, mode === 'dark');
	// Width of the image box, known after layout: the image is cut once in its format (about 2:1).
	const [imageBoxWidth, setImageBoxWidth] = useState(0);
	const formattedDate = news?.date ? format(parseISO(news.date), 'dd.MM.yyyy hh:mm') : 'Invalid Date';

	useEffect(() => {
		const handleResize = () => {
			setScreenWidth(Dimensions.get('window').width);
		};

		const subscription = Dimensions.addEventListener('change', handleResize);

		return () => subscription?.remove();
	}, []);

	const handleNewsDetails = async () => {
		const url = news?.url;
		if (Platform.OS === 'web') {
			window.open(url, '_blank');
		} else {
			const supported = await Linking.canOpenURL(url);

			if (supported) {
				await Linking.openURL(url);
			} else {
				toast(`Cannot open URL: ${url}`, 'error');
			}
		}
	};

	const {
		imageContainerWidth,
		newsContentWidth,
		cardFlexDirection,
		imageHeight,
		contentJustifyContent,
		contentPadding,
		headerMarginTop,
		headerFlexDirection,
		titleWidth,
		dateWidth,
		actionAlignItems,
		readMoreWidth,
	} = resolveNewsItemLayout(screenWidth);
	// Like the popup and the food offers: the uploaded image first (cut by Directus around its focal
	// point in the format of the box), else the remote URL.
	const imageUrl = imageBoxWidth > 0 ? getNewsImageUrlForBox(news, imageBoxWidth, imageHeight) : null;

	return (
		<View
			style={{
				...styles.card,
				flexDirection: cardFlexDirection,
				backgroundColor: theme.screen.iconBg,
			}}
		>
			<View
				style={{
					...styles.imageContainer,
					width: imageContainerWidth,
					height: imageHeight,
				}}
				onLayout={event => setImageBoxWidth(event.nativeEvent.layout.width)}
			>
				{imageUrl ? <MyImage remote_image_url={imageUrl} style={styles.image} /> : null}
			</View>
			<View
				style={{
					width: newsContentWidth,
					justifyContent: contentJustifyContent,
					padding: contentPadding,
				}}
			>
				<View
					style={{
						width: '100%',
					}}
				>
					<View
						style={{
							...styles.newsHeader,
							marginTop: headerMarginTop,
							marginBottom: 10,
							flexDirection: headerFlexDirection,
						}}
					>
						<Text
							style={{
								...styles.newsHeading,
								color: theme.screen.text,
								width: titleWidth,
							}}
						>
							{title}
						</Text>
						<Text
							style={{
								...styles.newsDate,
								color: theme.screen.text,
								width: dateWidth,
								textAlign: 'right',
							}}
						>
							{formattedDate}
						</Text>
					</View>
					<Text style={{ ...styles.newsBody, color: theme.screen.text }}>{content}</Text>
				</View>
				<View
					style={{
						...styles.actionContainer,
						alignItems: actionAlignItems,
					}}
				>
					<CustomTooltip
						placement="top"
						trigger={makeReadMoreTrigger({
							onPress: handleNewsDetails,
							backgroundColor: news_area_color,
							textColor: contrastColor,
							width: readMoreWidth,
							label: translate(TranslationKeys.read_more),
						})}
					>
						<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
							<TooltipText fontSize="$sm" color={theme.tooltip.text}>
								{translate(TranslationKeys.read_more)}
							</TooltipText>
						</TooltipContent>
					</CustomTooltip>
				</View>
			</View>
		</View>
	);
};

export default NewsItem;
