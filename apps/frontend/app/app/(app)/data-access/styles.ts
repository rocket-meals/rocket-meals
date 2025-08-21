import { Dimensions, StyleSheet } from 'react-native';

const { width } = Dimensions.get('window'); // To handle responsiveness

export default StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	sheetBackground: {
		borderTopRightRadius: 30,
		borderTopLeftRadius: 30,
	},
	sheetTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 10,
	},
	selectedItem: {
		fontSize: 16,
		color: '#333',
		marginBottom: 20,
	},
	closeButton: {
		backgroundColor: '#007BFF',
		padding: 10,
		borderRadius: 5,
	},
	closeButtonText: {
		color: 'white',
		fontSize: 16,
	},
});
