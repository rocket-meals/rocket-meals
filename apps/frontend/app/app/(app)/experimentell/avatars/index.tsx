import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { useAppSelector } from '@/redux/hooks';
import {
	MyAvatar,
	AvatarStyle,
	AvatarSize,
	SettingsList,
	SettingsListGroupTitle,
	useAvatarEditorModal,
	AvatarConfig,
} from 'repo-depkit-common-ui';

const DEFAULT_CONFIG: AvatarConfig = {
	seed: 'John Doe',
	style: AvatarStyle.LORELEI,
	size: AvatarSize.LARGE,
};

const AvatarsScreen = () => {
	useSetPageTitle(TranslationKeys.avatars);
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { primaryColor } = useAppSelector((state) => state.settings);
	const { showAvatarEditor } = useAvatarEditorModal();

	const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(DEFAULT_CONFIG);

	const handleOpenEditor = () => {
		showAvatarEditor(avatarConfig, (updatedConfig) => {
			setAvatarConfig(updatedConfig);
		}, {
			title: translate(TranslationKeys.avatars),
			accentColor: primaryColor,
		});
	};

	return (
		<ScrollView
			style={{ flex: 1, backgroundColor: theme.screen.background }}
			contentContainerStyle={{ backgroundColor: theme.screen.background }}
		>
			<View style={styles.content}>
				<Text style={[styles.heading, { color: theme.screen.text }]}>
					{translate(TranslationKeys.avatars)}
				</Text>

				<View style={styles.avatarContainer}>
					<MyAvatar
						seed={avatarConfig.seed}
						style={avatarConfig.style}
						size={avatarConfig.size}
						borderRadius={avatarConfig.size / 2}
						options={avatarConfig.options}
					/>
				</View>

				<SettingsListGroupTitle title={translate(TranslationKeys.avatars)} />
				<SettingsList
					title={translate(TranslationKeys.avatar_style)}
					value={avatarConfig.style}
					onPress={handleOpenEditor}
					iconBgColor={primaryColor}
					groupPosition="single"
				/>
			</View>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	content: {
		width: '100%',
		padding: 20,
	},
	heading: {
		fontSize: 24,
		fontFamily: 'Poppins_700Bold',
		marginVertical: 10,
	},
	avatarContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 24,
	},
});

export default AvatarsScreen;
