import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	card: {
		borderRadius: 18,
		paddingBottom: 0,
	},
	imageContainer: {
		width: '100%',
		borderRadius: 18,
		position: 'relative',
	},
	image: {
		width: '100%',
		height: '100%',
		borderTopRightRadius: 18,
		borderTopLeftRadius: 18,
		resizeMode: 'cover',
	},
	cardContent: {
		alignItems: 'stretch',
		justifyContent: 'center',
		flex: 1,
		paddingBottom: 9,
	},
});
