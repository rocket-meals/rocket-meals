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
	sheetHeading: {
		fontFamily: 'Poppins_700Bold',
	},
	optionsContainer: {
		width: '100%',
		paddingHorizontal: 10,
		marginTop: 20,
	},
	languageRow: {
		marginTop: 10,
		width: '100%',
		height: 50,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderRadius: 12,
	},
	flagIcon: {
		width: 35.2,
		height: 22,
		marginRight: 10,
	},
	languageText: {
		flex: 1,
		fontSize: 18,
		fontFamily: 'Poppins_400Regular',
	},
	radioButton: {
		marginLeft: 10,
	},
});
