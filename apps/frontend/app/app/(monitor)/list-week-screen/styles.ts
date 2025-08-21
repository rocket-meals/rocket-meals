import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		backgroundColor: '#2ecc71',
		padding: 16,
	},
	headerText: {
		fontSize: 20,
		fontFamily: 'Poppins_700Bold',
	},
	currentWeekButton: {
		borderRadius: 8,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 10,
		paddingHorizontal: 20,
	},
	yearSelector: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 16,
	},
	yearsContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 8,
		overflow: 'hidden',
		gap: 5,
	},
	yearButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderWidth: 1,
		borderRadius: 8,
	},
	selectedYear: {
		paddingHorizontal: 20,
	},
	yearText: {
		fontSize: 16,
		color: '#333',
		marginHorizontal: 5,
		fontFamily: 'Poppins_400Regular',
	},
	selectedYearText: {
		fontSize: 16,
		color: '#fff',
		fontFamily: 'Poppins_700Bold',
	},
	weeksContainer: {
		padding: 8,
	},
	weeksGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
	},
	weekButton: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 12,
		marginVertical: 4,
		backgroundColor: '#fff',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#ddd',
	},
	selectedWeek: {},
	weekText: {
		fontSize: 14,
		color: '#000',
		fontFamily: 'Poppins_400Regular',
	},
	selectedWeekText: {
		color: '#fff',
		fontFamily: 'Poppins_400Regular',
	},
});
