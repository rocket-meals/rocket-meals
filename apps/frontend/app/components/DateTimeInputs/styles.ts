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
	input: {
		height: 50,
		paddingHorizontal: 20,
		fontFamily: 'Poppins_400Regular',
		fontSize: 16,
		borderWidth: 1,
		borderColor: '#3A3A3A',
		outline: 'none',
		outlineColor: 'transparent',
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
	invalidBorder: {
		borderColor: 'red',
	},
	errorText: {
		color: 'red',
		fontSize: 10,
		marginTop: 5,
		marginLeft: 5,
		fontFamily: 'Poppins_400Regular',
	},
});
