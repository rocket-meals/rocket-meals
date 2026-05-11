import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Entypo, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppSelector } from '@/redux/hooks';
import { useTheme } from '@/hooks/useTheme';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { TranslationKeys } from '@/locales/keys';
import SettingsList from '@/components/SettingsList';

// ─── Shimmer hook ────────────────────────────────────────────────────────────
// Animates a stripe that flashes from left to right every few seconds.
function useShimmer(intervalMs = 3500, durationMs = 900) {
	const translateX = useRef(new Animated.Value(-200)).current;

	useEffect(() => {
		let cancelled = false;

		const runOnce = () => {
			translateX.setValue(-200);
			Animated.timing(translateX, {
				toValue: 400,
				duration: durationMs,
				useNativeDriver: true,
			}).start(() => {
				if (!cancelled) {
					setTimeout(runOnce, intervalMs);
				}
			});
		};

		const timer = setTimeout(runOnce, intervalMs * 0.3);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [translateX, intervalMs, durationMs]);

	return translateX;
}

// ─── ShimmerOverlay component ─────────────────────────────────────────────────
const ShimmerOverlay = () => {
	const translateX = useShimmer();
	return (
		<Animated.View
			pointerEvents="none"
			style={[
				styles.shimmerOverlay,
				{
					transform: [{ translateX }, { skewX: '-20deg' }],
					width: 80,
					height: '100%',
					backgroundColor: 'rgba(255,255,255,0.25)',
				},
			]}
		/>
	);
};

// ─── PulsingBorderWrapper ─────────────────────────────────────────────────────
const PulsingBorderWrapper = ({ children, primaryColor }: { children: React.ReactNode; primaryColor: string }) => {
	const opacity = useRef(new Animated.Value(1)).current;

	useEffect(() => {
		Animated.loop(
			Animated.sequence([
				Animated.timing(opacity, { toValue: 0.25, duration: 900, useNativeDriver: true }),
				Animated.timing(opacity, { toValue: 1, duration: 900, useNativeDriver: true }),
			])
		).start();
	}, [opacity]);

	return (
		<View style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
			<Animated.View
				pointerEvents="none"
				style={{
					...StyleSheet.absoluteFillObject,
					borderRadius: 12,
					borderWidth: 2,
					borderColor: primaryColor,
					opacity,
					zIndex: 5,
				}}
			/>
			{children}
		</View>
	);
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
const AccountRequiredExample = () => {
	useSetPageTitle(TranslationKeys.account_required_example);
	const { theme } = useTheme();
	const { primaryColor } = useAppSelector((state) => state.settings);

	const iconColor = theme.screen.icon;
	const textColor = theme.screen.text;
	const bg = theme.screen.background;

	return (
		<ScrollView
			style={[styles.container, { backgroundColor: bg }]}
			contentContainerStyle={[styles.contentContainer, { backgroundColor: bg }]}
		>
			<View style={styles.content}>
				<Text style={[styles.heading, { color: textColor }]}>Account Required - Beispiele</Text>

				{/* ── 1. Default isAccountRequired ─────────────────────────────── */}
				<Text style={[styles.sectionTitle, { color: textColor }]}>1. Default isAccountRequired</Text>
				<Text style={[styles.sectionDescription, { color: textColor }]}>Standard-Anzeige wenn ein Account erforderlich ist: gestrichelter Rahmen und gedimmtes Schloss-Icon.</Text>
				<SettingsList
					iconBgColor={primaryColor}
					leftIcon={<MaterialCommunityIcons name="information-outline" size={24} color={iconColor} />}
					label="Account-Funktion"
					isAccountRequired
					groupPosition="single"
				/>

				{/* ── 2. Lock icon in the right slot ────────────────────────────── */}
				<Text style={[styles.sectionTitle, { color: textColor }]}>2. Schloss-Icon rechts</Text>
				<Text style={[styles.sectionDescription, { color: textColor }]}>Das Schloss-Icon zeigt deutlich, dass ein Account benötigt wird.</Text>
				<SettingsList
					iconBgColor={primaryColor}
					leftIcon={<MaterialCommunityIcons name="star-outline" size={24} color={iconColor} />}
					label="Premium Funktion"
					rightIcon={<MaterialCommunityIcons name="lock-outline" color="#F5C518" size={22} />}
					handleFunction={() => {}}
					groupPosition="single"
				/>

				{/* ── 3. Gold / Premium border ──────────────────────────────────── */}
				<Text style={[styles.sectionTitle, { color: textColor }]}>3. Gold-Rahmen (Premium)</Text>
				<Text style={[styles.sectionDescription, { color: textColor }]}>Ein goldener Rahmen signalisiert Premium-Inhalt.</Text>
				<View style={styles.goldBorderWrapper}>
					<SettingsList
						iconBgColor="#F5C518"
						leftIcon={<MaterialCommunityIcons name="crown-outline" size={24} color={iconColor} />}
						label="Premium-Funktion"
						value="Account erforderlich"
						rightIcon={<MaterialCommunityIcons name="lock-outline" color="#F5C518" size={22} />}
						handleFunction={() => {}}
						groupPosition="single"
					/>
				</View>

				{/* ── 4. Dashed border ──────────────────────────────────────────── */}
				<Text style={[styles.sectionTitle, { color: textColor }]}>4. Gestrichelter Rahmen</Text>
				<Text style={[styles.sectionDescription, { color: textColor }]}>Ein gestrichelter Rahmen deutet an, dass die Funktion noch "gesperrt" ist.</Text>
				<View style={[styles.dashedBorderWrapper, { borderColor: primaryColor }]}>
					<SettingsList
						iconBgColor={primaryColor}
						leftIcon={<MaterialCommunityIcons name="lock-outline" size={24} color={iconColor} />}
						label="Gesperrte Aktion"
						value="Login erforderlich"
						rightIcon={<Entypo name="chevron-small-right" color={iconColor} size={24} />}
						handleFunction={() => {}}
						groupPosition="single"
					/>
				</View>

				{/* ── 5. Shimmer flash animation ────────────────────────────────── */}
				<Text style={[styles.sectionTitle, { color: textColor }]}>5. Schimmer-Animation (Blitz-Streifen)</Text>
				<Text style={[styles.sectionDescription, { color: textColor }]}>
					Ein Lichtstreifen gleitet alle paar Sekunden von links nach rechts - ein subtiler Hinweis auf Premium.
				</Text>
				<View style={[styles.shimmerWrapper, { borderWidth: 2, borderColor: primaryColor }]}>
					<SettingsList
						iconBgColor={primaryColor}
						leftIcon={<MaterialCommunityIcons name="account-lock-outline" size={24} color={iconColor} />}
						label="Account-Funktion"
						value="Jetzt freischalten"
						rightIcon={<MaterialCommunityIcons name="lock-outline" color={primaryColor} size={22} />}
						handleFunction={() => {}}
						groupPosition="single"
					/>
					<ShimmerOverlay />
				</View>

				{/* ── 6. Lock badge overlay ─────────────────────────────────────── */}
				<Text style={[styles.sectionTitle, { color: textColor }]}>6. Schloss-Badge (Overlay)</Text>
				<Text style={[styles.sectionDescription, { color: textColor }]}>Ein kleines Badge-Icon überlagert den Button in der Ecke.</Text>
				<View style={styles.lockBadgeContainer}>
					<SettingsList
						iconBgColor={primaryColor}
						leftIcon={<MaterialCommunityIcons name="bell-outline" size={24} color={iconColor} />}
						label="Benachrichtigungen"
						rightIcon={<Entypo name="chevron-small-right" color={iconColor} size={24} />}
						handleFunction={() => {}}
						groupPosition="single"
					/>
					<View style={[styles.lockBadge, { backgroundColor: '#F5C518' }]}>
						<MaterialCommunityIcons name="lock" size={14} color="#fff" />
					</View>
				</View>

				{/* ── 7. Dimmed / disabled overlay ─────────────────────────────── */}
				<Text style={[styles.sectionTitle, { color: textColor }]}>7. Gedimmt (deaktiviert)</Text>
				<Text style={[styles.sectionDescription, { color: textColor }]}>Der Button ist sichtbar, aber halbtransparent überlagert und nicht klickbar.</Text>
				<View style={styles.dimContent}>
					<SettingsList
						iconBgColor={primaryColor}
						leftIcon={<MaterialCommunityIcons name="chart-bar" size={24} color={iconColor} />}
						label="Statistiken"
						value="Nur für angemeldete Nutzer"
						rightIcon={<Entypo name="chevron-small-right" color={iconColor} size={24} />}
						groupPosition="single"
					/>
					<View style={[styles.dimOverlay, { backgroundColor: 'rgba(128,128,128,0.45)' }]}>
						<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
							<MaterialCommunityIcons name="lock" size={28} color="#fff" />
						</View>
					</View>
				</View>

				{/* ── 8. Custom dark button with shimmer ───────────────────────── */}
				<Text style={[styles.sectionTitle, { color: textColor }]}>8. Benutzerdefinierter Button (Hintergrund-Schimmer)</Text>
				<Text style={[styles.sectionDescription, { color: textColor }]}>Ein komplett eigener Button mit einem Schimmer auf dem Hintergrund.</Text>
				<View style={[styles.shimmerWrapper, { borderWidth: 2, borderColor: '#F5C518' }]}>
					<TouchableOpacity
						activeOpacity={0.8}
						onPress={() => {}}
						style={{
							backgroundColor: '#1a1a2e',
							borderRadius: 12,
							flexDirection: 'row',
							alignItems: 'center',
							padding: 14,
							gap: 12,
						}}
					>
						<View
							style={{
								width: 40,
								height: 40,
								borderRadius: 10,
								backgroundColor: '#F5C518',
								justifyContent: 'center',
								alignItems: 'center',
							}}
						>
							<MaterialCommunityIcons name="crown" size={22} color="#1a1a2e" />
						</View>
						<View style={{ flex: 1 }}>
							<Text style={{ color: '#F5C518', fontFamily: 'Poppins_700Bold', fontSize: 15 }}>Premium freischalten</Text>
							<Text style={{ color: '#aaa', fontFamily: 'Poppins_400Regular', fontSize: 12 }}>Account erforderlich</Text>
						</View>
						<MaterialCommunityIcons name="chevron-right" size={22} color="#F5C518" />
					</TouchableOpacity>
					<ShimmerOverlay />
				</View>

				{/* ── 9. Pulsing border animation ───────────────────────────────── */}
				<Text style={[styles.sectionTitle, { color: textColor }]}>9. Pulsierender Rahmen</Text>
				<Text style={[styles.sectionDescription, { color: textColor }]}>Der Rahmen pulsiert sanft, um Aufmerksamkeit zu erregen.</Text>
				<PulsingBorderWrapper primaryColor={primaryColor}>
					<SettingsList
						iconBgColor={primaryColor}
						leftIcon={<MaterialCommunityIcons name="account-circle-outline" size={24} color={iconColor} />}
						label="Profil-Einstellungen"
						value="Account erforderlich"
						rightIcon={<MaterialCommunityIcons name="lock-outline" color={primaryColor} size={22} />}
						handleFunction={() => {}}
						groupPosition="single"
					/>
				</PulsingBorderWrapper>
			</View>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	contentContainer: {},
	content: {
		width: '100%',
		padding: 20,
		rowGap: 12,
	},
	heading: {
		fontSize: 24,
		fontFamily: 'Poppins_700Bold',
		marginVertical: 10,
	},
	sectionTitle: {
		fontSize: 16,
		fontFamily: 'Poppins_600SemiBold',
		marginTop: 16,
	},
	sectionDescription: {
		fontSize: 13,
		fontFamily: 'Poppins_400Regular',
		marginBottom: 4,
		opacity: 0.7,
	},
	goldBorderWrapper: {
		borderRadius: 12,
		borderWidth: 2,
		borderColor: '#F5C518',
		overflow: 'hidden',
	},
	shimmerWrapper: {
		borderRadius: 12,
		overflow: 'hidden',
	},
	shimmerOverlay: {
		...StyleSheet.absoluteFillObject,
		zIndex: 10,
	},
	lockBadgeContainer: {
		position: 'relative',
	},
	lockBadge: {
		position: 'absolute',
		top: 0,
		right: 0,
		width: 28,
		height: 28,
		borderRadius: 14,
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 20,
		elevation: 4,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.3,
		shadowRadius: 2,
	},
	dashedBorderWrapper: {
		borderRadius: 12,
		borderWidth: 2,
		borderStyle: 'dashed',
		overflow: 'hidden',
	},
	dimOverlay: {
		...StyleSheet.absoluteFillObject,
		borderRadius: 12,
		zIndex: 10,
	},
	dimContent: {
		position: 'relative',
	},
});

export default AccountRequiredExample;

