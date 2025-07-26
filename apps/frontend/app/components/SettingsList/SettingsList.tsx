import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';
import { myContrastColor } from '@/helper/colorHelper';
import { SettingsListProps } from './types';

const SettingsList: React.FC<SettingsListProps> = ({
  leftIcon,
  title,
  value,
  rightElement,
  onPress,
  iconBackgroundColor,
  showSeparator = true,
}) => {
  const { theme } = useTheme();
  const { primaryColor, selectedTheme } = useSelector(
    (state: RootState) => state.settings
  );

  const Container: any = onPress ? TouchableOpacity : View;
  const iconBg = iconBackgroundColor || primaryColor;
  const iconColor = myContrastColor(iconBg, theme, selectedTheme === 'dark');

  return (
    <>
      <Container
        onPress={onPress}
        style={[
          styles.container,
          { backgroundColor: theme.screen.iconBg } as ViewStyle,
        ]}
      >
        <View style={[styles.iconWrapper, { backgroundColor: iconBg }]}> 
          {React.isValidElement(leftIcon)
            ? React.cloneElement(leftIcon, { color: iconColor })
            : leftIcon}
        </View>
        <View style={styles.textWrapper}>
          <Text style={[styles.title, { color: theme.screen.text } as TextStyle]}>
            {title}
          </Text>
          {value ? (
            <Text style={[styles.value, { color: theme.screen.text } as TextStyle]}>
              {value}
            </Text>
          ) : null}
        </View>
        {rightElement ? <View style={styles.rightWrapper}>{rightElement}</View> : null}
      </Container>
      {showSeparator && (
        <View
          style={[
            styles.separator,
            { backgroundColor: theme.screen.background, marginLeft: 54 },
          ]}
        />
      )}
    </>
  );
};

export default SettingsList;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
  value: {
    fontSize: 13,
  },
  rightWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  separator: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
  },
});
