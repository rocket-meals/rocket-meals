import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';
import { useTheme } from '@/hooks/useTheme';
import { myContrastColor } from '@/helper/colorHelper';
import styles from './styles';
import type { AppButtonProps } from './types';

const AppButton: React.FC<AppButtonProps> = ({
  label,
  onPress,
  icon,
  style,
  labelStyle,
  backgroundColor,
  textColor,
  disabled,
  useProjectColor = false,
}) => {
  const { theme } = useTheme();
  const { primaryColor, selectedTheme: mode } = useSelector(
    (state: RootState) => state.settings
  );

  const flattenedStyle = StyleSheet.flatten(style) || {};
  const flattenedLabelStyle = StyleSheet.flatten(labelStyle) || {};

  const bgColor =
    backgroundColor ??
    flattenedStyle.backgroundColor ??
    (useProjectColor ? primaryColor : undefined);
  const color =
    textColor ??
    flattenedLabelStyle.color ??
    (useProjectColor ? myContrastColor(bgColor || primaryColor, theme, mode === 'dark') : undefined);

  return (
    <TouchableOpacity
      style={[styles.container, style, { backgroundColor: bgColor }]}
      onPress={onPress}
      disabled={disabled}
    >
      {icon}
      <Text style={[styles.label, labelStyle, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
};

export default AppButton;
