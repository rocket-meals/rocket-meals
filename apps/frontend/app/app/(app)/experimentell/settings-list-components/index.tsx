import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppSelector } from '@/redux/hooks';

import { useTheme } from '@/hooks/useTheme';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import SettingsList from '@/components/SettingsList';
import SettingsListEditable from '@/components/SettingsListEditable';
import SettingsListDate from '@/components/SettingsListDate';
import SettingsListBoolean from '@/components/SettingsListBoolean/SettingsListBoolean';
import SettingsListTextInput from '@/components/SettingsListTextInput';
import SettingsListNickname from '@/components/SettingsListNickname';
import SettingsListCoordinate from '@/components/SettingsListCoordinate/SettingsListCoordinate';
import SettingsListLikeDislike from '@/components/SettingsListLikeDislike';
import { useLanguage } from '@/hooks/useLanguage';
import { useIsLtrLanguage } from '@/hooks/useIsLtrLanguage';
import { TranslationKeys } from '@/locales/keys';
import styles from './styles';

const SettingsListComponents = () => {
	const { translate } = useLanguage();
	useSetPageTitle(TranslationKeys.settings_list_components);
	const { theme } = useTheme();
	const isLtrLanguage = useIsLtrLanguage();
	const isArabic = !isLtrLanguage;
	const { primaryColor } = useAppSelector((state) => state.settings);
	const [dateValue, setDateValue] = useState('01.01.2024');
	const [dateError, setDateError] = useState('');
	const [inputValue, setInputValue] = useState(translate(TranslationKeys.example_value));
	const [nickname, setNickname] = useState('Tester');
	const [boolValue, setBoolValue] = useState(true);
	const [likeValue, setLikeValue] = useState<boolean | null>(null);

	return (
		<ScrollView
			style={{ ...styles.container, backgroundColor: theme.screen.background }}
			contentContainerStyle={{
				...styles.contentContainer,
				backgroundColor: theme.screen.background,
			}}
		>
			<View style={styles.content}>
				<Text style={{ ...styles.heading, color: theme.screen.text }}>{translate(TranslationKeys.settings_list_components)}</Text>

				<Text style={{ ...styles.sectionTitle, color: theme.screen.text }}>{translate(TranslationKeys.settings_list_account_required)}</Text>
			<SettingsList
				iconBgColor={primaryColor}
				title={translate(TranslationKeys.account_function)}
				value={translate(TranslationKeys.login_required)}
				isAccountRequired
				groupPosition="single"
			/>

			<Text style={{ ...styles.sectionTitle, color: theme.screen.text }}>{translate(TranslationKeys.settings)}</Text>
				<SettingsList
					iconBgColor={primaryColor}
					leftIcon={<MaterialCommunityIcons name="format-list-text" size={24} color={theme.screen.icon} />}
					title={translate(TranslationKeys.settings_list_title)}
					value={translate(TranslationKeys.example_value)}
					groupPosition="single"
				/>
				<Text style={{ ...styles.sectionTitle, color: theme.screen.text }}>{translate(TranslationKeys.settings_list_check)}</Text>
				<SettingsList
					iconBgColor={primaryColor}
					leftIcon={<MaterialCommunityIcons name="format-list-text" size={24} color={theme.screen.icon} />}
					title="Dies ist ein extrem langer Titel, der in dieser Zeile nicht vollständig angezeigt werden kann."
					value="Auch dieser sehr lange Wert sollte ordentlich umgebrochen werden, damit alles lesbar bleibt."
					groupPosition="single"
				/>

				<Text style={{ ...styles.sectionTitle, color: theme.screen.text }}>{translate(TranslationKeys.edit)}</Text>
				<SettingsListEditable
					iconBgColor={primaryColor}
					leftIcon={<MaterialCommunityIcons name="pencil" size={24} color={theme.screen.icon} />}
					label={translate(TranslationKeys.editable_label)}
					value={translate(TranslationKeys.tap_to_edit)}
					groupPosition="single"
				/>

				<Text style={{ ...styles.sectionTitle, color: theme.screen.text }}>{translate(TranslationKeys.date)}</Text>
				<SettingsListDate
					id="test-date"
					value={dateValue}
					onChange={(_id, value, _customType) => setDateValue(value)}
					onError={(_id, error) => setDateError(error)}
					error={dateError}
					custom_type="date"
					label={translate(TranslationKeys.date)}
					iconBgColor={primaryColor}
					leftIcon={<MaterialCommunityIcons name="calendar" size={24} color={theme.screen.icon} />}
					groupPosition="single"
				/>

				<Text style={{ ...styles.sectionTitle, color: theme.screen.text }}>{translate(TranslationKeys.boolean_setting)}</Text>
				<SettingsListBoolean
					iconBgColor={primaryColor}
					leftIcon={<MaterialCommunityIcons name="toggle-switch-outline" size={24} color={theme.screen.icon} />}
					label={translate(TranslationKeys.boolean_setting)}
					isEnabled={boolValue}
					onToggle={() => setBoolValue(current => !current)}
					groupPosition="single"
				/>

				<Text style={{ ...styles.sectionTitle, color: theme.screen.text }}>{translate(TranslationKeys.input_label)}</Text>
				<SettingsListTextInput
					label={translate(TranslationKeys.input_label)}
					value={inputValue}
					placeholder={translate(TranslationKeys.input_label)}
					saveLabel={translate(TranslationKeys.save)}
					onSave={value => setInputValue(value.trim())}
					checkTextInput={value => ({
						isValid: value.trim().length > 0,
						value: value.trim(),
					})}
					groupPosition="single"
				/>

				<Text style={{ ...styles.sectionTitle, color: theme.screen.text, textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }}>{translate(TranslationKeys.nickname)}</Text>
				<SettingsListNickname groupPosition="single" />

				<Text style={{ ...styles.sectionTitle, color: theme.screen.text }}>{translate(TranslationKeys.coordinates)}</Text>
				<SettingsListCoordinate
					iconBgColor={primaryColor}
					location={{ latitude: 51.4556, longitude: 7.0116 }}
					groupPosition="single"
					reverseLayout={isArabic}
				/>

				<Text style={{ ...styles.sectionTitle, color: theme.screen.text }}>{translate(TranslationKeys.like_dislike_demo)}</Text>
				<SettingsList
					iconBgColor={primaryColor}
					leftIcon={<MaterialCommunityIcons name="thumb-up-outline" size={24} color={theme.screen.icon} />}
					title={translate(TranslationKeys.like_dislike_demo)}
					rightElement={
						<SettingsListLikeDislike
							like={likeValue}
							onPressLike={() => setLikeValue(current => (current === true ? null : true))}
							onPressDislike={() => setLikeValue(current => (current === false ? null : false))}
							likeTooltipText={translate(TranslationKeys.i_like_that)}
							dislikeTooltipText={translate(TranslationKeys.i_dislike_that)}
						/>
					}
					groupPosition="single"
				/>
			</View>
		</ScrollView>
	);
};

export default SettingsListComponents;
