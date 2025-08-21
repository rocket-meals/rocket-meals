import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		width: '100%',
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 10,
		padding: 10,
	},
	signaturePad: {
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 5,
		width: 300,
		height: 150,
		backgroundColor: '#fff',
	},
	fileContainer: {
		width: '100%',
		height: 250,
		alignItems: 'center',
	},
	filePreview: {
		width: '100%',
		height: '100%',
		borderRadius: 4,
		resizeMode: 'contain',
	},
	buttonContainer: {
		width: '100%',
		height: 46,
		flexDirection: 'row',
		justifyContent: 'flex-end',
		alignItems: 'center',
		marginTop: 10,
	},
	button: {
		width: 120,
		height: 44,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 10,
		borderRadius: 5,
	},
	buttonText: {
		marginLeft: 8,
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
	},
});
