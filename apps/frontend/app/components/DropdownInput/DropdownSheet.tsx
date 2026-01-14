import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SingleLineInput from '@/components/SingleLineInput/SingleLineInput';

export interface DropdownSheetProps {
  closeSheet: () => void;
  options: string[];
  allowCustomValues: boolean;
  value: string;
  onSelectOption: (val: string) => void;
  onSelectCustom: (val: string) => void; // will pass current custom text
  onDeselect: () => void;
  isDisabled?: boolean;
  prefix?: string | null;
  suffix?: string | null;
  error?: string;
}

const ensureStringArray = (options: string[]): string[] => {
  const uniqueValues = new Set<string>();
  options.forEach(option => {
    if (option && option.trim().length > 0) {
      uniqueValues.add(option.trim());
    }
  });
  return Array.from(uniqueValues);
};

const DropdownSheet: React.FC<DropdownSheetProps> = ({ closeSheet, options, allowCustomValues, value, onSelectOption, onSelectCustom, onDeselect, isDisabled, prefix, suffix, error }) => {
  const { theme } = useTheme();
  const { translate } = useLanguage();
  const { primaryColor } = useSelector((state: RootState) => state.settings);

  const normalizedOptions = useMemo(() => ensureStringArray(options), [options]);
  const initialIsCustom = allowCustomValues && value.trim().length > 0 && !normalizedOptions.includes(value.trim());
  const [customSelected, setCustomSelected] = useState<boolean>(initialIsCustom);
  const [customValue, setCustomValue] = useState<string>(initialIsCustom ? value : '');

  useEffect(() => {
    if (!customSelected) return;
    // keep customValue in sync when value changes externally while custom is selected
    if (allowCustomValues && value.trim().length > 0 && !normalizedOptions.includes(value.trim())) {
      setCustomValue(value);
    }
  }, [value, customSelected, allowCustomValues, normalizedOptions]);

  const handleDeselect = () => {
    setCustomSelected(false);
    onDeselect();
    closeSheet();
  };

  const handleSelectCustom = () => {
    if (!allowCustomValues) return;
    setCustomSelected(true);
    // ensure customValue displayed (might be blank to allow typing)
    if (value.trim().length > 0 && !normalizedOptions.includes(value.trim())) {
      setCustomValue(value);
      onSelectCustom(value);
    } else {
      setCustomValue('');
      onSelectCustom('');
    }
  };

  const handleSelectOption = (option: string) => {
    setCustomSelected(false);
    onSelectOption(option);
    closeSheet();
  };

  console.log('[DropdownSheet] mount value=', value, ' options=', normalizedOptions);

  type Row = { kind: 'deselect' } | { kind: 'custom' } | { kind: 'customInput' } | { kind: 'option'; value: string };
  const listItems: Row[] = useMemo(() => {
    const rows: Row[] = [{ kind: 'deselect' }];
    if (allowCustomValues) {
      rows.push({ kind: 'custom' });
      if (customSelected) {
        rows.push({ kind: 'customInput' });
      }
    }
    rows.push(...normalizedOptions.map((v): Row => ({ kind: 'option', value: v })));
    return rows;
  }, [normalizedOptions, allowCustomValues, customSelected]);

  return (
    <View style={{ gap: 10 }}>
      {listItems.map((item, index) => {
        if (item.kind === 'deselect') {
          const active = !customSelected && value.trim().length === 0;
          return (
            <TouchableOpacity
              key={`deselect-${index}`}
              style={[styles.optionRow, { backgroundColor: active ? primaryColor : theme.screen.iconBg }]}
              onPress={handleDeselect}
              disabled={isDisabled}
              onPressIn={() => console.log('[DropdownSheet] deselect pressed')}
            >
              <Text style={[styles.optionLabel, { color: active ? theme.activeText : theme.screen.text }]}>
                {translate(TranslationKeys.deselect)}
              </Text>
              <MaterialCommunityIcons name={active ? 'checkbox-marked' : 'checkbox-blank-outline'} size={24} color={active ? theme.activeText : theme.screen.icon} />
            </TouchableOpacity>
          );
        }
        if (item.kind === 'custom') {
          return (
            <TouchableOpacity
              key={`custom-${index}`}
              style={[styles.optionRow, { backgroundColor: customSelected ? primaryColor : theme.screen.iconBg }]}
              onPress={handleSelectCustom}
              disabled={isDisabled}
              onPressIn={() => console.log('[DropdownSheet] select custom pressed')}
            >
              <Text style={[styles.optionLabel, { color: customSelected ? theme.activeText : theme.screen.text }]}>
                {translate(TranslationKeys.enter_custom_value)}
              </Text>
              <MaterialCommunityIcons name={customSelected ? 'checkbox-marked' : 'checkbox-blank-outline'} size={24} color={customSelected ? theme.activeText : theme.screen.icon} />
            </TouchableOpacity>
          );
        }
        if (item.kind === 'customInput') {
          return (
            <View key={`custom-input-${index}`} style={{ width: '100%', marginBottom: 2 }}>
              <SingleLineInput
                id="custom"
                value={customValue}
                onChange={(_, val) => {
                  setCustomValue(val);
                  onSelectCustom(val);
                  console.log('[DropdownSheet] custom input changed to', val);
                }}
                error={error || ''}
                isDisabled={!!isDisabled}
                custom_type="string"
                prefix={prefix}
                suffix={suffix}
                autoFocus
              />
            </View>
          );
        }
        // option
        const isSelected = !customSelected && value === item.value;
        return (
          <TouchableOpacity
            key={`option-${item.value}-${index}`}
            style={[styles.optionRow, { backgroundColor: isSelected ? primaryColor : theme.screen.iconBg }]}
            onPress={() => handleSelectOption(item.value)}
            disabled={isDisabled}
            onPressIn={() => console.log('[DropdownSheet] option pressed', item.value)}
          >
            <Text style={[styles.optionLabel, { color: isSelected ? theme.activeText : theme.screen.text }]}>{item.value}</Text>
            <MaterialCommunityIcons name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'} size={24} color={isSelected ? theme.activeText : theme.screen.icon} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default DropdownSheet;
