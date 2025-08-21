import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
	modalContainer: {
		alignSelf: 'center',
		position: 'relative',
		elevation: 5,
		borderRadius: 40,
		padding: 20,
		paddingBottom: 40,
	},
	modalHeader: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
	},
	modalHeading: {
		maxWidth: '60%',
		fontSize: 36,
		fontFamily: 'Poppins_700Bold',
		alignSelf: 'center',
		textAlign: 'center',
	},

	closeButton: {
		borderRadius: 50,
		justifyContent: 'center',
		alignItems: 'center',
	},
	closeText: {
		fontSize: 20,
		color: '#888',
		fontWeight: 'bold',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 10,
		width: '60%',
		alignSelf: 'flex-end',
	},
	title: {
		fontSize: 22,
		fontWeight: 'bold',
		color: '#000',
	},
	closeIcon: {
		fontSize: 20,
		color: '#888',
		fontWeight: 'bold',
	},
	content: {},
	buttonContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 20,
		alignSelf: 'flex-end',
	},
	cancelButton: {
		flex: 1,
		padding: 10,
		borderRadius: 5,
		marginRight: 5,
		alignItems: 'center',
		borderWidth: 1,
	},
	saveButton: {
		flex: 1,
		padding: 10,
		borderRadius: 5,
		marginLeft: 5,
		alignItems: 'center',
	},
	buttonText: {
		fontWeight: 'bold',
	},
});
