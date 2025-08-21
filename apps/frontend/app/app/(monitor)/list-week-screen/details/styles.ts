import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		flexGrow: 1,
		flexDirection: 'column',
	},
	headerRow: {
		flexDirection: 'row',
		borderBottomWidth: 1,
		paddingVertical: 5,
	},
	dataRow: {
		flexDirection: 'row',
	},
	shortCode: {
		borderRadius: 8,
		borderWidth: 1,
		padding: 5,
		justifyContent: 'center',
		alignItems: 'center',
	},
	iconMarking: {
		borderRadius: 8,
		borderWidth: 1,
		padding: 2,
		justifyContent: 'center',
		alignItems: 'center',
	},
	cell: {
		paddingHorizontal: 2,
	},
	icon: {
		width: 30,
		height: 30,
		resizeMode: 'cover',
		borderRadius: 25,
	},
	title: {
		fontSize: 10,
		fontFamily: 'Poppins_400Regular',
	},
	headerText: {
		fontFamily: 'Poppins_700Bold',
		fontSize: 10,
		textAlign: 'center',
	},
	itemText: {
		color: '#fff',
		fontFamily: 'Poppins_400Regular',
	},
	noDataFound: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
	},
	noOffersText: {
		fontSize: 10,
		fontFamily: 'Poppins_400Regular',
		textAlign: 'center',
	},
});
