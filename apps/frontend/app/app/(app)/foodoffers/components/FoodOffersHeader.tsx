import React, { memo } from 'react';
import { View, Text, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome6, Entypo, MaterialCommunityIcons } from '@expo/vector-icons';
import { CustomTooltip, TooltipContent, TooltipText } from '@/components/CustomTooltip';
import { useNavigation, useRouter } from 'expo-router';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import IconButton from '@/components/UI/IconButton';
import { TranslationKeys } from '@/locales/keys';
import { excerpt } from '@/constants/HelperFunctions';
import { isWeb } from '@/constants/Constants';
import styles from '../styles';
import { RootDrawerParamList } from '../types';
import { DatabaseTypes } from 'repo-depkit-common';

interface FoodOffersHeaderProps {
    drawerPosition: 'left' | 'right';
    hasUnreadChats: boolean;
    selectedCanteen: DatabaseTypes.Canteens | null;
    selectedDate: string;
    profile: any;
    appSettings: any;
    openSheet: (sheet: any, props?: Record<string, any>) => void;
    openUtilizationModal: (date: string, canteen: any) => void;
}

const FoodOffersHeader: React.FC<FoodOffersHeaderProps> = ({
    drawerPosition,
    hasUnreadChats,
    selectedCanteen,
    selectedDate,
    profile,
    appSettings,
    openSheet,
    openUtilizationModal,
}) => {
    const { theme } = useTheme();
    const { translate } = useLanguage();
    const router = useRouter();
    const drawerNavigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
    const { width: screenWidth } = useWindowDimensions();

    const getPriceGroup = (price_group: string) => {
        if (price_group) {
            return `price_group_${price_group?.toLocaleLowerCase()}`;
        }
        return '';
    };

    const iconPaddingStyle = isWeb && screenWidth >= 500 ? styles.paddingMedium : styles.paddingSmall;
    const arrowPaddingStyle = isWeb && screenWidth >= 500 ? styles.paddingArrowMedium : styles.paddingArrowSmall;
    const col2GapStyle = isWeb ? (screenWidth < 500 ? styles.colGapSmall : styles.colGapMedium) : styles.colGapTiny;
    const col2GapStyle2 = isWeb && screenWidth < 500 ? styles.colGapLarge : styles.colGapMedium;

    const rowStyle = [styles.row, drawerPosition === 'right' && styles.rowReverse];
    const col1Style = [styles.col1, drawerPosition === 'right' && styles.rowReverse];

    return (
        <View
            style={[
                styles.header,
                { backgroundColor: theme.header.background }
            ]}
        >
            <View style={rowStyle}>
                <View style={col1Style}>
                    <CustomTooltip
                        placement="top"
                        trigger={triggerProps => (
                            <IconButton {...triggerProps} onPress={() => drawerNavigation.toggleDrawer()} style={iconPaddingStyle}>
                                <Ionicons name="menu" size={24} color={theme.header.text} />
                                {hasUnreadChats ? (
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
                            </IconButton>
                        )}
                    >
                        <TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
                            <TooltipText fontSize="$sm" color={theme.tooltip.text}>
                                {`${translate(TranslationKeys.open_drawer)}`}
                            </TooltipText>
                        </TooltipContent>
                    </CustomTooltip>

                    <TouchableOpacity
                        onPress={() => openSheet('canteen')}
                        activeOpacity={0.7}
                        style={iconPaddingStyle}
                    >
                        <Text style={[styles.heading, { color: theme.header.text }]}>
                            {excerpt(String(selectedCanteen?.alias), screenWidth > 800 ? 30 : 10) || 'Food Offers'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={[styles.col2, col2GapStyle, drawerPosition === 'right' && styles.rowReverse]}>
                    <CustomTooltip
                        placement="top"
                        trigger={triggerProps => (
                            <IconButton {...triggerProps} onPress={() => openSheet('sort')} style={iconPaddingStyle}>
                                <MaterialIcons name="sort" size={24} color={theme.header.text} />
                            </IconButton>
                        )}
                    >
                        <TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
                            <TooltipText fontSize="$sm" color={theme.tooltip.text}>
                                {`${translate(TranslationKeys.sort)}: ${translate(TranslationKeys.foods)}`}
                            </TooltipText>
                        </TooltipContent>
                    </CustomTooltip>

                    <CustomTooltip
                        placement="top"
                        trigger={triggerProps => (
                            <IconButton {...triggerProps} onPress={() => router.navigate('/price-group')} style={iconPaddingStyle}>
                                <FontAwesome6 name="euro-sign" size={24} color={theme.header.text} />
                            </IconButton>
                        )}
                    >
                        <TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
                            <TooltipText fontSize="$sm" color={theme.tooltip.text}>
                                {`${translate(TranslationKeys.edit)}: ${translate(TranslationKeys.price_group)} ${translate(getPriceGroup(profile?.price_group || ''))}`}
                            </TooltipText>
                        </TooltipContent>
                    </CustomTooltip>

                    <CustomTooltip
                        placement="top"
                        trigger={triggerProps => (
                            <IconButton {...triggerProps} onPress={() => router.navigate('/eating-habits')} style={iconPaddingStyle}>
                                <Ionicons name="bag-add" size={24} color={theme.header.text} />
                            </IconButton>
                        )}
                    >
                        <TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
                            <TooltipText fontSize="$sm" color={theme.tooltip.text}>
                                {` ${translate(TranslationKeys.eating_habits)}: ${translate(TranslationKeys.edit)}`}
                            </TooltipText>
                        </TooltipContent>
                    </CustomTooltip>

                    <CustomTooltip
                        placement="top"
                        trigger={triggerProps => (
                            <IconButton {...triggerProps} onPress={() => openSheet('canteen')} style={iconPaddingStyle}>
                                <MaterialIcons name="restaurant-menu" size={24} color={theme.header.text} />
                            </IconButton>
                        )}
                    >
                        <TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
                            <TooltipText fontSize="$sm" color={theme.tooltip.text}>
                                {` ${translate(TranslationKeys.canteen)}: ${translate(TranslationKeys.select)}`}
                            </TooltipText>
                        </TooltipContent>
                    </CustomTooltip>
                </View>
            </View>

            <View style={styles.row}>
                <View style={[styles.col2, col2GapStyle2]}>
                    <CustomTooltip
                        placement="top"
                        trigger={triggerProps => (
                            <IconButton
                                {...triggerProps}
                                onPress={() => openSheet('calendar', { updateGlobal: true })}
                                style={arrowPaddingStyle}
                            >
                                <MaterialIcons name="calendar-month" size={24} color={theme.header.text} />
                            </IconButton>
                        )}
                    >
                        <TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
                            <TooltipText fontSize="$sm" color={theme.tooltip.text}>
                                {` ${translate(TranslationKeys.edit)}: ${translate(TranslationKeys.date)}: ${selectedDate}`}
                            </TooltipText>
                        </TooltipContent>
                    </CustomTooltip>
                </View>

                <View style={[styles.col2, styles.colGapMedium]}>
                    {appSettings?.utilization_display_enabled && (
                        <CustomTooltip
                            placement="top"
                            trigger={triggerProps => (
                                <IconButton
                                    {...triggerProps}
                                    onPress={() => openUtilizationModal(selectedDate, selectedCanteen)}
                                    style={arrowPaddingStyle}
                                >
                                    <FontAwesome6 name="people-group" size={24} color={theme.header.text} />
                                </IconButton>
                            )}
                        >
                            <TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
                                <TooltipText fontSize="$sm" color={theme.tooltip.text}>
                                    {` ${translate(TranslationKeys.forecast)}: ${translate(TranslationKeys.utilization)}`}
                                </TooltipText>
                            </TooltipContent>
                        </CustomTooltip>
                    )}

                    <CustomTooltip
                        placement="top"
                        trigger={triggerProps => (
                            <IconButton {...triggerProps} onPress={() => openSheet('hours')} style={arrowPaddingStyle}>
                                <MaterialCommunityIcons name="clock-time-eight" size={24} color={theme.header.text} />
                            </IconButton>
                        )}
                    >
                        <TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
                            <TooltipText fontSize="$sm" color={theme.tooltip.text}>
                                {` ${translate(TranslationKeys.businesshours)}`}
                            </TooltipText>
                        </TooltipContent>
                    </CustomTooltip>
                </View>
            </View>
        </View>
    );
};

export default memo(FoodOffersHeader);
