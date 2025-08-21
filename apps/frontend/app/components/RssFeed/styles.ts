import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		flex: 1,
	},
	contentContainer: {
		flexGrow: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	title: {
		fontSize: 24,
		fontFamily: 'Poppins_700Bold',
		marginBottom: 10,
		textAlign: 'center',
	},
	body: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
		textAlign: 'center',
	},
	image: {
		width: 300,
		height: 300,
		marginBottom: 10,
		borderRadius: 8,
		alignSelf: 'center',
	},
});
