import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, Text } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

type ButtonProps = TouchableOpacityProps & {
  children?: React.ReactNode;
};

const Button: React.FC<ButtonProps> = ({ children, style, ...rest }) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity {...(rest as TouchableOpacityProps)} style={[{ padding: 6 }, style]} activeOpacity={rest.activeOpacity ?? 0.7}>
      {typeof children === 'string' || typeof children === 'number' ? (
        <Text style={{ color: theme.header.text }}>{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
};

export default Button;
