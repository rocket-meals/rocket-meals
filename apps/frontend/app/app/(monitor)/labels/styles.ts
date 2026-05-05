import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		flexGrow: 1,
		backgroundColor: '#f5f5f5',
	},
	headerContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f4f4f4',
		borderBottomWidth: 1,
		borderBottomColor: '#ddd',
	},
	mainContainer: {
		margin: 10,
	},
	iconText: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 10,
	},
	title: {
		marginLeft: 5,
		fontSize: 17,
		maxWidth: '90%',
	},
	logoContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	labelText: {
		marginLeft: 10,
	},
	logo: {
		width: 300,
		height: 100,
		marginRight: 10,
	},
	label: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#000',
	},
	timestamp: {
		fontSize: 14,
		color: '#555',
	},
	gridContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		padding: 10,
	},
});
