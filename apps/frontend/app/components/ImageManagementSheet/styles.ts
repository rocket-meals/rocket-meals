import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	sheetView: {
		flex: 1,
		height: '100%',
		borderTopRightRadius: 28,
		borderTopLeftRadius: 28,
		alignItems: 'center',
		padding: 10,
		paddingBottom: 0,
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

		fontSize: 24,
		textAlign: 'center',
	},
	mainContentContainer: {
		width: '100%',
	},
	menuHeading: {
		fontSize: 24,
		fontFamily: 'Poppins_700Bold',
	},
	row: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 20,
		paddingVertical: 10,
		paddingHorizontal: 20,
		borderRadius: 12,
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
	body: {
		fontSize: 18,
		fontFamily: 'Poppins_400Regular',
		marginBottom: 20,
	},
});
