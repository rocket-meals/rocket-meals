import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';

import { RootState } from '@/redux/reducer';
import { useTheme } from '@/hooks/useTheme';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import SettingsList from '@/components/SettingsList';
import SettingsListEditable from '@/components/SettingsListEditable';
import SettingsListDate from '@/components/SettingsListDate';
import SettingsListBoolean from '@/components/SettingsListBoolean/SettingsListBoolean';
import SettingsListTextInput from '@/components/SettingsListTextInput';
import SettingsListNickname from '@/components/SettingsListNickname';
import SettingsListCoordinate from '@/components/SettingsListCoordinate/SettingsListCoordinate';
import styles from './styles';

const SettingsListComponents = () => {
	useSetPageTitle('SettingsList Komponenten');
	const { theme } = useTheme();
	const { primaryColor } = useSelector((state: RootState) => state.settings);
	const [dateValue, setDateValue] = useState('01.01.2024');
	const [dateError, setDateError] = useState('');
	const [inputValue, setInputValue] = useState('Beispieltext');
	const [nickname, setNickname] = useState('Tester');
	const [boolValue, setBoolValue] = useState(true);

	return (
		<ScrollView
			style={{ ...styles.container, backgroundColor: theme.screen.background }}
			contentContainerStyle={{
				...styles.contentContainer,
				backgroundColor: theme.screen.background,
			}}
		>
			<View style={styles.content}>
				<Text style={{ ...styles.heading, color: theme.screen.text }}>SettingsList Komponenten</Text>

				<Text style={{ ...styles.sectionTitle, color: theme.screen.text }}>SettingsList</Text>
				<SettingsList
					iconBgColor={primaryColor}
					leftIcon={<MaterialCommunityIcons name="format-list-text" size={24} color={theme.screen.icon} />}
					title="SettingsList Titel"
					value="Beispielwert"
					groupPosition="single"
				/>
				<Text style={{ ...styles.sectionTitle, color: theme.screen.text }}>SettingsList Check</Text>
				<SettingsList
					iconBgColor={primaryColor}
					leftIcon={<MaterialCommunityIcons name="format-list-text" size={24} color={theme.screen.icon} />}
					title="Dies ist ein extrem langer Titel, der in dieser Zeile nicht vollständig angezeigt werden kann."
					value="Auch dieser sehr lange Wert sollte ordentlich umgebrochen werden, damit alles lesbar bleibt."
					groupPosition="single"
				/>

				<Text style={{ ...styles.sectionTitle, color: theme.screen.text }}>SettingsListEditable</Text>
				<SettingsListEditable
					iconBgColor={primaryColor}
					leftIcon={<MaterialCommunityIcons name="pencil" size={24} color={theme.screen.icon} />}
					label="Bearbeitbar"
					value="Tippe zum Editieren"
					groupPosition="single"
				/>

				<Text style={{ ...styles.sectionTitle, color: theme.screen.text }}>SettingsListDate</Text>
				<SettingsListDate
					id="test-date"
					value={dateValue}
					onChange={(_id, value, _customType) => setDateValue(value)}
					onError={(_id, error) => setDateError(error)}
					error={dateError}
					custom_type="date"
					label="Datum"
					iconBgColor={primaryColor}
					leftIcon={<MaterialCommunityIcons name="calendar" size={24} color={theme.screen.icon} />}
					groupPosition="single"
				/>

				<Text style={{ ...styles.sectionTitle, color: theme.screen.text }}>SettingsListBoolean</Text>
				<SettingsListBoolean
					iconBgColor={primaryColor}
					leftIcon={<MaterialCommunityIcons name="toggle-switch-outline" size={24} color={theme.screen.icon} />}
					label="Boolean Setting"
					isEnabled={boolValue}
					onToggle={() => setBoolValue(current => !current)}
					groupPosition="single"
				/>

				<Text style={{ ...styles.sectionTitle, color: theme.screen.text }}>SettingsListTextInput</Text>
				<SettingsListTextInput
					label="Eingabe"
					value={inputValue}
					placeholder="Eingabe"
					saveLabel="Speichern"
					onSave={value => setInputValue(value.trim())}
					checkTextInput={value => ({
						isValid: value.trim().length > 0,
						value: value.trim(),
					})}
					groupPosition="single"
				/>

				<Text style={{ ...styles.sectionTitle, color: theme.screen.text }}>SettingsListNickname</Text>
				<SettingsListNickname initialValue={nickname} onSave={setNickname} />

				<Text style={{ ...styles.sectionTitle, color: theme.screen.text }}>SettingsListCoordinate</Text>
				<SettingsListCoordinate
					iconBgColor={primaryColor}
					location={{ latitude: 51.4556, longitude: 7.0116 }}
					groupPosition="single"
				/>
			</View>
		</ScrollView>
	);
};

export default SettingsListComponents;
