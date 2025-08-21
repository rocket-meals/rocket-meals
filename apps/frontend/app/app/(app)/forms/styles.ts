import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		flex: 1,
	},
	contentContainer: {
		alignItems: 'center',
		paddingVertical: 20,
	},
	formCategories: {
		gap: 10,
	},
	formCategory: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderRadius: 10,
		padding: 10,
	},
	col: {
		maxWidth: '70%',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	body: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
	},
	dummy: {},
});
