import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		width: '100%',
		height: 180,
		marginBottom: 10,
		borderRadius: 10,
		borderWidth: 1,
		flexDirection: 'row',
	},
	imageContainer: {
		width: 178,
		height: 178,
		position: 'relative',
		borderRadius: 10,
	},
	image: {
		width: '100%',
		height: '100%',
		borderRadius: 10,
	},
	ratingContainer: {
		flex: 1,
		borderTopRightRadius: 10,
		borderBottomRightRadius: 10,
	},
	row: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	col: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	label: {
		fontFamily: 'Poppins_400Regular',
		marginTop: 4,
	},
	value: {
		fontSize: 12,
		fontFamily: 'Poppins_400Regular',
		marginTop: 4,
	},
	uploadImage: {
		position: 'absolute',
		bottom: 5,
		left: 5,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		width: 35,
		height: 35,
		borderRadius: 50,
		backgroundColor: 'rgba(0,0,0,0.2)',
	},
	dummy: {},
});
