import { Dimensions, Image, Linking, Platform, Text, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import styles from './styles';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useSelector } from 'react-redux';
import { format, parseISO } from 'date-fns';
import { getNewsTranslationByLanguageCode } from '@/helper/resourceHelper';
import useToast from '@/hooks/useToast';
import { useLanguage } from '@/hooks/useLanguage';
import { myContrastColor } from '@/helper/ColorHelper';
import { Tooltip, TooltipContent, TooltipText } from '@gluestack-ui/themed';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';

const NewsItem: React.FC<any> = ({ news }) => {
	const { theme } = useTheme();
	const toast = useToast();
	const { translate } = useLanguage();
	const { primaryColor, language, appSettings, selectedTheme: mode } = useSelector((state: RootState) => state.settings);
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
	const { title, content } = getNewsTranslationByLanguageCode(news?.translations, language);
	const news_area_color = appSettings?.news_area_color ? appSettings?.news_area_color : primaryColor;
	const contrastColor = myContrastColor(news_area_color, theme, mode === 'dark');
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
	return (
		<View
			style={{
				...styles.card,
				flexDirection: screenWidth > 768 ? 'row' : 'column',
				backgroundColor: theme.screen.iconBg,
			}}
		>
			<View
				style={{
					...styles.imageContainer,
					width: screenWidth > 768 ? (screenWidth > 900 ? '20%' : '30%') : '100%',
					height: screenWidth > 768 ? 220 : 180,
				}}
			>
				<Image
					source={{
						uri: news?.image_remote_url,
					}}
					style={styles.image}
				/>
			</View>
			<View
				style={{
					width: screenWidth > 768 ? (screenWidth > 900 ? '79%' : '69%') : '100%',
					justifyContent: screenWidth > 768 ? 'space-between' : 'flex-start',
					padding: screenWidth > 768 ? 10 : 0,
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
							marginTop: screenWidth > 768 ? 10 : 5,
							marginBottom: 10,
							flexDirection: screenWidth > 768 ? 'row' : 'column',
						}}
					>
						<Text
							style={{
								...styles.newsHeading,
								color: theme.screen.text,
								width: screenWidth > 768 ? '80%' : '100%',
							}}
						>
							{title}
						</Text>
						<Text
							style={{
								...styles.newsDate,
								color: theme.screen.text,
								width: screenWidth > 768 ? '20%' : '100%',
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
						alignItems: screenWidth > 768 ? 'flex-start' : 'center',
					}}
				>
					<Tooltip
						placement="top"
						trigger={triggerProps => (
							<TouchableOpacity
								{...triggerProps}
								style={{
									...styles.readMoreButton,
									backgroundColor: news_area_color,
									width: screenWidth > 768 ? 210 : '100%',
								}}
								onPress={handleNewsDetails}
							>
								<Text style={{ ...styles.readMore, color: contrastColor }}>{translate(TranslationKeys.read_more)}</Text>
								<FontAwesome6 name="arrow-up-right-from-square" size={20} color={contrastColor} />
							</TouchableOpacity>
						)}
					>
						<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
							<TooltipText fontSize="$sm" color={theme.tooltip.text}>
								{translate(TranslationKeys.read_more)}
							</TooltipText>
						</TooltipContent>
					</Tooltip>
				</View>
			</View>
		</View>
	);
};

export default NewsItem;
