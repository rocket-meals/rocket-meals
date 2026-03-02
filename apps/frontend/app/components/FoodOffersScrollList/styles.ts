import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	dayContainer: {
		paddingVertical: 10,
		paddingHorizontal: 0,
	},
	dateHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 8,
		paddingHorizontal: 10,
	},
	dateHeader: {
		fontSize: 18,
		flex: 1,
	},
	dateHeaderRight: {
		fontSize: 14,
		textAlign: 'right',
		paddingLeft: 12,
	},
	loader: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	foodContainer: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'stretch',
		flexWrap: 'wrap',
		marginTop: 12,
	},
	feebackContainer: {
		width: '100%',
		marginTop: 6,
	},
	elementContainer: {
		width: '100%',
		marginTop: 12,
		paddingHorizontal: 10,
	},
	dayDivider: {
		height: 1,
		marginTop: 6,
		marginHorizontal: 10,
	},
});
