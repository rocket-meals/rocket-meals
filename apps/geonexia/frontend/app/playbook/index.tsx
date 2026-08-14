import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { CommonUiComponentIds, SettingsList, playbookRegistryData, useTheme } from 'repo-depkit-common-ui';

const PRIMARY_COLOR = '#2563eb';

type GroupPosition = 'single' | 'top' | 'bottom' | 'middle';

function getGroupPosition(index: number, total: number): GroupPosition {
	if (total === 1) return 'single';
	if (index === 0) return 'top';
	if (index === total - 1) return 'bottom';
	return 'middle';
}

/**
 * Playbook overview – lists every common-ui component registered in the
 * playbook registry (packages/common-ui/src/playbook). Tapping an entry opens
 * the generic detail screen where the component's props ("knobs") can be
 * tweaked live and via URL query parameters. Mirrors the score-tracker and
 * rocket-meals frontend playbooks; reachable from the Experimental screen.
 */
export default function PlaybookIndexScreen() {
	const { theme } = useTheme();
	const insets = useSafeAreaInsets();

	const openEntry = (name: string) => {
		router.push({ pathname: '/playbook/[component]', params: { component: name } });
	};

	return (
		<View style={[styles.container, { backgroundColor: theme.screen.background }]}>
			<ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32, paddingLeft: insets.left, paddingRight: insets.right }]}>
				<Text style={[styles.heading, { color: theme.screen.text }]}>Playbook</Text>
				<Text style={[styles.body, { color: theme.screen.placeholder }]}>
					Interactive gallery of all registered common-ui components. Props can also be set via URL query parameters, e.g. ?isEnabled=false
				</Text>
				<View style={styles.list}>
					{playbookRegistryData.map((entry, index) => (
						<SettingsList
							key={entry.name}
							nativeID={CommonUiComponentIds.PLAYBOOK_ITEM_PREFIX + entry.name}
							iconBgColor={PRIMARY_COLOR}
							leftIcon={<MaterialCommunityIcons name="puzzle-outline" size={22} color="#ffffff" />}
							label={entry.name}
							rightIcon={<Ionicons name="chevron-forward" size={20} color="#9ca3af" />}
							handleFunction={() => openEntry(entry.name)}
							groupPosition={getGroupPosition(index, playbookRegistryData.length)}
						/>
					))}
				</View>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		padding: 16,
	},
	heading: {
		fontSize: 24,
		fontWeight: '700',
		marginVertical: 10,
	},
	body: {
		fontSize: 14,
		lineHeight: 20,
		marginBottom: 10,
	},
	list: {
		width: '100%',
		marginTop: 10,
	},
});
