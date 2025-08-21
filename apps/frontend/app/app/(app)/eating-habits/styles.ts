import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		flex: 1,
	},
	contentContainer: {
		width: '100%',
		alignItems: 'center',
		padding: 10,
	},
	gifContainer: {
		width: 200,
		height: 200,
		marginVertical: 40,
	},
	gif: {
		width: '100%',
		height: '100%',
		resizeMode: 'contain',
	},
	eatingHabitsContainer: {
		width: '100%',
	},
	body1: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
	},
	body2: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
		fontStyle: 'italic',
		marginTop: 10,
	},
	feedbackLabelsContainer: {
		marginTop: 10,
		paddingHorizontal: 20,
	},
	readMoreContainer: {
		width: '100%',
		alignItems: 'center',
		marginVertical: 10,
	},
	readMoreButton: {
		width: 130,
		height: 46,
		padding: 10,
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 10,
	},
	readMore: {
		fontSize: 14,
		fontFamily: 'Poppins_400Regular',
	},
	dummy: {},
	sheetBackground: {
		borderTopRightRadius: 30,
		borderTopLeftRadius: 30,
	},
});
