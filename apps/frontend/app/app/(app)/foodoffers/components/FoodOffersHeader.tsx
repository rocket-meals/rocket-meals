import React, { memo } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons, Entypo } from '@expo/vector-icons';
import { CustomTooltip, TooltipContent, TooltipText } from '@/components/CustomTooltip';
import { useNavigation } from 'expo-router';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import IconButton from '@/components/UI/IconButton';
import { TranslationKeys } from '@/locales/keys';
import { ComponentIds } from '@/constants/ComponentIds';
import { excerpt } from '@/constants/HelperFunctions';
import { isWeb } from '@/constants/Constants';
import styles from '../styles';
import { RootDrawerParamList } from '../types';
import { DatabaseTypes } from 'repo-depkit-common';

interface FoodOffersHeaderProps {
    drawerPosition: 'left' | 'right';
    hasUnreadChats: boolean;
    selectedCanteen: DatabaseTypes.Canteens | null;
    openSheet: (sheet: any, props?: Record<string, any>) => void;
    openOptionsModal: () => void;
}

const FoodOffersHeader: React.FC<FoodOffersHeaderProps> = ({
    drawerPosition,
    hasUnreadChats,
    selectedCanteen,
    openSheet,
    openOptionsModal,
}) => {
    const { theme } = useTheme();
    const { translate } = useLanguage();
    const drawerNavigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
    const { width: screenWidth } = useWindowDimensions();

    const iconPaddingStyle = isWeb && screenWidth >= 500 ? styles.paddingMedium : styles.paddingSmall;

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
                            <IconButton {...triggerProps} onPress={() => drawerNavigation.toggleDrawer()} style={iconPaddingStyle} nativeID={ComponentIds.OPEN_DRAWER}>
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

                <View style={[styles.col2, drawerPosition === 'right' && styles.rowReverse]}>
                    <CustomTooltip
                        placement="top"
                        trigger={triggerProps => (
                            <IconButton {...triggerProps} onPress={openOptionsModal} style={iconPaddingStyle}>
                                <Entypo name="dots-three-vertical" size={22} color={theme.header.text} />
                            </IconButton>
                        )}
                    >
                        <TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
                            <TooltipText fontSize="$sm" color={theme.tooltip.text}>
                                {translate(TranslationKeys.more_options)}
                            </TooltipText>
                        </TooltipContent>
                    </CustomTooltip>
                </View>
            </View>
        </View>
    );
};

export default memo(FoodOffersHeader);
