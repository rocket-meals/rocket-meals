import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	sheetView: {
		width: '100%',
		padding: 0,
	},
	optionsContainer: {
		width: '100%',
		paddingHorizontal: 0,
		marginTop: 0,
	},
	debugContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		marginTop: 16,
		paddingHorizontal: 4,
	},
	debugLabel: {
		fontSize: 14,
		flex: 1,
	},
	debugSwatch: {
		width: 32,
		height: 32,
		borderWidth: 2,
		borderColor: 'red',
	},
});
