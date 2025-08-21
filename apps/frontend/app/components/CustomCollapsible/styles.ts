import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	headerContainer: {
		marginBottom: 20,
		borderWidth: 1,
		borderColor: '#d14610',
		borderRadius: 12,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 12,
	},
	iconText: {
		paddingVertical: 25,
		paddingHorizontal: 20,
		borderTopLeftRadius: 10,
		borderBottomLeftRadius: 10,
	},
	headerText: {
		fontSize: 16,
		fontWeight: '500',
		color: '#ffffff',
	},
	content: {
		paddingHorizontal: 8,
		paddingVertical: 20,
		backgroundColor: '#2e2e2e',
		borderBottomLeftRadius: 12,
		borderBottomRightRadius: 12,
	},
});
