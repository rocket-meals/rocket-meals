import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		width: '100%',
	},
	inputContainer: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 10,
		paddingVertical: 5,
	},
	ibanInput: {
		height: 50,
		fontFamily: 'Poppins_400Regular',
		borderWidth: 1,
		outline: 'none',
		outlineColor: 'transparent',
		borderColor: '#3A3A3A',
		fontSize: 16,
		textAlign: 'left',
		paddingHorizontal: 20,
	},
	prefix: {
		height: 50,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#3A3A3A',
		borderTopLeftRadius: 10,
		borderBottomLeftRadius: 10,
	},
	suffix: {
		height: 50,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#3A3A3A',
		borderTopRightRadius: 10,
		borderBottomRightRadius: 10,
	},
	label: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
	},
	errorText: {
		fontSize: 10,
		marginTop: 5,
	},
});
