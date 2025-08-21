import { Dimensions, StyleSheet } from 'react-native';

const { width } = Dimensions.get('window'); // To handle responsiveness

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
	notificationContent: {
		width: '100%',
		alignItems: 'center',
	},
	gifContainer: {
		width: 250,
		height: 250,
		alignItems: 'center',
		marginVertical: 20,
	},
	gif: {
		width: 160,
		height: 160,
		resizeMode: 'contain',
	},
	body: {
		width: '100%',
		textAlign: 'center',
		fontFamily: 'Poppins_400Regular',
		marginBottom: 20,
	},
	button: {
		width: 300,
		height: 47,
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 10,
		marginVertical: 20,
	},
	buttonLabel: {
		fontSize: 16,
		fontFamily: 'Poppins_700Bold',
	},
	cancelButton: {
		width: 300,
		height: 47,
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 10,
		borderWidth: 2,
	},
	dummy: {},
});
