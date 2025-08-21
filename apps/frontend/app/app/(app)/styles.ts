import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	mainContainer: {
		flex: 1,
	},

	sheetHeading: {
		fontSize: 26,
		fontFamily: 'Poppins_400Regular',
	},
	canteensContainer: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'stretch',
		flexWrap: 'wrap',
		rowGap: 10,
		marginTop: 20,
	},
	card: {
		borderRadius: 18,
		paddingBottom: 10,
	},
	imageContainer: {
		width: '100%',
		borderRadius: 18,
	},
	image: {
		width: '100%',
		height: '100%',
		borderTopRightRadius: 18,
		borderTopLeftRadius: 18,
		resizeMode: 'cover',
	},
	canteenName: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
		textAlign: 'center',
		marginTop: 5,
		paddingHorizontal: 5,
	},
	archiveContainer: {
		width: 35,
		height: 35,
		borderRadius: 50,
		backgroundColor: 'rgba(0,0,0,0.2)',
		justifyContent: 'center',
		alignItems: 'center',
		position: 'absolute',
		top: 5,
		right: 5,
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
		gap: 10,
	},
	continueButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 10,
		paddingHorizontal: 20,
		borderRadius: 10,
	},
	continueLabel: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
		marginLeft: 5,
	},
});
