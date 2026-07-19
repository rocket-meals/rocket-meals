import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SettingsListGroupTitle, useTheme, type Theme } from 'repo-depkit-common-ui';
import { MathHelper } from 'repo-depkit-common';
import { ComponentIds } from '../../constants/ComponentIds';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const PRIMARY_COLOR = '#2563eb';

const MAX_POOL_SIZE = 12;
const MIN_CUSTOM_SIDES = 2;
const MAX_CUSTOM_SIDES = 1000;
const ROLL_ANIMATION_MS = 600;
const ROLL_ANIMATION_STEP_MS = 75;

const DICE_PRESETS = [4, 6, 8, 10, 12, 20] as const;

const DICE_TYPE_ICON: Record<number, MCIName> = {
	4: 'dice-d4',
	6: 'dice-d6',
	8: 'dice-d8',
	10: 'dice-d10',
	12: 'dice-d12',
	20: 'dice-d20',
};
const CUSTOM_ICON: MCIName = 'shape-polygon-plus';
const FALLBACK_ICON: MCIName = 'dice-multiple-outline';

function diceIconForSides(sides: number): MCIName {
	return DICE_TYPE_ICON[sides] ?? FALLBACK_ICON;
}

type RollMode = 'sum' | 'advantage' | 'disadvantage';

const ROLL_MODES: { key: RollMode; label: string; icon: MCIName }[] = [
	{ key: 'sum', label: 'Summe', icon: 'sigma' },
	{ key: 'advantage', label: 'Vorteil', icon: 'arrow-up-bold-circle-outline' },
	{ key: 'disadvantage', label: 'Nachteil', icon: 'arrow-down-bold-circle-outline' },
];

type PoolDie = { id: string; sides: number };
type DieResult = PoolDie & { value: number };
type DiceRoll = { dice: DieResult[]; total: number };
type RollResult =
	| { mode: 'sum'; dice: DieResult[]; total: number }
	| { mode: 'advantage' | 'disadvantage'; rollA: DiceRoll; rollB: DiceRoll; keptRoll: 'A' | 'B'; keptTotal: number };

function rollValue(sides: number): number {
	return MathHelper.randomIntBetween(1, sides);
}

function rollPoolOnce(pool: PoolDie[]): DiceRoll {
	const dice = pool.map((die) => ({ ...die, value: rollValue(die.sides) }));
	return { dice, total: dice.reduce((sum, die) => sum + die.value, 0) };
}

// Nothing is hidden or "loaded": for advantage/disadvantage the whole pool is
// genuinely rolled twice and BOTH rolls are shown - only the roll with the
// higher (advantage) or lower (disadvantage) total is highlighted as the one
// that counts. A natural generalisation of the classic single-d20 "roll
// twice, keep one" rule to an arbitrary dice pool.
function computeRoll(pool: PoolDie[], mode: RollMode): RollResult {
	const rollA = rollPoolOnce(pool);
	if (mode === 'sum') {
		return { mode, dice: rollA.dice, total: rollA.total };
	}
	const rollB = rollPoolOnce(pool);
	const keptRoll = (mode === 'advantage' ? rollA.total >= rollB.total : rollA.total <= rollB.total) ? 'A' : 'B';
	return { mode, rollA, rollB, keptRoll, keptTotal: keptRoll === 'A' ? rollA.total : rollB.total };
}

function DiceValueRow({ dice, theme }: { dice: DieResult[]; theme: Theme }) {
	return (
		<View style={styles.resultsRow}>
			{dice.map((die) => (
				<View key={die.id} style={[styles.resultBadge, { backgroundColor: theme.screen.iconBg }]}>
					<Text style={[styles.resultBadgeSides, { color: theme.screen.placeholder }]}>W{die.sides}</Text>
					<Text style={[styles.resultBadgeValue, { color: theme.screen.text }]}>{die.value}</Text>
				</View>
			))}
		</View>
	);
}

