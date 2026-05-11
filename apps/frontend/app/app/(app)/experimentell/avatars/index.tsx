import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { useAppSelector } from '@/redux/hooks';
import { useDispatch } from 'react-redux';
import useDebugMode from '@/hooks/useDebugMode';
import {
	MyAvatar,
	AvatarStyle,
	AvatarSize,
	SettingsList,
	SettingsListGroupTitle,
	useAvatarEditorModal,
	AvatarConfig,
	AvatarPropKey,
} from 'repo-depkit-common-ui';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ProfileHelper } from '@/redux/actions/Profile/Profile';
import { UPDATE_PROFILE } from '@/redux/Types/types';
import { UserHelper } from '@/helper/UserHelper';

const profileHelper = new ProfileHelper();
const AVATAR_BACKGROUND_COLOR = '#ffffff';

const AvatarsScreen = () => {
	useSetPageTitle(TranslationKeys.avatars);
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { primaryColor } = useAppSelector((state) => state.settings);
	const { user, profile } = useAppSelector((state) => state.authReducer);
	const dispatch = useDispatch();
	const debugMode = useDebugMode();
	const { openAvatarEditor } = useAvatarEditorModal();
	const isRegisteredUser = UserHelper.isRegisteredUser(user);

	const parseProfileAvatar = (profileAvatar: unknown): AvatarConfig | null => {
		if (!profileAvatar) return null;
		if (typeof profileAvatar === 'object') return profileAvatar as AvatarConfig;
		if (typeof profileAvatar === 'string') {
			try {
				return JSON.parse(profileAvatar) as AvatarConfig;
			} catch {
				return null;
			}
		}
		return null;
	};

	const [avatarConfig, setAvatarConfig] = useState<AvatarConfig | null>(() =>
		parseProfileAvatar(profile?.avatar),
	);

	const editorOptions = {
		title: translate(TranslationKeys.avatars),
		accentColor: primaryColor,
		debugMode,
		allowedStyles: [AvatarStyle.OPEN_PEEPS],
		hiddenProps: {
			[AvatarPropKey.OpenPeeps.SCALE]: '100',
		},
	};

	const handleOpenEditor = () => {
		openAvatarEditor({
			currentAvatar: avatarConfig,
			onDone: (config) => setAvatarConfig(config),
			options: editorOptions,
		});
	};

	const handleDelete = () => {
		setAvatarConfig(null);
	};

	const handleSave = async () => {
		if (!isRegisteredUser || !profile?.id) return;
		try {
			const result = await profileHelper.updateProfile({
				...profile,
				avatar: avatarConfig,
			});
			if (result) {
				dispatch({ type: UPDATE_PROFILE, payload: result });
			}
		} catch (error) {
			console.error('[AvatarsScreen] Failed to save avatar:', error);
		}
	};

	return (
		<ScrollView
			style={{ flex: 1, backgroundColor: theme.screen.background }}
			contentContainerStyle={{ backgroundColor: theme.screen.background }}
		>
			<View style={styles.content}>
				<View style={styles.avatarContainer}>
					{avatarConfig ? (
						<MyAvatar
							config={avatarConfig}
							rounded={true}
							backgroundColor={AVATAR_BACKGROUND_COLOR}
						/>
					) : (
						<View style={[styles.placeholderAvatar, { borderColor: theme.screen.text + '33' }]}>
							<MaterialCommunityIcons name="account-outline" size={64} color={theme.screen.text + '66'} />
						</View>
					)}
				</View>

				<SettingsListGroupTitle title={translate(TranslationKeys.avatars)} />
				{avatarConfig && (
					<>
						<SettingsList
							title="Save"
							onPress={handleSave}
							leftIcon={<MaterialCommunityIcons name="content-save" size={20} />}
							iconBgColor={primaryColor}
							groupPosition="top"
							showSeparator={true}
						/>
						<SettingsList
							title="Edit"
							onPress={handleOpenEditor}
							leftIcon={<MaterialCommunityIcons name="pencil" size={20} />}
							iconBgColor={primaryColor}
							groupPosition="middle"
							showSeparator={true}
						/>
						<SettingsList
							title="Delete"
							onPress={handleDelete}
							leftIcon={<MaterialCommunityIcons name="delete" size={20} />}
							iconBgColor={primaryColor}
							groupPosition="middle"
							showSeparator={true}
						/>
					</>
				)}
				<SettingsList
					title="Create New"
					onPress={handleOpenEditor}
					leftIcon={<MaterialCommunityIcons name="plus-circle" size={20} />}
					iconBgColor={primaryColor}
					groupPosition={avatarConfig ? 'bottom' : 'single'}
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
	avatarContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 24,
	},
	placeholderAvatar: {
		width: AvatarSize.LARGE,
		height: AvatarSize.LARGE,
		borderRadius: AvatarSize.LARGE / 2,
		borderWidth: 2,
		borderStyle: 'dashed',
		alignItems: 'center',
		justifyContent: 'center',
	},
});

export default AvatarsScreen;
