import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		flex: 1,
	},
	contentContainer: {},
	content: {
		width: '100%',
		height: '100%',
		paddingVertical: 20,
		paddingHorizontal: 10,
		alignItems: 'center',
	},
	itemsContainer: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'stretch',
		justifyContent: 'center',
		flexWrap: 'nowrap',
		gap: 10,
		marginTop: 20,
	},
	icon: {
		width: 120,
		height: 120,
		resizeMode: 'contain',
		marginBottom: 10,
	},
});
