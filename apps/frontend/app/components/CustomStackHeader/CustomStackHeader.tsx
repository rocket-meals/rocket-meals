import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import { isWeb } from '@/constants/Constants';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import styles from './styles';
import { CustomStackHeaderProps } from './types';
import { usePathname, useRouter } from 'expo-router';
import { useAppSelector } from '@/redux/hooks';
import { excerpt } from '@/constants/HelperFunctions';
import { CustomTooltip, TooltipContent, TooltipText } from '@/components/CustomTooltip';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';

import { AppScreens } from 'repo-depkit-common';
import { HOUSING_ANALYTICS_ROUTE } from '@/helper/housingAnalytics/HousingAnalyticsRoutes';

const BackTriggerButton = ({ triggerProps, onPress, color }: { triggerProps: object; onPress: () => void; color: string }) => (
	<TouchableOpacity activeOpacity={0.4} {...triggerProps} onPress={onPress} style={{ padding: 10 }}>
		<Ionicons name="arrow-back" size={26} color={color} />
	</TouchableOpacity>
);

const makeBackTrigger = (onPress: () => void, color: string) => (triggerProps: object) => (
	<BackTriggerButton triggerProps={triggerProps} onPress={onPress} color={color} />
);

// Ordered pathname-substring -> target mappings, checked top to bottom (first match wins),
// for the plain cases where the target doesn't depend on anything but the pathname.
const GO_BACK_TARGET_RULES: { pathIncludes: string; target: string }[] = [
	{ pathIncludes: `/${AppScreens.FOOD_OFFERS}/details`, target: `/${AppScreens.FOOD_OFFERS}` },
	// Playbook detail -> playbook overview (trailing slash so the overview itself doesn't match)
	{ pathIncludes: `/${AppScreens.EXPERIMENTELL}/playbook/`, target: `/${AppScreens.EXPERIMENTELL}/playbook` },
	{ pathIncludes: `/${AppScreens.EXPERIMENTELL}/playbook`, target: `/${AppScreens.EXPERIMENTELL}` },
	{ pathIncludes: `/${AppScreens.HOUSING}/details`, target: `/${AppScreens.HOUSING}` },
	{ pathIncludes: `/${AppScreens.STATISTICS}`, target: `/${AppScreens.MANAGEMENT}` },
	{ pathIncludes: `/${AppScreens.SUPPORT_TICKET}`, target: `/${AppScreens.SUPPORT_FAQ}` },
	{ pathIncludes: `/${AppScreens.FEEDBACK_SUPPORT}`, target: `/${AppScreens.SUPPORT_FAQ}` },
	{ pathIncludes: `/${AppScreens.SUPPORT_FAQ}`, target: `/${AppScreens.SETTINGS}` },
	{ pathIncludes: `/${AppScreens.CAMPUS}/details`, target: `/${AppScreens.CAMPUS}` },
	{ pathIncludes: `/${AppScreens.LIST_WEEK_SCREEN}`, target: `/${AppScreens.FOOD_PLAN_WEEK}` },
	{ pathIncludes: `/${AppScreens.FOOD_PLAN_WEEK}`, target: `/${AppScreens.MANAGEMENT}` },
	{ pathIncludes: `/${AppScreens.FORMS}`, target: `/${AppScreens.FORM_CATEGORIES}` },
	{ pathIncludes: `/${AppScreens.FORM_CATEGORIES}`, target: `/${AppScreens.MANAGEMENT}` },
	// Report detail -> report list -> management (the housing analytics screens are not in AppScreens).
	{ pathIncludes: `${HOUSING_ANALYTICS_ROUTE}/`, target: HOUSING_ANALYTICS_ROUTE },
	{ pathIncludes: HOUSING_ANALYTICS_ROUTE, target: `/${AppScreens.MANAGEMENT}` },
	{ pathIncludes: '/chats/details', target: '/chats' },
];

/**
 * Resolves which screen "go back" should navigate to, based on the current
 * pathname. Returns null when the router's own back-stack should be used
 * instead (`router.back()`).
 */
function resolveGoBackTarget(pathname: string, loggedIn: boolean, canGoBack: boolean): string | null {
	// Checked before the table below since its target depends on `loggedIn`, not just the pathname.
	if (pathname.includes(`/${AppScreens.HOUSING_DELETE_USER}`)) {
		return loggedIn ? `/${AppScreens.SETTINGS}` : `/${AppScreens.LOGIN}`;
	}

	const matchedRule = GO_BACK_TARGET_RULES.find(rule => pathname.includes(rule.pathIncludes));
	if (matchedRule) {
		return matchedRule.target;
	}

	if (canGoBack) {
		return null;
	}
	return loggedIn ? `/${AppScreens.FOOD_OFFERS}` : `/${AppScreens.LOGIN}`;
}

const CustomStackHeader: React.FC<CustomStackHeaderProps> = ({ label, rightElement }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const router = useRouter();
	const pathname = usePathname();
	const { loggedIn } = useAppSelector(state => state.authReducer);
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

	const handleGoback = () => {
		const target = resolveGoBackTarget(pathname, loggedIn, router.canGoBack());
		if (target) {
			router.navigate(target);
		} else {
			router.back();
		}
	};

	useEffect(() => {
		const handleResize = () => {
			setScreenWidth(Dimensions.get('window').width);
		};

		const subscription = Dimensions.addEventListener('change', handleResize);

		return () => subscription?.remove();
	}, []);

	const mediumScreenHeadingLength = screenWidth > 700 ? 80 : 22;
	const headingMaxLength = screenWidth > 900 ? 100 : mediumScreenHeadingLength;

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
					<CustomTooltip
						placement="top"
						trigger={makeBackTrigger(handleGoback, theme.header.text)}
					>
						<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
							<TooltipText fontSize="$sm" color={theme.tooltip.text}>
								{`${translate(TranslationKeys.navigate_back)}`}
							</TooltipText>
						</TooltipContent>
					</CustomTooltip>

					<Text style={{ ...styles.heading, color: theme.header.text }}>{excerpt(label, headingMaxLength)}</Text>
                                </View>
                                {rightElement ? <View style={styles.col2}>{rightElement}</View> : null}
                        </View>
                </View>
        );
};

export default CustomStackHeader;
