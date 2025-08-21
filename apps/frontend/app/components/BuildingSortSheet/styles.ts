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
	sortingListContainer: {
		width: '100%',
		paddingHorizontal: 10,
		gap: 20,
		marginTop: 30,
	},
	actionItem: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 10,
		paddingHorizontal: 20,
		borderRadius: 10,
	},
	col: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	label: {
		fontSize: 18,
		fontFamily: 'Poppins_400Regular',
	},
	checkbox: {
		width: 20,
		height: 20,
		borderRadius: 50,
	},
	canteenName: {
		fontSize: 18,
		fontFamily: 'Poppins_700Bold',
		textAlign: 'center',
		marginTop: 10,
	},
});
