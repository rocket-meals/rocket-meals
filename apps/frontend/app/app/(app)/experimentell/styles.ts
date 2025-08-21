import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		flex: 1,
	},
	contentContainer: {},
	content: {
		width: '100%',
		height: '100%',
		padding: 20,
	},
	heading: {
		fontSize: 24,
		fontFamily: 'Poppins_700Bold',
		marginVertical: 10,
	},
	listItem: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderRadius: 10,
		padding: 10,
		marginVertical: 10,
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
});