export default function DiceScreen() {
	const { theme } = useTheme();
	const insets = useSafeAreaInsets();

	const [pool, setPool] = useState<PoolDie[]>([]);
	const [rollMode, setRollMode] = useState<RollMode>('sum');
	const [showCustomInput, setShowCustomInput] = useState(false);
	const [customSidesText, setCustomSidesText] = useState('');
	const [results, setResults] = useState<RollResult | null>(null);
	const [isRolling, setIsRolling] = useState(false);
	const animationRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const nextIdRef = useRef(0);

	const addDie = useCallback((sides: number) => {
		if (!Number.isFinite(sides) || sides < MIN_CUSTOM_SIDES || pool.length >= MAX_POOL_SIZE) return;
		nextIdRef.current += 1;
		setPool((prev) => [...prev, { id: `die-${nextIdRef.current}`, sides }]);
	}, [pool.length]);

	const removeDie = useCallback((id: string) => {
		setPool((prev) => prev.filter((die) => die.id !== id));
	}, []);

	const clearPool = useCallback(() => {
		setPool([]);
	}, []);

	const handleAddCustom = useCallback(() => {
		if (pool.length >= MAX_POOL_SIZE) return;
		const sides = Number.parseInt(customSidesText, 10);
		if (!Number.isFinite(sides) || sides < MIN_CUSTOM_SIDES || sides > MAX_CUSTOM_SIDES) return;
		addDie(sides);
		setCustomSidesText('');
		setShowCustomInput(false);
	}, [customSidesText, addDie, pool.length]);

	// Shuffle the faces rapidly for a moment before settling on the final roll -
	// cheap "animation" without needing reanimated. Each tick is already a
	// genuine full roll via computeRoll, so the very last tick before the
	// interval clears simply becomes the final result.
	const handleRoll = useCallback(() => {
		if (isRolling || pool.length === 0) return;
		setIsRolling(true);
		const startedAt = Date.now();
		animationRef.current = setInterval(() => {
			setResults(computeRoll(pool, rollMode));
			if (Date.now() - startedAt >= ROLL_ANIMATION_MS && animationRef.current) {
				clearInterval(animationRef.current);
				animationRef.current = null;
				setIsRolling(false);
			}
		}, ROLL_ANIMATION_STEP_MS);
	}, [pool, isRolling, rollMode]);

	useEffect(() => {
		return () => {
			if (animationRef.current) clearInterval(animationRef.current);
		};
	}, []);

	return (
		<View style={[styles.container, { backgroundColor: theme.screen.background, paddingLeft: insets.left, paddingRight: insets.right }]}>
			<ScrollView contentContainerStyle={styles.content}>
				<SettingsListGroupTitle title="Würfel auswählen" />
				<View style={styles.typeRow}>
					{DICE_PRESETS.map((sides) => {
						const disabled = isRolling || pool.length >= MAX_POOL_SIZE;
						return (
							<TouchableOpacity
								key={sides}
								nativeID={`${ComponentIds.DICE_TYPE_BUTTON_PREFIX}${sides}`}
								style={[styles.typeChip, { borderColor: PRIMARY_COLOR, opacity: disabled ? 0.4 : 1 }]}
								onPress={() => addDie(sides)}
								disabled={disabled}
								activeOpacity={0.7}
							>
								<MaterialCommunityIcons name={diceIconForSides(sides)} size={26} color={PRIMARY_COLOR} />
								<Text style={[styles.typeChipText, { color: PRIMARY_COLOR }]}>W{sides}</Text>
							</TouchableOpacity>
						);
					})}
					<TouchableOpacity
						nativeID={`${ComponentIds.DICE_TYPE_BUTTON_PREFIX}custom`}
						style={[styles.typeChip, { borderColor: PRIMARY_COLOR, opacity: isRolling || pool.length >= MAX_POOL_SIZE ? 0.4 : 1 }]}
						onPress={() => setShowCustomInput((prev) => !prev)}
						disabled={isRolling || pool.length >= MAX_POOL_SIZE}
						activeOpacity={0.7}
					>
						<MaterialCommunityIcons name={CUSTOM_ICON} size={26} color={PRIMARY_COLOR} />
						<Text style={[styles.typeChipText, { color: PRIMARY_COLOR }]}>Custom</Text>
					</TouchableOpacity>
				</View>

				{showCustomInput && (
					<View style={styles.customRow}>
						<TextInput
							nativeID={ComponentIds.DICE_CUSTOM_INPUT}
							style={[styles.customInput, { color: theme.screen.text, backgroundColor: theme.screen.iconBg }]}
							placeholder={`Seitenzahl (${MIN_CUSTOM_SIDES}-${MAX_CUSTOM_SIDES})`}
							placeholderTextColor={theme.screen.placeholder}
							value={customSidesText}
							onChangeText={setCustomSidesText}
							keyboardType="number-pad"
							returnKeyType="done"
							editable={!isRolling}
							onSubmitEditing={handleAddCustom}
						/>
						<TouchableOpacity
							nativeID={ComponentIds.DICE_CUSTOM_ADD_BUTTON}
							style={[styles.customAddButton, { backgroundColor: PRIMARY_COLOR, opacity: isRolling || pool.length >= MAX_POOL_SIZE ? 0.4 : 1 }]}
							onPress={handleAddCustom}
							disabled={isRolling || pool.length >= MAX_POOL_SIZE}
							activeOpacity={0.8}
						>
							<Text style={styles.customAddButtonText}>Hinzufügen</Text>
						</TouchableOpacity>
					</View>
				)}

				<View style={styles.sectionHeaderRow}>
					<SettingsListGroupTitle title={`Ausgewählte Würfel (${pool.length})`} />
					{pool.length > 0 && (
						<TouchableOpacity
							nativeID={ComponentIds.DICE_POOL_CLEAR_BUTTON}
							onPress={clearPool}
							disabled={isRolling}
							hitSlop={8}
							style={[styles.clearButton, { opacity: isRolling ? 0.4 : 1 }]}
						>
							<Ionicons name="close-circle" size={16} color={theme.screen.placeholder} />
							<Text style={[styles.clearButtonText, { color: theme.screen.placeholder }]}>Leeren</Text>
						</TouchableOpacity>
					)}
				</View>
				{pool.length === 0 ? (
					<Text style={[styles.hintText, { color: theme.screen.placeholder }]}>
						Tippe oben auf einen Würfel, um ihn zur Auswahl hinzuzufügen.
					</Text>
				) : (
					<View style={styles.poolRow}>
						{pool.map((die) => (
							<TouchableOpacity
								key={die.id}
								nativeID={`${ComponentIds.DICE_POOL_ITEM_PREFIX}${die.id}`}
								style={[styles.poolChip, { backgroundColor: PRIMARY_COLOR, opacity: isRolling ? 0.6 : 1 }]}
								onPress={() => removeDie(die.id)}
								disabled={isRolling}
								activeOpacity={0.7}
							>
								<MaterialCommunityIcons name={diceIconForSides(die.sides)} size={20} color="#ffffff" />
								<Text style={styles.poolChipText}>W{die.sides}</Text>
								<Ionicons name="close" size={14} color="#ffffff" />
							</TouchableOpacity>
						))}
					</View>
				)}

				<SettingsListGroupTitle title="Wurf-Modus" />
				<View style={[styles.modeToggle, { backgroundColor: theme.screen.iconBg }]}>
					{ROLL_MODES.map((mode) => (
						<TouchableOpacity
							key={mode.key}
							nativeID={`${ComponentIds.DICE_MODE_BUTTON_PREFIX}${mode.key}`}
							style={[styles.modeButton, rollMode === mode.key && { backgroundColor: PRIMARY_COLOR }, { opacity: isRolling ? 0.6 : 1 }]}
							onPress={() => setRollMode(mode.key)}
							disabled={isRolling}
							activeOpacity={0.7}
						>
							<MaterialCommunityIcons name={mode.icon} size={16} color={rollMode === mode.key ? '#ffffff' : theme.screen.text} />
							<Text style={[styles.modeButtonText, { color: rollMode === mode.key ? '#ffffff' : theme.screen.text }]}>
								{mode.label}
							</Text>
						</TouchableOpacity>
					))}
				</View>

				{results && (
					<View style={styles.resultsArea}>
						{results.mode === 'sum' ? (
							<>
								<DiceValueRow dice={results.dice} theme={theme} />
								<Text style={[styles.totalText, { color: theme.screen.text }]}>Summe: {results.total}</Text>
							</>
						) : (
							<>
								{(['A', 'B'] as const).map((rollKey, index) => {
									const roll = rollKey === 'A' ? results.rollA : results.rollB;
									// Only reveal which roll counts once the shuffle has settled - while
									// still animating, both rolls are shown neutrally so nothing gives
									// away the outcome mid-shuffle.
									const isKept = !isRolling && results.keptRoll === rollKey;
									return (
										<View
											key={rollKey}
											style={[
												styles.rollSet,
												{ borderColor: isKept ? PRIMARY_COLOR : 'transparent', opacity: !isRolling && !isKept ? 0.55 : 1 },
											]}
										>
											<View style={styles.rollSetHeader}>
												<Text style={[styles.rollSetLabel, { color: theme.screen.text }]}>Wurf {index + 1}</Text>
												{isKept && (
													<View style={styles.keptBadge}>
														<Text style={styles.keptBadgeText}>zählt</Text>
													</View>
												)}
											</View>
											<DiceValueRow dice={roll.dice} theme={theme} />
											<Text style={[styles.rollSetTotal, { color: theme.screen.text }]}>Summe: {roll.total}</Text>
										</View>
									);
								})}
								<Text style={[styles.totalText, { color: theme.screen.text }]}>Ergebnis: {results.keptTotal}</Text>
							</>
						)}
					</View>
				)}
			</ScrollView>

			<View style={[styles.footer, { paddingBottom: insets.bottom + 12, backgroundColor: theme.screen.background, borderTopColor: theme.screen.border }]}>
				<TouchableOpacity
					nativeID={ComponentIds.DICE_ROLL_BUTTON}
					style={[styles.rollButton, { backgroundColor: PRIMARY_COLOR, opacity: isRolling || pool.length === 0 ? 0.5 : 1 }]}
					onPress={handleRoll}
					disabled={isRolling || pool.length === 0}
					activeOpacity={0.8}
				>
					<MaterialCommunityIcons name={FALLBACK_ICON} size={24} color="#ffffff" />
					<Text style={styles.rollButtonText}>
						{isRolling ? 'Würfeln...' : pool.length === 0 ? 'Wähle zuerst Würfel' : 'Würfeln'}
					</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		padding: 16,
		paddingBottom: 32,
	},
	typeRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	typeChip: {
		alignItems: 'center',
		justifyContent: 'center',
		gap: 2,
		width: 76,
		paddingVertical: 10,
		borderWidth: 1.5,
		borderRadius: 10,
	},
	typeChipText: {
		fontSize: 13,
		fontWeight: '700',
	},
	customRow: {
		flexDirection: 'row',
		gap: 8,
		marginTop: 10,
		paddingHorizontal: 2,
	},
	customInput: {
		flex: 1,
		height: 40,
		borderRadius: 10,
		paddingHorizontal: 12,
		fontSize: 15,
	},
	customAddButton: {
		justifyContent: 'center',
		paddingHorizontal: 16,
		borderRadius: 10,
	},
	customAddButtonText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '600',
	},
	sectionHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	clearButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingRight: 16,
	},
	clearButtonText: {
		fontSize: 13,
		fontWeight: '600',
	},
	hintText: {
		fontSize: 14,
		paddingHorizontal: 16,
		paddingTop: 4,
	},
	poolRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		paddingHorizontal: 16,
	},
	poolChip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 20,
	},
	poolChipText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '700',
	},
	modeToggle: {
		flexDirection: 'row',
		marginHorizontal: 16,
		borderRadius: 12,
		padding: 4,
		gap: 4,
	},
	modeButton: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 6,
		paddingVertical: 10,
		borderRadius: 9,
	},
	modeButtonText: {
		fontSize: 13,
		fontWeight: '600',
	},
	resultsArea: {
		alignItems: 'center',
		paddingTop: 32,
		paddingHorizontal: 16,
	},
	rollSet: {
		width: '100%',
		alignItems: 'center',
		paddingVertical: 14,
		paddingHorizontal: 12,
		borderRadius: 14,
		borderWidth: 2,
		marginBottom: 12,
	},
	rollSetHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 10,
	},
	rollSetLabel: {
		fontSize: 13,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.4,
	},
	keptBadge: {
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 10,
		backgroundColor: PRIMARY_COLOR,
	},
	keptBadgeText: {
		color: '#ffffff',
		fontSize: 11,
		fontWeight: '700',
		textTransform: 'uppercase',
	},
	rollSetTotal: {
		fontSize: 16,
		fontWeight: '700',
		marginTop: 10,
	},
	resultsRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'center',
		gap: 10,
	},
	resultBadge: {
		alignItems: 'center',
		justifyContent: 'center',
		width: 64,
		height: 64,
		borderRadius: 14,
	},
	resultBadgeSides: {
		fontSize: 11,
		fontWeight: '600',
	},
	resultBadgeValue: {
		fontSize: 24,
		fontWeight: '700',
	},
	totalText: {
		fontSize: 22,
		fontWeight: '700',
		marginTop: 16,
	},
	footer: {
		borderTopWidth: StyleSheet.hairlineWidth,
		paddingHorizontal: 16,
		paddingTop: 12,
	},
	rollButton: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 10,
		height: 52,
		borderRadius: 12,
	},
	rollButtonText: {
		color: '#ffffff',
		fontSize: 17,
		fontWeight: '600',
	},
});
