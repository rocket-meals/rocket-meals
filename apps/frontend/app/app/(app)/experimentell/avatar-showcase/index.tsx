import React, { useState, useMemo } from 'react';
import { ScrollView, Text, View, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useAppSelector } from '@/redux/hooks';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { TranslationKeys } from '@/locales/keys';
import { MyAvatar, MyAvatarStyle, MyAvatarShape } from 'repo-depkit-common-ui';
import SettingsList from '@/components/SettingsList';

const ALL_STYLES = Object.values(MyAvatarStyle);
const ALL_SHAPES = Object.values(MyAvatarShape);

const AvatarShowcase = () => {
	useSetPageTitle(TranslationKeys.avatar_showcase);
	const { theme } = useTheme();
	const { primaryColor } = useAppSelector((state) => state.settings);

	const [seed, setSeed] = useState('John Doe');
	const [selectedStyleIndex, setSelectedStyleIndex] = useState(ALL_STYLES.indexOf(MyAvatarStyle.LORELEI));
	const [selectedShapeIndex, setSelectedShapeIndex] = useState(0);

	const selectedStyle = ALL_STYLES[selectedStyleIndex];
	const selectedShape = ALL_SHAPES[selectedShapeIndex];

	const seeds = useMemo(() => ['John Doe', 'Jane', 'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'], []);

	const handlePrevStyle = () => {
		setSelectedStyleIndex((prev) => (prev - 1 + ALL_STYLES.length) % ALL_STYLES.length);
	};

	const handleNextStyle = () => {
		setSelectedStyleIndex((prev) => (prev + 1) % ALL_STYLES.length);
	};

	const handlePrevShape = () => {
		setSelectedShapeIndex((prev) => (prev - 1 + ALL_SHAPES.length) % ALL_SHAPES.length);
	};

	const handleNextShape = () => {
		setSelectedShapeIndex((prev) => (prev + 1) % ALL_SHAPES.length);
	};

	return (
		<ScrollView
			style={{ flex: 1, backgroundColor: theme.screen.background }}
			contentContainerStyle={{ padding: 20 }}
		>
			<Text style={{ ...localStyles.heading, color: theme.screen.text }}>Avatar Showcase</Text>

			{/* Main Avatar Preview */}
			<View style={localStyles.previewContainer}>
				<MyAvatar seed={seed} style={selectedStyle} size={160} shape={selectedShape} />
			</View>

			{/* Style Selector with Buttons */}
			<Text style={{ ...localStyles.sectionTitle, color: theme.screen.text }}>Style</Text>
			<View style={localStyles.selectorRow}>
				<Pressable onPress={handlePrevStyle} style={({ pressed }) => [localStyles.navButton, { backgroundColor: primaryColor, opacity: pressed ? 0.7 : 1 }]}>
					<MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
				</Pressable>
				<Text style={{ ...localStyles.selectorLabel, color: theme.screen.text }}>{selectedStyle}</Text>
				<Pressable onPress={handleNextStyle} style={({ pressed }) => [localStyles.navButton, { backgroundColor: primaryColor, opacity: pressed ? 0.7 : 1 }]}>
					<MaterialCommunityIcons name="chevron-right" size={28} color="#fff" />
				</Pressable>
			</View>

			{/* Shape Selector with Buttons */}
			<Text style={{ ...localStyles.sectionTitle, color: theme.screen.text }}>Shape</Text>
			<View style={localStyles.selectorRow}>
				<Pressable onPress={handlePrevShape} style={({ pressed }) => [localStyles.navButton, { backgroundColor: primaryColor, opacity: pressed ? 0.7 : 1 }]}>
					<MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
				</Pressable>
				<Text style={{ ...localStyles.selectorLabel, color: theme.screen.text }}>{selectedShape}</Text>
				<Pressable onPress={handleNextShape} style={({ pressed }) => [localStyles.navButton, { backgroundColor: primaryColor, opacity: pressed ? 0.7 : 1 }]}>
					<MaterialCommunityIcons name="chevron-right" size={28} color="#fff" />
				</Pressable>
			</View>

			{/* Seed Selection via SettingsList */}
			<Text style={{ ...localStyles.sectionTitle, color: theme.screen.text }}>Seed</Text>
			{seeds.map((s, index) => {
				const totalItems = seeds.length;
				const groupPosition = totalItems === 1 ? 'single' : index === 0 ? 'top' : index === totalItems - 1 ? 'bottom' : 'middle';
				const isSelected = s === seed;

				return (
					<SettingsList
						key={s}
						iconBgColor={primaryColor}
						label={s}
						leftIcon={<MaterialCommunityIcons name={isSelected ? 'radiobox-marked' : 'radiobox-blank'} size={24} color={isSelected ? primaryColor : theme.screen.icon} />}
						handleFunction={() => setSeed(s)}
						groupPosition={groupPosition}
					/>
				);
			})}

			{/* Grid of all styles with current seed */}
			<Text style={{ ...localStyles.sectionTitle, color: theme.screen.text }}>All Styles Preview</Text>
			<View style={localStyles.gridContainer}>
				{ALL_STYLES.map((avatarStyle) => (
					<Pressable
						key={avatarStyle}
						onPress={() => setSelectedStyleIndex(ALL_STYLES.indexOf(avatarStyle))}
						style={({ pressed }) => [
							localStyles.gridItem,
							{
								backgroundColor: theme.card.background,
								borderColor: avatarStyle === selectedStyle ? primaryColor : 'transparent',
								borderWidth: 2,
								opacity: pressed ? 0.7 : 1,
							},
						]}
					>
						<MyAvatar seed={seed} style={avatarStyle} size={64} shape={selectedShape} />
						<Text style={{ ...localStyles.gridLabel, color: theme.screen.text }} numberOfLines={1}>{avatarStyle}</Text>
					</Pressable>
				))}
			</View>
		</ScrollView>
	);
};

const localStyles = StyleSheet.create({
	heading: {
		fontSize: 24,
		fontFamily: 'Poppins_700Bold',
		marginVertical: 10,
		textAlign: 'center',
	},
	sectionTitle: {
		fontSize: 16,
		fontFamily: 'Poppins_600SemiBold',
		marginTop: 20,
		marginBottom: 8,
	},
	previewContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 20,
	},
	selectorRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 16,
		marginBottom: 8,
	},
	navButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		alignItems: 'center',
		justifyContent: 'center',
	},
	selectorLabel: {
		fontSize: 16,
		fontFamily: 'Poppins_600SemiBold',
		minWidth: 160,
		textAlign: 'center',
	},
	gridContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'center',
		gap: 12,
		paddingVertical: 12,
	},
	gridItem: {
		alignItems: 'center',
		padding: 8,
		borderRadius: 12,
		width: 100,
	},
	gridLabel: {
		fontSize: 10,
		marginTop: 4,
		textAlign: 'center',
	},
});

export default AvatarShowcase;
