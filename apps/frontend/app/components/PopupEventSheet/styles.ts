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
	sheetHeaderClose: {
		width: '100%',
		flexDirection: 'column',
		borderTopRightRadius: 28,
		borderTopLeftRadius: 28,
	},
	sheetHeaderText: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
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
		textAlign: 'center',
	},
	popupContainer: {
		width: '100%',
		paddingHorizontal: 10,
		gap: 20,
		marginTop: 30,
		alignItems: 'center',
	},
	imageContainer: {
		width: '100%',
		height: 300,
	},
	image: {
		width: '100%',
		height: '100%',
		resizeMode: 'contain',
	},
	dummy: {},
});
