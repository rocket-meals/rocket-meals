import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MaterialCommunityIcons, Octicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { McpAccessHelper, McpInstructionHelper, type McpAccessMode, type McpHttpClient, type McpProvider, type McpProviderOption } from 'repo-depkit-common';
import { CollapsibleView } from 'repo-depkit-common-ui';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import useToast from '@/hooks/useToast';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import useCustomerConfig from '@/hooks/useCustomerConfig';
import { TranslationKeys } from '@/locales/keys';
import { useAppSelector } from '@/redux/hooks';
import SettingsList from '@/components/SettingsList';
import SettingsGroupTitle from '@/components/SettingsGroupTitle';
import MyMarkdownProjectColored from '@/components/MyMarkdownProjectColored';
import ProjectButton from '@/components/ProjectButton';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import { ServerInfoHelper } from '@/helper/ServerInfoHelper';
import { UserHelper } from '@/helper/UserHelper';
import { authorizedFetch } from '@/helper/authorizedFetch';
import { myContrastColor } from '@/helper/ColorHelper';
import Server from '@/constants/ServerUrl';
import ClaudeSymbol from '@/assets/icons/brands/claude-symbol.svg';
import OpenAiSymbol from '@/assets/icons/brands/openai-symbol.svg';
import { performLogout } from '@/helper/logoutHelper';

type ProviderLogoProps = { size: number; color: string };

/**
 * Brand symbols, used exactly as the companies provide them and only to identify their service
 * (OpenAI/Anthropic brand rules) - not recolored, not on our primary color. OpenAI's symbol has no
 * own color: OpenAI offers it in black and in white, so it takes the text color of the theme.
 * Providers, steps and the token flow come from `McpInstructionHelper`, shared with the Directus module.
 */
const PROVIDER_LOGOS: Record<McpProvider, (props: ProviderLogoProps) => React.ReactNode> = {
	openai: ({ size, color }) => <OpenAiSymbol width={size} height={size} fill={color} />,
	claude: ({ size }) => <ClaudeSymbol width={size} height={size} />,
	other: ({ size, color }) => <MaterialCommunityIcons name="dots-horizontal-circle-outline" size={size} color={color} />,
};

async function readJsonResponse(response: Response): Promise<unknown> {
	if (!response.ok) {
		throw new Error('MCP request ' + response.url + ' failed with status ' + response.status);
	}
	return await response.json();
}

/** The app's way to the server for `McpInstructionHelper`: `fetch` with the token of the signed-in user. */
const mcpHttpClient: McpHttpClient = {
	get: async (path) => readJsonResponse(await authorizedFetch(path)),
	patch: async (path, body) =>
		readJsonResponse(await authorizedFetch(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })),
	// Only the public MCP user is posted to - no login needed, the token is public anyway.
	post: async (path) => readJsonResponse(await fetch(Server.ServerUrl + path, { method: 'POST' })),
};

const { ASSISTANT_PARAM, LEGACY_ASSISTANT_PARAM } = McpInstructionHelper;

/** Tokens have no spaces - zero-width spaces let a long one wrap inside its row. Display only, the copy keeps the raw value. */
function makeWrappable(value: string): string {
	return value.match(/.{1,16}/g)?.join('​') ?? value;
}

