import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	sheetView: {
		width: '100%',
		height: '100%',
		borderTopRightRadius: 28,
		borderTopLeftRadius: 28,
		padding: 10,
		paddingBottom: 20,
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
		fontSize: 28,
	},
	sheetInput: {
		width: '100%',
		height: 60,
		borderRadius: 20,
		paddingHorizontal: 20,
		borderWidth: 1,
		marginTop: 20,
		fontFamily: 'Poppins_400Regular',
		fontSize: 18,
	},
	buttonContainer: {
		width: '60%',
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 30,
	},
	cancelButton: {
		flex: 1,
		height: 52,
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 50,
		borderWidth: 1,
		marginRight: 10,
	},
	saveButton: {
		flex: 1,
		height: 52,
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 50,
		marginLeft: 10,
	},
	buttonText: {
		fontSize: 16,
		fontFamily: 'Poppins_700Bold',
	},
});
