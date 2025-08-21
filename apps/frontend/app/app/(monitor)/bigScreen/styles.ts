import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		flex: 1,
	},
	col2: {
		justifyContent: 'center',
		alignItems: 'center',
	},
	text: {
		fontSize: 18,
		textAlign: 'center',
	},
	headerContainer: {
		width: '100%',
		flexDirection: 'row',
	},
	headerCol1: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
	},
	headerCol2: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		marginBottom: 10,
		marginRight: 10,
	},
	headerFoodLabel: {
		fontSize: 14,
		fontFamily: 'Poppins_400Regular',
	},
	logoContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	labelText: {
		flex: 1,
		paddingHorizontal: 10,
		gap: 10,
	},
	logo: {
		width: 300,
		height: 100,
		marginRight: 10,
	},
	label: {
		fontSize: 26,
		fontFamily: 'Poppins_700Bold',
	},
	row: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	offlineChip: {
		width: 100,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'red',
		padding: 4,
		borderRadius: 25,
	},
	timestamp: {
		fontSize: 14,
		fontFamily: 'Poppins_400Regular',
	},
	contentWrapper: {
		paddingRight: 50,
		paddingVertical: 20,
		justifyContent: 'space-between',
		gap: 100,
	},
	foodAliasContainer: {
		width: '100%',
		alignItems: 'flex-end',
		gap: 10,
	},
	foodDetailsContainer: {
		width: '100%',
		alignItems: 'flex-end',
		gap: 10,
	},
	subHeading: {
		fontSize: 24,
		fontFamily: 'Poppins_400Regular',
	},
	heading: {
		fontFamily: 'Poppins_700Bold',
	},
	body: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
	},
	labelsContainer: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'flex-end',
		alignItems: 'center',
		gap: 5,
	},
	shortCode: {
		borderRadius: 8,
		borderWidth: 1,
		padding: 4,
		justifyContent: 'center',
		alignItems: 'center',
	},
	icon: {
		width: 30,
		height: 30,
		resizeMode: 'cover',
		borderRadius: 25,
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		marginVertical: 20,
	},
	dummy: {},
});
