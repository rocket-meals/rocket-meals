import React, { memo } from 'react';
import { View, Text } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { CustomTooltip, TooltipContent, TooltipText } from '@/components/CustomTooltip';
import IconButton from '@/components/UI/IconButton';
import { TranslationKeys } from '@/locales/keys';
import styles from '../styles';
import { isWeb } from '@/constants/Constants';
import { TestIds } from '@/constants/TestIds';

interface CampusHeaderProps {
    theme: any;
    translate: (key: string) => string;
    onToggleDrawer: () => void;
    onSort: () => void;
    drawerPosition: 'left' | 'right' | 'system' | undefined; // Added 'system'
}

const CampusHeader: React.FC<CampusHeaderProps> = ({
    theme,
    translate,
    onToggleDrawer,
    onSort,
    drawerPosition,
}) => {
    // 'system' usually defaults to 'left' for LTR languages, but let's check how it's used.
    // In the original code: flexDirection: drawerPosition === 'right' ? 'row-reverse' : 'row'
    // So 'system' will fall back to 'row' (left) which is correct.

    return (
        <View style={{ ...styles.header, backgroundColor: theme.header.background, paddingHorizontal: isWeb ? 20 : 10 }}>
            <View style={[styles.row, { flexDirection: drawerPosition === 'right' ? 'row-reverse' : 'row' }]}>
                <View style={[styles.col1, { flexDirection: drawerPosition === 'right' ? 'row-reverse' : 'row' }]}>
                    <CustomTooltip
                        placement="top"
                        trigger={triggerProps => (
                            <IconButton {...triggerProps} onPress={onToggleDrawer} style={{ padding: 10 }} testID={TestIds.OPEN_DRAWER_BUTTON}>
                                <Ionicons name="menu" size={24} color={theme.header.text} />
                            </IconButton>
                        )}
                    >
                        <TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
                            <TooltipText fontSize="$sm" color={theme.tooltip.text}>
                                {`${translate(TranslationKeys.open_drawer)}`}
                            </TooltipText>
                        </TooltipContent>
                    </CustomTooltip>

                    <Text style={{ ...styles.heading, color: theme.header.text }}>{translate(TranslationKeys.campus)}</Text>
                </View>

                <View style={{ ...styles.col2, gap: isWeb ? 30 : 15 }}>
                    <CustomTooltip
                        placement="top"
                        trigger={triggerProps => (
                            <IconButton {...triggerProps} onPress={onSort} style={{ padding: 10 }}>
                                <MaterialIcons name="sort" size={24} color={theme.header.text} />
                            </IconButton>
                        )}
                    >
                        <TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
                            <TooltipText fontSize="$sm" color={theme.tooltip.text}>
                                {`${translate(TranslationKeys.sort)}: ${translate(TranslationKeys.buildings)}`}
                            </TooltipText>
                        </TooltipContent>
                    </CustomTooltip>
                </View>
            </View>
        </View>
    );
};

export default memo(CampusHeader);
