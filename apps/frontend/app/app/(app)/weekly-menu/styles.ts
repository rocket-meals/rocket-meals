import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		flex: 1,
	},
	dayTabsContainer: {
		flexDirection: 'row',
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	dayTab: {
		alignItems: 'center',
		borderRadius: 12,
		marginHorizontal: 4,
		paddingHorizontal: 14,
		paddingVertical: 10,
		minWidth: 52,
	},
	dayTabShort: {
		fontSize: 12,
		fontFamily: 'Poppins_700Bold',
	},
	dayTabDate: {
		fontSize: 11,
		fontFamily: 'Poppins_400Regular',
		marginTop: 2,
	},
	offerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 12,
		marginHorizontal: 12,
		marginVertical: 4,
	},
	offerName: {
		flex: 1,
		fontSize: 14,
		fontFamily: 'Poppins_400Regular',
	},
	offerPrice: {
		fontSize: 13,
		fontFamily: 'Poppins_700Bold',
		marginLeft: 8,
	},
	compatibilityDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		marginLeft: 8,
	},
	emptyText: {
		textAlign: 'center',
		fontFamily: 'Poppins_400Regular',
		fontSize: 14,
		marginTop: 40,
		paddingHorizontal: 24,
	},
	loadingContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingTop: 40,
	},
	categoryLabel: {
		fontSize: 11,
		fontFamily: 'Poppins_400Regular',
		marginTop: 2,
	},
});
