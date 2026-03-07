import React, { memo, useMemo } from 'react';
import { View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { TranslationKeys } from '@/locales/keys';
import SettingsListBoolean from '@/components/SettingsListBoolean';
import styles from '../styles';

interface NotificationSectionProps {
    theme: any;
    containerWidth: string | number;
    translate: (key: string) => string;
    previousFeedback: any;
    updateNotification: () => void;
    foodsAreaColor: string;
}

const NotificationSection = ({
    theme,
    containerWidth,
    translate,
    previousFeedback,
    updateNotification,
    foodsAreaColor,
}: NotificationSectionProps) => {
    const isNotifyEnabled = !!previousFeedback?.notify;

    const containerStyle = useMemo(() => ({
        width: containerWidth as any,
    }), [containerWidth]);

    const bellIcon = useMemo(() => (
        <MaterialIcons
            name={isNotifyEnabled ? 'notifications-active' : 'notifications-off'}
            size={24}
        />
    ), [isNotifyEnabled]);

    return (
        <View style={[styles.marginTopMedium, containerStyle]}>
            <SettingsListBoolean
                leftIcon={bellIcon}
                iconBgColor={foodsAreaColor}
                title={translate(TranslationKeys.GET_NOTIFICATION_ON_AVAILABILITY)}
                isEnabled={isNotifyEnabled}
                onToggle={updateNotification}
                valueActive={translate(TranslationKeys.active)}
                valueInactive={translate(TranslationKeys.inactive)}
                showSeparator={false}
                groupPosition="single"
                isAccountRequired={true}
            />
        </View>
    );
};

export default memo(NotificationSection, (prevProps, nextProps) => {
    return (
        prevProps.theme === nextProps.theme &&
        prevProps.containerWidth === nextProps.containerWidth &&
        prevProps.previousFeedback === nextProps.previousFeedback &&
        prevProps.foodsAreaColor === nextProps.foodsAreaColor
    );
});