const McpInstruction = () => {
	useSetPageTitle(TranslationKeys.mcp_instruction);
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const toast = useToast();
	const router = useRouter();
	const dispatch = useDispatch();
	const customerConfig = useCustomerConfig();
	const { show: showModal, close: closeModal } = useMyScrollViewModal();
	const { serverInfo, primaryColor, selectedTheme: mode } = useAppSelector((state) => state.settings);
	const contrastColor = myContrastColor(primaryColor, theme, mode === 'dark');
	const { loggedIn, user } = useAppSelector((state) => state.authReducer);
	// Anonymous users ("continue without account") have no Directus user and thus no own token.
	const hasAccount = loggedIn && UserHelper.isRegisteredUser(user);

	const { [ASSISTANT_PARAM]: assistantParamValue, [LEGACY_ASSISTANT_PARAM]: legacyAssistantParamValue } = useLocalSearchParams();
	const assistantParam = assistantParamValue ?? legacyAssistantParamValue;
	const [provider, setProvider] = useState<McpProvider | null>(() => McpInstructionHelper.parseAssistantParam(assistantParam));
	const [accessMode, setAccessMode] = useState<McpAccessMode | null>(null);
	// A section folds itself away once something is picked in it (a preselected assistant starts
	// folded) and can be opened again by hand. Without a pick it always stays open.
	const [isProviderSectionCollapsed, setIsProviderSectionCollapsed] = useState(() => McpInstructionHelper.parseAssistantParam(assistantParam) !== null);
	const [isAccountSectionCollapsed, setIsAccountSectionCollapsed] = useState(false);
	// Only set right after it was created - Directus never shows a saved token again.
	const [personalToken, setPersonalToken] = useState<string | null>(null);
	const [hasPersonalToken, setHasPersonalToken] = useState<boolean | null>(null);
	// The user still knows the saved token: the steps show `<TOKEN>` where it belongs.
	const [usesKnownToken, setUsesKnownToken] = useState(false);
	const [isLoadingToken, setIsLoadingToken] = useState(false);
	// The fixed token is the same on every server; the server is still asked, in case it changed.
	const [publicToken, setPublicToken] = useState<string>(McpAccessHelper.PUBLIC_USER_TOKEN);
	const hasEnsuredPublicUser = useRef(false);

	const appName = ServerInfoHelper.getServerName(serverInfo || {}, customerConfig);
	const token = McpInstructionHelper.resolveToken({ accessMode, publicToken, personalToken, usesKnownToken });
	const isTokenPlaceholder = accessMode === 'personal' && !personalToken && usesKnownToken;

	useEffect(() => {
		const providerFromParam = McpInstructionHelper.parseAssistantParam(assistantParam);
		if (providerFromParam) {
			setProvider(providerFromParam);
			setIsProviderSectionCollapsed(true);
		}
	}, [assistantParam]);

	// Logging out (or in as someone else) must not leave the previous user's token on screen.
	useEffect(() => {
		setPersonalToken(null);
		setHasPersonalToken(null);
		setUsesKnownToken(false);
		setAccessMode((current) => (current === 'personal' ? null : current));
	}, [hasAccount, user?.id]);

	// Choosing the account creates and saves a token right away - unless there already is one,
	// then the user is asked whether they still know it.
	useEffect(() => {
		if (accessMode !== 'personal' || !hasAccount || personalToken || usesKnownToken) {
			return;
		}
		let cancelled = false;
		const load = async () => {
			setIsLoadingToken(true);
			try {
				const state = await McpInstructionHelper.loadOrCreatePersonalToken(mcpHttpClient);
				if (cancelled) return;
				setHasPersonalToken(true);
				if (state.kind === 'created') {
					setPersonalToken(state.token);
				}
			} catch (error) {
				console.error('Could not load the MCP token:', error);
				if (!cancelled) toast(translate(TranslationKeys.mcp_access_token_load_failed), 'error');
			} finally {
				if (!cancelled) setIsLoadingToken(false);
			}
		};
		void load();
		return () => {
			cancelled = true;
		};
		// Runs on the choice only - not again once the token is there.
	}, [accessMode, hasAccount]);

	// Without an account the server makes sure the public MCP user exists and names its token.
	useEffect(() => {
		if (accessMode !== 'public' || hasEnsuredPublicUser.current) {
			return;
		}
		hasEnsuredPublicUser.current = true;
		McpInstructionHelper.ensurePublicUser(mcpHttpClient)
			.then(setPublicToken)
			.catch((error) => {
				// The fixed token from McpAccessHelper stays in place - it is right on every up-to-date server.
				console.error('Could not ensure the public MCP user:', error);
			});
	}, [accessMode]);

	const selectProvider = (selected: McpProvider) => {
		setProvider(selected);
		setIsProviderSectionCollapsed(true);
		// Keeps the choice in the url, so the page can be shared or bookmarked as it is.
		router.setParams({ [ASSISTANT_PARAM]: selected, [LEGACY_ASSISTANT_PARAM]: undefined });
	};

	// Brand names stay as they are, only "Andere" is translated.
	const getProviderLabel = (option: McpProviderOption) => option.brandName ?? (option.labelKey ? translate(option.labelKey) : option.provider);

	const selectAccessMode = (selected: McpAccessMode) => {
		setAccessMode(selected);
		setIsAccountSectionCollapsed(true);
	};

	/** Opens the support form with the assistant already named in the title, so a ticket says where it got stuck. */
	const openSupport = () => {
		const providerOption = McpInstructionHelper.getProviderOption(provider);
		const providerLabel = providerOption ? getProviderLabel(providerOption) : '';
		const title = `${translate(TranslationKeys.mcp_instruction)} – ${providerLabel}`;
		router.push({ pathname: '/feedback-support', params: { title } });
	};

	const openLogin = () => {
		if (loggedIn) {
			// Anonymous users are "logged in" without an account - same way to the login screen as the popup events take.
			void performLogout(dispatch, router);
		} else {
			router.push('/(auth)/login');
		}
	};

	const createPersonalToken = useCallback(async () => {
		setIsLoadingToken(true);
		try {
			setPersonalToken(await McpInstructionHelper.createPersonalToken(mcpHttpClient));
			setHasPersonalToken(true);
			setUsesKnownToken(false);
		} catch (error) {
			console.error('Could not create the MCP token:', error);
			toast(translate(TranslationKeys.mcp_access_token_load_failed), 'error');
		} finally {
			setIsLoadingToken(false);
		}
	}, [toast, translate]);

	const revokePersonalToken = useCallback(async () => {
		closeModal();
		setIsLoadingToken(true);
		try {
			await McpInstructionHelper.revokePersonalToken(mcpHttpClient);
			setPersonalToken(null);
			setHasPersonalToken(false);
			setUsesKnownToken(false);
			// Without a token the steps are gone - the account choice opens again for a new start.
			setAccessMode(null);
			setIsAccountSectionCollapsed(false);
			toast(translate(TranslationKeys.mcp_access_token_revoked), 'success');
		} catch (error) {
			console.error('Could not revoke the MCP token:', error);
			toast(translate(TranslationKeys.mcp_access_token_revoke_failed), 'error');
		} finally {
			setIsLoadingToken(false);
		}
	}, [closeModal, toast, translate]);

	const confirmRevokePersonalToken = () => {
		showModal({
			title: translate(TranslationKeys.mcp_access_token_revoke),
			children: (
				<View style={styles.modalContent}>
					<Text style={[styles.modalText, { color: theme.screen.text }]}>{translate(TranslationKeys.mcp_access_token_revoke_confirm)}</Text>
					<ProjectButton text={translate(TranslationKeys.mcp_access_token_revoke)} onPress={() => void revokePersonalToken()} style={styles.modalButton} />
					<TouchableOpacity onPress={closeModal} style={styles.modalCancel}>
						<Text style={{ color: theme.screen.text }}>{translate(TranslationKeys.cancel)}</Text>
					</TouchableOpacity>
				</View>
			),
		});
	};

	const copyToClipboard = useCallback(
		async (value: string) => {
			await Clipboard.setStringAsync(value);
			toast(translate(TranslationKeys.copied), 'success');
		},
		[toast, translate]
	);

	const copyValueContext = { appName, backendUrl: Server.ServerUrl, token };

	/** Just the value and a copy icon on the right - the step text above already says what it is for. */
	const renderCopyRow = (value: string, showTapHint: boolean) => (
		<>
			<SettingsList
				title={makeWrappable(value)}
				noIconIndent
				rightIcon={<MaterialCommunityIcons name="content-copy" size={22} color={theme.screen.icon} />}
				handleFunction={() => void copyToClipboard(value)}
				groupPosition="single"
			/>
			{showTapHint ? <Text style={[styles.tapHint, { color: theme.modal.placeholder }]}>{translate(TranslationKeys.mcp_tap_to_copy)}</Text> : null}
		</>
	);

	const renderRadioIcon = (isSelected: boolean) => (
		<MaterialCommunityIcons name={isSelected ? 'radiobox-marked' : 'radiobox-blank'} size={24} color={isSelected ? primaryColor : theme.screen.icon} />
	);

	const renderSectionHeader = (title: string, value: string | undefined, leftIcon: React.ReactNode, isCollapsed: boolean, toggle: () => void) => (
		<SettingsList
			iconBgColor="transparent"
			leftIcon={leftIcon}
			title={title}
			value={value}
			stackedValue
			rightIcon={<MaterialCommunityIcons name={isCollapsed ? 'chevron-down' : 'chevron-up'} size={26} color={theme.screen.icon} />}
			handleFunction={toggle}
			groupPosition="single"
		/>
	);

	const selectedProviderOption = McpInstructionHelper.getProviderOption(provider);
	const accessModeLabels: Record<McpAccessMode, string> = {
		personal: translate(TranslationKeys.mcp_connect_with_account),
		public: translate(TranslationKeys.mcp_continue_without_account),
	};
	const accessModeIcons: Record<McpAccessMode, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
		personal: 'account-key',
		public: 'earth',
	};
	const isProviderCollapsed = isProviderSectionCollapsed && provider !== null;
	const isAccountCollapsed = isAccountSectionCollapsed && accessMode !== null;

	const renderAccessChoice = () => (
		<>
			<MyMarkdownProjectColored content={translate(hasAccount ? TranslationKeys.mcp_access_choice_question : TranslationKeys.mcp_access_no_account_hint)} />
			<View style={styles.choiceGroup}>
				{hasAccount ? (
					<SettingsList
						leftIcon={<MaterialCommunityIcons name="account-key" size={24} color={theme.screen.icon} />}
						title={translate(TranslationKeys.mcp_connect_with_account)}
						rightIcon={renderRadioIcon(accessMode === 'personal')}
						handleFunction={() => selectAccessMode('personal')}
						groupPosition="top"
					/>
				) : (
					<SettingsList
						leftIcon={<MaterialCommunityIcons name="login" size={24} color={theme.screen.icon} />}
						title={`${translate(TranslationKeys.sign_in)} / ${translate(TranslationKeys.create_account)}`}
						rightIcon={<Octicons name="chevron-right" size={24} color={theme.screen.icon} />}
						handleFunction={openLogin}
						groupPosition="top"
					/>
				)}
				<SettingsList
					leftIcon={<MaterialCommunityIcons name="earth" size={24} color={theme.screen.icon} />}
					title={translate(TranslationKeys.mcp_continue_without_account)}
					rightIcon={renderRadioIcon(accessMode === 'public')}
					handleFunction={() => selectAccessMode('public')}
					groupPosition="bottom"
				/>
			</View>
		</>
	);

	/** With the account chosen: a spinner while the token is checked or created, or the question whether the saved one is still known. */
	const renderPersonalTokenState = () => {
		if (accessMode !== 'personal' || personalToken) {
			return null;
		}
		if (hasPersonalToken === null || (isLoadingToken && !hasPersonalToken)) {
			return (
				<View style={styles.sectionContent}>
					<ActivityIndicator color={theme.screen.text} />
				</View>
			);
		}
		if (!hasPersonalToken) {
			return null;
		}
		return (
			<View style={styles.sectionContent}>
				<MyMarkdownProjectColored content={translate(TranslationKeys.mcp_access_token_exists_hint)} />
				<View style={styles.choiceGroup}>
					<SettingsList
						leftIcon={<MaterialCommunityIcons name="key-outline" size={24} color={theme.screen.icon} />}
						title={translate(TranslationKeys.mcp_access_token_known_yes)}
						rightIcon={renderRadioIcon(usesKnownToken)}
						handleFunction={() => setUsesKnownToken(true)}
						groupPosition="top"
					/>
					<SettingsList
						leftIcon={<MaterialCommunityIcons name="key-change" size={24} color={theme.screen.icon} />}
						title={translate(TranslationKeys.mcp_access_token_known_no)}
						rightIcon={isLoadingToken ? <ActivityIndicator color={theme.screen.text} /> : renderRadioIcon(false)}
						handleFunction={isLoadingToken ? undefined : () => void createPersonalToken()}
						groupPosition="bottom"
					/>
				</View>
			</View>
		);
	};

	const renderSteps = () => {
		if (!provider || token === null) {
			return null;
		}
		const firstCopyIndex = McpInstructionHelper.getFirstCopyStepIndex(provider);
		return (
			<>
				<SettingsGroupTitle>{translate(TranslationKeys.mcp_steps_title)}</SettingsGroupTitle>
				{isTokenPlaceholder ? (
					<View style={styles.placeholderHint}>
						<MyMarkdownProjectColored content={translate(TranslationKeys.mcp_access_token_placeholder_hint)} />
					</View>
				) : null}
				<View style={styles.groupContainer}>
					{McpInstructionHelper.STEPS_BY_PROVIDER[provider].map((step, index) => {
						const copyValue = step.copy ? McpInstructionHelper.getCopyValue(step.copy, copyValueContext) : null;
						return (
							<View key={step.textKey} style={styles.step}>
								<View style={styles.stepRow}>
									<View style={[styles.stepNumber, { backgroundColor: primaryColor }]}>
										<Text style={[styles.stepNumberText, { color: contrastColor }]}>{index + 1}</Text>
									</View>
									<View style={styles.stepText}>
										<MyMarkdownProjectColored content={translate(step.textKey)} />
									</View>
								</View>
								{copyValue ? <View style={styles.stepCopy}>{renderCopyRow(copyValue, index === firstCopyIndex)}</View> : null}
							</View>
						);
					})}
					<TouchableOpacity style={styles.support} onPress={openSupport} accessibilityRole="link">
						<MaterialCommunityIcons name="lifebuoy" size={16} color={theme.modal.placeholder} />
						<Text style={[styles.supportText, { color: theme.modal.placeholder }]}>{translate(TranslationKeys.mcp_step_problems)}</Text>
					</TouchableOpacity>
				</View>
			</>
		);
	};

	/** The personal token, shown once after creating it, and the way to revoke it. Nothing for the public token. */
	const renderPersonalTokenManagement = () => {
		if (accessMode !== 'personal' || !hasPersonalToken) {
			return null;
		}
		return (
			<>
				<SettingsGroupTitle>{translate(TranslationKeys.mcp_access_token)}</SettingsGroupTitle>
				<View style={styles.groupContainer}>
					{personalToken ? (
						<>
							<MyMarkdownProjectColored content={translate(TranslationKeys.mcp_access_token_personal_hint)} />
							<View style={styles.tokenCopy}>{renderCopyRow(personalToken, false)}</View>
						</>
					) : (
						<MyMarkdownProjectColored content={translate(TranslationKeys.mcp_access_token_unknown_hint)} />
					)}
					<View style={styles.tokenCopy}>
						<SettingsList
							leftIcon={<MaterialCommunityIcons name="key-remove" size={24} color={theme.screen.icon} />}
							title={translate(TranslationKeys.mcp_access_token_revoke)}
							rightIcon={isLoadingToken ? <ActivityIndicator color={theme.screen.text} /> : undefined}
							handleFunction={isLoadingToken ? undefined : confirmRevokePersonalToken}
							groupPosition="single"
						/>
					</View>
				</View>
			</>
		);
	};

	return (
		<ScrollView style={{ ...styles.container, backgroundColor: theme.screen.background }} contentContainerStyle={{ backgroundColor: theme.screen.background }}>
			<View style={styles.content}>
				<MyMarkdownProjectColored content={translate(TranslationKeys.mcp_instruction_intro)} />

				<View style={styles.groupContainer}>
					{renderSectionHeader(
						translate(TranslationKeys.mcp_provider),
						selectedProviderOption ? getProviderLabel(selectedProviderOption) : undefined,
						selectedProviderOption ? (
							PROVIDER_LOGOS[selectedProviderOption.provider]({ size: 24, color: theme.screen.text })
						) : (
							<MaterialCommunityIcons name="robot-outline" size={24} color={theme.screen.text} />
						),
						isProviderCollapsed,
						() => setIsProviderSectionCollapsed(!isProviderCollapsed)
					)}
					<CollapsibleView collapsed={isProviderCollapsed}>
						<View style={styles.sectionContent}>
							<MyMarkdownProjectColored content={translate(TranslationKeys.mcp_choose_provider)} />
							<View style={styles.choiceGroup}>
								{McpInstructionHelper.PROVIDERS.map((option, index) => {
									const groupPosition = index === 0 ? 'top' : index === McpInstructionHelper.PROVIDERS.length - 1 ? 'bottom' : 'middle';
									return (
										<SettingsList
											key={option.provider}
											iconBgColor="transparent"
											leftIcon={PROVIDER_LOGOS[option.provider]({ size: 24, color: theme.screen.text })}
											title={getProviderLabel(option)}
											rightIcon={renderRadioIcon(option.provider === provider)}
											handleFunction={() => selectProvider(option.provider)}
											groupPosition={groupPosition}
										/>
									);
								})}
							</View>
						</View>
					</CollapsibleView>
				</View>

				{provider ? (
					<View style={styles.groupContainer}>
						{renderSectionHeader(
							translate(TranslationKeys.mcp_account),
							accessMode ? accessModeLabels[accessMode] : undefined,
							<MaterialCommunityIcons name={accessMode ? accessModeIcons[accessMode] : 'account-question-outline'} size={24} color={theme.screen.text} />,
							isAccountCollapsed,
							() => setIsAccountSectionCollapsed(!isAccountCollapsed)
						)}
						<CollapsibleView collapsed={isAccountCollapsed}>
							<View style={styles.sectionContent}>{renderAccessChoice()}</View>
						</CollapsibleView>
						{renderPersonalTokenState()}
					</View>
				) : null}

				{renderSteps()}

				{renderPersonalTokenManagement()}

				<Text style={[styles.trademarkNotice, { color: theme.modal.placeholder }]}>{translate(TranslationKeys.mcp_trademark_notice)}</Text>
			</View>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		width: '100%',
		padding: 20,
	},
	groupContainer: {
		marginBottom: 20,
	},
	choiceGroup: {
		marginBottom: 12,
	},
	sectionContent: {
		paddingTop: 12,
	},
	placeholderHint: {
		marginBottom: 12,
	},
	support: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginTop: 4,
		alignSelf: 'flex-start',
		paddingVertical: 4,
	},
	supportText: {
		fontSize: 13,
		fontFamily: 'Poppins_400Regular',
		textDecorationLine: 'underline',
	},
	tapHint: {
		fontSize: 12,
		fontFamily: 'Poppins_400Regular',
		marginTop: 4,
		marginLeft: 4,
	},
	tokenCopy: {
		marginTop: 8,
	},
	trademarkNotice: {
		fontSize: 12,
		fontFamily: 'Poppins_400Regular',
		marginTop: 10,
	},
	step: {
		marginBottom: 14,
	},
	stepRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 12,
	},
	stepNumber: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 2,
	},
	stepNumberText: {
		fontFamily: 'Poppins_700Bold',
		fontSize: 14,
	},
	stepText: {
		flex: 1,
	},
	stepCopy: {
		marginTop: 8,
		marginLeft: 40,
	},
	modalContent: {
		gap: 12,
	},
	modalText: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
	},
	modalButton: {
		marginVertical: 0,
	},
	modalCancel: {
		alignSelf: 'center',
		paddingVertical: 6,
	},
});

export default McpInstruction;
