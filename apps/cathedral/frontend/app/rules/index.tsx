import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'repo-depkit-common-ui';

const PRIMARY_COLOR = '#7c3aed';

export default function RulesScreen() {
	const { theme } = useTheme();
	const insets = useSafeAreaInsets();

	return (
		<View style={[styles.container, { backgroundColor: theme.screen.background }]}>
			<ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
				<Text style={[styles.title, { color: theme.screen.text }]}>Cathedral Rules</Text>

				<Text style={[styles.sectionTitle, { color: PRIMARY_COLOR }]}>Introduction</Text>
				<Text style={[styles.body, { color: theme.screen.text }]}>
					CATHEDRAL is based on the concept of a City surrounded by a wall. The board, divided into one hundred squares (10x10) represents the site of the city enclosed by the wall. The two sets of pieces, light and dark, symbolize the buildings and the two opposing factions struggling to gain power.
				</Text>
				<Text style={[styles.body, { color: theme.screen.text }]}>
					The Cathedral is the focal point of the city, a spiritual haven and place of sanctuary which mediates in the struggle.
				</Text>

				<Text style={[styles.sectionTitle, { color: PRIMARY_COLOR }]}>Object of the Game</Text>
				<Text style={[styles.body, { color: theme.screen.text }]}>
					Place all your buildings within the walls of the city, while trying to prevent your opponent from doing so.
				</Text>

				<Text style={[styles.sectionTitle, { color: PRIMARY_COLOR }]}>How to Play</Text>

				<Text style={[styles.rule, { color: theme.screen.text }]}>
					1. The light player places the Cathedral anywhere within the city to start the game.
				</Text>
				<Text style={[styles.rule, { color: theme.screen.text }]}>
					2. The dark player makes the first building move, then players alternate turns.
				</Text>
				<Text style={[styles.rule, { color: theme.screen.text }]}>
					3. A move consists of placing a building anywhere in the city so that it is lined up with the squares. Buildings may touch the wall or Cathedral.
				</Text>

				<Text style={[styles.sectionTitle, { color: PRIMARY_COLOR }]}>Claiming Territory</Text>
				<Text style={[styles.rule, { color: theme.screen.text }]}>
					4. If you completely enclose a part of the city with your buildings alone (or with your buildings and the wall), this area becomes your territory. Your opponent may not place buildings within it. Buildings must meet wall-to-wall (corner-to-corner contact is not acceptable). The Cathedral may NOT be used as part of the boundary. Territory cannot be claimed on your first move.
				</Text>

				<Text style={[styles.sectionTitle, { color: PRIMARY_COLOR }]}>Capturing Buildings</Text>
				<Text style={[styles.rule, { color: theme.screen.text }]}>
					5. If you surround and isolate ONE of your opponent's buildings (or the Cathedral alone), you capture it. Remove it and claim the enclosed space. The captured building may be replayed later, but a captured Cathedral is removed permanently. If you surround two or more buildings together, NONE may be captured and the space remains available.
				</Text>

				<Text style={[styles.sectionTitle, { color: PRIMARY_COLOR }]}>Game End</Text>
				<Text style={[styles.rule, { color: theme.screen.text }]}>
					6. The game ends when no further moves can be made by either player. If one player cannot move, the other continues until they also cannot move or run out of buildings.
				</Text>
				<Text style={[styles.rule, { color: theme.screen.text }]}>
					7. The winner is the player whose unplaced buildings cover the LEAST number of squares. If equal, the game is a draw.
				</Text>

				<Text style={[styles.sectionTitle, { color: PRIMARY_COLOR }]}>Strategy Tips</Text>
				<Text style={[styles.rule, { color: theme.screen.text }]}>• Play your largest buildings first.</Text>
				<Text style={[styles.rule, { color: theme.screen.text }]}>• Concentrate on claiming space early.</Text>
				<Text style={[styles.rule, { color: theme.screen.text }]}>• Block your opponent from capturing space.</Text>
				<Text style={[styles.rule, { color: theme.screen.text }]}>• Protect your buildings from being captured.</Text>
				<Text style={[styles.rule, { color: theme.screen.text }]}>• Don't play into your own space while unclaimed space exists.</Text>
				<Text style={[styles.rule, { color: theme.screen.text }]}>• Never give up until the last move!</Text>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		padding: 20,
	},
	title: {
		fontSize: 24,
		fontWeight: '700',
		marginBottom: 20,
		textAlign: 'center',
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '700',
		marginTop: 20,
		marginBottom: 8,
	},
	body: {
		fontSize: 15,
		lineHeight: 22,
		marginBottom: 8,
	},
	rule: {
		fontSize: 15,
		lineHeight: 22,
		marginBottom: 8,
		paddingLeft: 8,
	},
});
