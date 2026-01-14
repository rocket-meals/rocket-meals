import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useSelector } from 'react-redux';
import { useTheme } from '@/hooks/useTheme';
import { RootState } from '@/redux/reducer';

type ProjectRadioElementProps = {
        selected?: boolean;
        onPress?: () => void;
        size?: number;
        style?: ViewStyle;
};

const ProjectRadioElement: React.FC<ProjectRadioElementProps> = ({ selected = false, onPress, size = 20, style }) => {
        const { theme } = useTheme();
        const { primaryColor } = useSelector((state: RootState) => state.settings);

        const Component: any = onPress ? TouchableOpacity : View;

        return (
                <Component
                        {...(onPress ? { onPress, activeOpacity: 0.7 } : {})}
                        style={[
                                styles.base,
                                {
                                        width: size,
                                        height: size,
                                        borderRadius: size / 2,
                                        borderColor: selected ? primaryColor : theme.screen.icon,
                                },
                                style,
                        ]}
                >
                        {selected ? (
                                <View
                                        style={[
                                                styles.inner,
                                                {
                                                        width: size / 2,
                                                        height: size / 2,
                                                        borderRadius: size / 4,
                                                        backgroundColor: primaryColor,
                                                },
                                        ]}
                                />
                        ) : null}
                </Component>
        );
};

export default ProjectRadioElement;

const styles = StyleSheet.create({
        base: {
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
        },
        inner: {
                alignItems: 'center',
                justifyContent: 'center',
        },
});
