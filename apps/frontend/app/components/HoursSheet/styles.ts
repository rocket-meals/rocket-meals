import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	sheetView: {
		width: '100%',
		height: '100%',
		borderTopRightRadius: 28,
		borderTopLeftRadius: 28,
		padding: 10,
		paddingBottom: 0,
	},
	contentContainer: {
		alignItems: 'center',
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
	hoursContainer: {
		paddingHorizontal: 20,
		marginTop: 20,
		width: '100%',
	},
	hoursHeading: {
		fontSize: 24,
		fontFamily: 'Poppins_700Bold',
	},
	row: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 15,
	},
	body: {
		fontSize: 18,
		fontFamily: 'Poppins_400Regular',
	},
	section: {
		marginTop: 20,
	},
	empty: {
		fontSize: 18,
		fontFamily: 'Poppins_400Regular',
	},
});
