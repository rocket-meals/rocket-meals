import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		width: '100%',
		minHeight: 300,
		maxHeight: 300,
		borderRadius: 10,
		borderWidth: 1,
	},
	scrollViewContent: {
		flexGrow: 1,
		alignItems: 'center',
		padding: 10,
		borderRadius: 10,
		gap: 10,
	},
	row: {
		width: '100%',
		height: 50,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderRadius: 12,
	},
	icon: {
		marginRight: 10,
	},
	text: {
		flex: 1,
		fontSize: 16,
		color: 'black',
	},
	radioButton: {
		marginLeft: 'auto',
	},
});
