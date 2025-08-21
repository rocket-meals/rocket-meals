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
		width: '100%',
		height: 50,
		borderRadius: 10,
		paddingHorizontal: 20,
		fontFamily: 'Poppins_400Regular',
		borderWidth: 1,
		outline: 'none',
		outlineColor: 'transparent',
		borderColor: '#3A3A3A',
		fontSize: 16,
	},
	multiLineInput: {
		width: '100%',
		minHeight: 100,
		borderRadius: 10,
		paddingHorizontal: 20,
		fontFamily: 'Poppins_400Regular',
		borderWidth: 1,
		outline: 'none',
		outlineColor: 'transparent',
		borderColor: '#3A3A3A',
		fontSize: 16,
		textAlignVertical: 'top',
		paddingTop: 10,
	},
});
