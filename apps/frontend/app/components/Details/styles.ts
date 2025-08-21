import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		flex: 1,
	},
	heading: {
		fontSize: 26,
		fontFamily: 'Poppins_700Bold',
		marginVertical: 20,
	},
	row: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		marginTop: 10,
	},
	nutritionsContainer: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'flex-start',
		flexWrap: 'wrap',
		marginVertical: 20,
		gap: 20,
		columnGap: 10,
	},
	nutrition: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 5,
		minWidth: 100,
		maxWidth: 200,
		height: 60,
		justifyContent: 'flex-start',
	},
	groupedAttributes: {
		width: '100%',
	},
	averageNutrition: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'flex-start',
		gap: 5,
		minWidth: 120,
		flex: 1,
		height: 60,
	},
	iconContainer: {
		width: 24,
	},
	nutritionDetails: {
		alignItems: 'flex-start',
		flexShrink: 1,
	},
	label: {
		fontSize: 14,
		fontFamily: 'Poppins_400Regular',
		flexShrink: 1,
	},
	body: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
	},
	body1: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
		marginTop: 40,
	},
});
