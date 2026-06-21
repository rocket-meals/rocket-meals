import { Text, TouchableOpacity, View } from 'react-native';
import React from 'react';
import { isWeb } from '@/constants/Constants';
import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import styles from './styles';
import { useNavigation } from 'expo-router';
import { CustomMenuHeaderProps, DrawerParamList } from './types';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useAppSelector } from '@/redux/hooks';
import { CustomTooltip, TooltipContent, TooltipText } from '@/components/CustomTooltip';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { TestIds } from '@/constants/TestIds';
import useChatUnreadStatus from '@/hooks/useChatUnreadStatus';
import useActiveCollectibleEvent from '@/hooks/useActiveCollectibleEvent';

const CustomMenuHeader: React.FC<CustomMenuHeaderProps> = ({ label }) => {
	const { theme } = useTheme();
        const { translate } = useLanguage();
        const { drawerPosition } = useAppSelector((state) => state.settings);
        const { hasUnreadChats } = useChatUnreadStatus();
        const { hasActiveCollectibleEvent } = useActiveCollectibleEvent();
        const navigation = useNavigation<DrawerNavigationProp<DrawerParamList>>();

        const showNotificationDot = hasUnreadChats || hasActiveCollectibleEvent;

        return (
		<View
			style={{
				...styles.header,
				backgroundColor: theme.header.background,
				paddingHorizontal: isWeb ? 20 : 10,
			}}
		>
			<View style={styles.row}>
				<View
					style={[
						styles.col1,
						drawerPosition === 'right'
							? {
									justifyContent: 'flex-start',
									flexDirection: 'row-reverse',
								}
							: { justifyContent: 'flex-start', flexDirection: 'row' },
					]}
				>
					<CustomTooltip
						placement="top"
						trigger={triggerProps => (
                                                        <TouchableOpacity
                                                                {...triggerProps}
                                                                onPress={() => navigation.toggleDrawer()}
                                                                style={styles.menuButton}
                                                                testID={TestIds.OPEN_DRAWER_BUTTON}
                                                        >
                                                                <View style={styles.menuIconWrapper}>
                                                                        <Ionicons name="menu" size={24} color={theme.header.text} />
                                                                        {showNotificationDot ? (
                                                                                <View
                                                                                        style={[
                                                                                                styles.notificationDot,
                                                                                                {
                                                                                                        backgroundColor: theme.accent,
                                                                                                        borderColor: theme.header.background,
                                                                                                },
                                                                                        ]}
                                                                                />
                                                                        ) : null}
                                                                </View>
                                                        </TouchableOpacity>
                                                )}
                                        >
						<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
							<TooltipText fontSize="$sm" color={theme.tooltip.text}>
								{`${translate(TranslationKeys.open_drawer)}`}
							</TooltipText>
						</TooltipContent>
					</CustomTooltip>

					<Text style={{ ...styles.heading, color: theme.header.text }}>{label}</Text>
				</View>
			</View>
		</View>
	);
};

export default CustomMenuHeader;
