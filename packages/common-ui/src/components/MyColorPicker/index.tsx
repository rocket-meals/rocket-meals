import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/** General-purpose color palette (suitable for backgrounds, clothing, accessories, etc.) */
export const PRESET_COLORS = [
	// Whites, Grays & Black
	'#ffffff', // White
	'#e5e5e5', // Light Gray
	'#a3a3a3', // Gray
	'#525252', // Dark Gray
	'#000000', // Black
	// Blues
	'#bfdbfe', // Light Blue
	'#3b82f6', // Blue
	'#1d4ed8', // Dark Blue
	'#1e3a8a', // Navy
	// Greens
	'#bbf7d0', // Light Green
	'#22c55e', // Green
	'#15803d', // Dark Green
	// Reds
	'#fecaca', // Light Red
	'#ef4444', // Red
	'#b91c1c', // Dark Red
	// Oranges
	'#fed7aa', // Light Orange
	'#f97316', // Orange
	'#ea580c', // Dark Orange
	// Yellows
	'#fef08a', // Light Yellow
	'#facc15', // Yellow
	'#ca8a04', // Amber
	// Purples
	'#e9d5ff', // Light Purple
	'#a855f7', // Purple
	'#7c3aed', // Dark Purple
	// Pinks
	'#fbcfe8', // Light Pink
	'#ec4899', // Pink
	'#be185d', // Dark Pink
	// Cyans & Teals
	'#a5f3fc', // Light Cyan
	'#06b6d4', // Cyan
	'#0e7490', // Dark Teal
	// Earth Tones
	'#d4a574', // Tan
	'#92400e', // Brown
];

/** Natural and fashion hair color palette */
export const HAIR_COLORS = [
	// Natural
	'#000000', // Black
	'#2c1b18', // Dark Brown
	'#4a312c', // Brown
	'#724133', // Light Brown
	'#a55728', // Auburn
	'#b55239', // Red-Brown
	'#d6b370', // Blonde
	'#e8d9b4', // Light Blonde
	'#f59797', // Strawberry Red
	'#9c6442', // Chestnut
	'#b7a69e', // Gray
	'#d0cfc5', // Light Gray
	'#ffffff', // White
	// Fashion / Fantasy
	'#c13b78', // Dark Pink
	'#e91e8c', // Vivid Pink
	'#9b59b6', // Purple
	'#3498db', // Blue
	'#2ecc71', // Green
	'#e67e22', // Bright Orange
];

/** Human skin tone palette */
export const SKIN_COLORS = [
	'#ffffff', // White
	'#ffe0bd', // Porcelain
	'#fddbb4', // Very Light
	'#edb98a', // Light
	'#d08b5b', // Medium Light
	'#ae5d29', // Medium
	'#694d3d', // Medium Dark
	'#4a312c', // Dark
	'#3d1c02', // Very Dark
	'#000000', // Black
];

export type MyColorPickerProps = {
	colors: string[];
	selectedColor: string | null;
	onSelect: (color: string) => void;
};

const MyColorPicker: React.FC<MyColorPickerProps> = ({ colors, selectedColor, onSelect }) => {
	return (
		<View style={styles.container}>
			{colors.map((color) => (
				<TouchableOpacity
					key={color}
					style={[
						styles.swatch,
						{ backgroundColor: color },
						selectedColor?.toLowerCase() === color.toLowerCase() && styles.swatchSelected,
					]}
					onPress={() => onSelect(color)}
					activeOpacity={0.7}
				>
					{selectedColor?.toLowerCase() === color.toLowerCase() && (
						<Ionicons name="checkmark" size={22} color="#ffffff" />
					)}
				</TouchableOpacity>
			))}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
		padding: 12,
		justifyContent: 'center',
	},
	swatch: {
		width: 44,
		height: 44,
		borderRadius: 22,
		justifyContent: 'center',
		alignItems: 'center',
	},
	swatchSelected: {
		borderWidth: 3,
		borderColor: '#ffffff',
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 4,
		elevation: 4,
	},
});

export default MyColorPicker;
