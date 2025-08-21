import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	sheetView: {
		width: '100%',
		height: '100%',
		borderTopRightRadius: 28,
		borderTopLeftRadius: 28,
		paddingBottom: 0,
	},
	contentContainer: {
		alignItems: 'center',
	},
	sheetHeader: {
		width: '100%',
		alignItems: 'flex-end',
		borderTopRightRadius: 28,
		borderTopLeftRadius: 28,
	},
	sheetcloseButton: {
		width: 45,
		height: 45,
		borderRadius: 50,
		justifyContent: 'center',
		alignItems: 'center',
	},
	sheetHeading: {
		fontFamily: 'Poppins_700Bold',
	},
	canteensContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'stretch',
		flexWrap: 'wrap',
		rowGap: 10,
		paddingBottom: 20,
	},
	foodName: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
		paddingBottom: 2,
		overflow: 'hidden',
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
});
