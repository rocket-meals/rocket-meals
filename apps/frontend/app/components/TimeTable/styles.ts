import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	list: {
		width: '100%',
		height: 50,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderRadius: 12,
		// backgroundColor: 'red',
		marginTop: 10,
	},
	col: {
		flexDirection: 'row',
		alignItems: 'center',
		width: '48%',
	},
	label: {
		fontFamily: 'Poppins_700Bold',
	},
	value: {
		fontFamily: 'Poppins_400Regular',
	},
	sheetHeader: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		borderTopRightRadius: 28,
		borderTopLeftRadius: 28,
	},
	sheetcloseButton: {
		width: 45,
		height: 45,
		borderRadius: 50,
		justifyContent: 'center',
		alignItems: 'center',
	},
	sheetHeading: {
		fontFamily: 'Poppins_700Bold',
	},
});
