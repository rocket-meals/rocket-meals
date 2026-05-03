import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppSelector } from '@/redux/hooks';

import { useTheme } from '@/hooks/useTheme';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { useLanguage } from '@/hooks/useLanguage';
import SettingsList from '@/components/SettingsList';
import SettingsListEditable from '@/components/SettingsListEditable';
import SettingsListDate from '@/components/SettingsListDate';
import SettingsListBoolean from '@/components/SettingsListBoolean/SettingsListBoolean';
import SettingsListTextInput from '@/components/SettingsListTextInput';
import SettingsListNickname from '@/components/SettingsListNickname';
import SettingsListCoordinate from '@/components/SettingsListCoordinate/SettingsListCoordinate';
import SettingsListLikeDislike from '@/components/SettingsListLikeDislike';
import { TranslationKeys } from '@/locales/keys';
import styles from './styles';
import useIsLtrLanguage from '@/hooks/useIsLtrLanguage';

const SettingsListComponents = () => {
	const { translate } = useLanguage();
	useSetPageTitle(translate(TranslationKeys.settings_list_components));
	const { theme } = useTheme();
	const { primaryColor } = useAppSelector((state) => state.settings);
	const { language } = useLanguage();
	const isLtrLanguage = useIsLtrLanguage();
	const isArabic = !isLtrLanguage;
	const [dateValue, setDateValue] = useState('01.01.2024');
	const [dateError, setDateError] = useState('');
	const [inputValue, setInputValue] = useState(translate(TranslationKeys.settingsListExampleText));
	const [nickname, setNickname] = useState(translate(TranslationKeys.settingsListExampleNickname));
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
				<Text style={{ ...styles.heading, color: theme.screen.text, textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }}>
					{translate(TranslationKeys.settings_list_components)}
				</Text>

				<Text style={{ ...styles.sectionTitle, color: theme.screen.text, textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }}>
					{translate(TranslationKeys.settings_list_is_account_required)}
				</Text>
			<SettingsList
				iconBgColor={primaryColor}
				title={translate(TranslationKeys.account_function)}
				value={translate(TranslationKeys.login_required)}
				isAccountRequired
				groupPosition="single"
			/>

			<Text style={{ ...styles.sectionTitle, color: theme.screen.text, textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }}>{translate(TranslationKeys.settings_list)}</Text>
				<SettingsList
					iconBgColor={primaryColor}
					leftIcon={<MaterialCommunityIcons name="format-list-text" size={24} color={theme.screen.icon} />}
					title={translate(TranslationKeys.settings_list_title)}
					value={translate(TranslationKeys.example_value)}
					groupPosition="single"
				/>
				<Text style={{ ...styles.sectionTitle, color: theme.screen.text, textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }}>{translate(TranslationKeys.settings_list_check)}</Text>
				<SettingsList
					iconBgColor={primaryColor}
					leftIcon={<MaterialCommunityIcons name="format-list-text" size={24} color={theme.screen.icon} />}
					title={translate(TranslationKeys.extremely_long_title_example)}
					value={translate(TranslationKeys.extremely_long_value_example)}
					groupPosition="single"
				/>

				<Text style={{ ...styles.sectionTitle, color: theme.screen.text, textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }}>{translate(TranslationKeys.settings_list_editable)}</Text>
				<SettingsListEditable
					iconBgColor={primaryColor}
					leftIcon={<MaterialCommunityIcons name="pencil" size={24} color={theme.screen.icon} />}
					label={translate(TranslationKeys.editable)}
					value={translate(TranslationKeys.tap_to_edit)}
					groupPosition="single"
				/>

				<Text style={{ ...styles.sectionTitle, color: theme.screen.text, textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }}>{translate(TranslationKeys.settings_list_date)}</Text>
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

				<Text style={{ ...styles.sectionTitle, color: theme.screen.text, textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }}>{translate(TranslationKeys.settings_list_boolean)}</Text>
				<SettingsListBoolean
					iconBgColor={primaryColor}
					leftIcon={<MaterialCommunityIcons name="toggle-switch-outline" size={24} color={theme.screen.icon} />}
					label={translate(TranslationKeys.boolean_setting)}
					isEnabled={boolValue}
					onToggle={() => setBoolValue(current => !current)}
					groupPosition="single"
				/>

				<Text style={{ ...styles.sectionTitle, color: theme.screen.text, textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }}>{translate(TranslationKeys.settings_list_text_input)}</Text>
				<SettingsListTextInput
					label={translate(TranslationKeys.input)}
					value={inputValue}
					placeholder={translate(TranslationKeys.input)}
					saveLabel={translate(TranslationKeys.save)}
					onSave={value => setInputValue(value.trim())}
					checkTextInput={value => ({
						isValid: value.trim().length > 0,
						value: value.trim(),
					})}
					groupPosition="single"
				/>

				<Text style={{ ...styles.sectionTitle, color: theme.screen.text, textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }}>{translate(TranslationKeys.settings_list_nickname)}</Text>
				<SettingsListNickname groupPosition="single" />
				<Text style={{ ...styles.sectionTitle, color: theme.screen.text }}>SettingsListNickname</Text>
				<SettingsListNickname />

				<Text style={{ ...styles.sectionTitle, color: theme.screen.text, textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }}>{translate(TranslationKeys.settings_list_coordinate)}</Text>
				<SettingsListCoordinate
					iconBgColor={primaryColor}
					location={{ latitude: 51.4556, longitude: 7.0116 }}
					groupPosition="single"
				/>

				<Text style={{ ...styles.sectionTitle, color: theme.screen.text, textAlign: isArabic ? 'right' : 'left', writingDirection: isArabic ? 'rtl' : 'ltr' }}>{translate(TranslationKeys.settings_list_like_dislike)}</Text>
				<SettingsList
					iconBgColor={primaryColor}
					leftIcon={<MaterialCommunityIcons name="thumb-up-outline" size={24} color={theme.screen.icon} />}
					title={translate(TranslationKeys.like_dislike_demo)}
					rightElement={
						<SettingsListLikeDislike
							like={likeValue}
							onPressLike={() => setLikeValue(current => (current === true ? null : true))}
							onPressDislike={() => setLikeValue(current => (current === false ? null : false))}
							likeTooltipText={translate(TranslationKeys.i_like_this)}
							dislikeTooltipText={translate(TranslationKeys.i_dont_like_this)}
						/>
					}
					groupPosition="single"
				/>
			</View>
		</ScrollView>
	);
};

export default SettingsListComponents;
