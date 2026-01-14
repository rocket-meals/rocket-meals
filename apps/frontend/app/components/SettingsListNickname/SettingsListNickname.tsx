// Hinweis: Wenn neue SettingsList-Komponenten entstehen, bitte auch im Experimental-Screen hinzufügen.
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import SettingsListTextInput from '@/components/SettingsListTextInput';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';

import { SettingsListNicknameProps } from './types';

const SettingsListNickname: React.FC<SettingsListNicknameProps> = ({ initialValue, onSave }) => {
        const { translate } = useLanguage();
        const [value, setValue] = useState(initialValue ?? '');

        useEffect(() => {
                setValue(initialValue ?? '');
        }, [initialValue]);

        const trimmedValue = useMemo(() => value?.trim?.() ?? '', [value]);

        const disableSave = useMemo(
                () => trimmedValue === (initialValue?.trim?.() ?? ''),
                [initialValue, trimmedValue]
        );

        const handleSave = useCallback(() => onSave(trimmedValue), [onSave, trimmedValue]);

	return (
		<SettingsListTextInput
			label={translate(TranslationKeys.nickname)}
			value={value}
			placeholder={translate(TranslationKeys.nickname)}
			saveLabel={translate(TranslationKeys.save)}
			onSave={handleSave}
			initialValue={value}
			checkTextInput={currentValue => ({
				isValid: true,
				value: currentValue.trim(),
			})}
			groupPosition="single"
		/>
	);
};

export default SettingsListNickname;
