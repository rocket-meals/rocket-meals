import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import { isWeb } from '@/constants/Constants';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import styles from './styles';
import { CustomStackHeaderProps } from './types';
import { usePathname, useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { excerpt } from '@/constants/HelperFunctions';
import { Tooltip, TooltipContent, TooltipText } from '@gluestack-ui/themed';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';
import { AppScreens } from 'repo-depkit-common';

const CustomStackHeader: React.FC<CustomStackHeaderProps> = ({ label, rightElement }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const router = useRouter();
	const pathname = usePathname();
	const { loggedIn } = useSelector((state: RootState) => state.authReducer);
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

	const handleGoback = () => {
		if (pathname.includes(`/${AppScreens.FOOD_OFFERS}/details`)) {
			router.navigate(`/${AppScreens.FOOD_OFFERS}`);
		} else if (pathname.includes(`/${AppScreens.HOUSING}/details`)) {
			router.navigate(`/${AppScreens.HOUSING}`);
		} else if (pathname.includes(`/${AppScreens.STATISTICS}`)) {
			router.navigate(`/${AppScreens.MANAGEMENT}`);
		} else if (pathname.includes(`/${AppScreens.SUPPORT_TICKET}`)) {
			router.navigate(`/${AppScreens.SUPPORT_FAQ}`);
		} else if (pathname.includes(`/${AppScreens.FEEDBACK_SUPPORT}`)) {
			router.navigate(`/${AppScreens.SUPPORT_FAQ}`);
		} else if (pathname.includes(`/${AppScreens.SUPPORT_FAQ}`)) {
			router.navigate(`/${AppScreens.SETTINGS}`);
		} else if (pathname.includes(`/${AppScreens.HOUSING_DELETE_USER}`)) {
			if (loggedIn) {
				router.navigate(`/${AppScreens.SETTINGS}`);
			} else {
				router.navigate(`/${AppScreens.LOGIN}`);
			}
		} else if (pathname.includes(`/${AppScreens.CAMPUS}/details`)) {
			router.navigate(`/${AppScreens.CAMPUS}`);
		} else if (pathname.includes(`/${AppScreens.LIST_WEEK_SCREEN}`)) {
			router.navigate(`/${AppScreens.FOOD_PLAN_WEEK}`);
		} else if (pathname.includes(`/${AppScreens.FOOD_PLAN_WEEK}`)) {
			router.navigate(`/${AppScreens.MANAGEMENT}`);
		} else if (pathname.includes(`/${AppScreens.FORMS}`)) {
			router.navigate(`/${AppScreens.FORM_CATEGORIES}`);
                } else if (pathname.includes(`/${AppScreens.FORM_CATEGORIES}`)) {
                        router.navigate(`/${AppScreens.MANAGEMENT}`);
                } else if (pathname.includes('/chats/details')) {
                        router.navigate('/chats');
                } else if (router.canGoBack()) {
                        router.back();
                } else if (loggedIn) {
			router.navigate(`/${AppScreens.FOOD_OFFERS}`);
		} else {
			router.navigate(`/${AppScreens.LOGIN}`);
		}
	};

	useEffect(() => {
		const handleResize = () => {
			setScreenWidth(Dimensions.get('window').width);
		};

		const subscription = Dimensions.addEventListener('change', handleResize);

		return () => subscription?.remove();
	}, []);

	return (
		<View
			style={{
				...styles.header,
				backgroundColor: theme.header.background,
				paddingHorizontal: isWeb ? 20 : 10,
			}}
		>
                        <View style={styles.row}>
                                <View style={styles.col1}>
					<Tooltip
						placement="top"
						trigger={triggerProps => (
							<TouchableOpacity {...triggerProps} onPress={handleGoback} style={{ padding: 10 }}>
								<Ionicons name="arrow-back" size={26} color={theme.header.text} />
							</TouchableOpacity>
						)}
					>
						<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
							<TooltipText fontSize="$sm" color={theme.tooltip.text}>
								{`${translate(TranslationKeys.navigate_back)}`}
							</TooltipText>
						</TooltipContent>
					</Tooltip>

					<Text style={{ ...styles.heading, color: theme.header.text }}>{excerpt(label, screenWidth > 900 ? 100 : screenWidth > 700 ? 80 : 22)}</Text>
                                </View>
                                {rightElement ? <View style={styles.col2}>{rightElement}</View> : null}
                        </View>
                </View>
        );
};

export default CustomStackHeader;
