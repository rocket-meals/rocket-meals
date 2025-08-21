import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
	modalContainer: {
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalView: {
		height: 'auto',
		borderRadius: 40,
		padding: 20,
		alignItems: 'flex-start',
	},
	modalHeader: {
		width: '100%',
		alignItems: 'flex-end',
	},
	closeButton: {
		width: 50,
		height: 50,
		borderRadius: 50,
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalHeading: {
		fontSize: 36,
		fontFamily: 'Poppins_700Bold',
		textAlign: 'center',
		width: '100%',
	},
	modalSubHeading: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
		marginTop: 15,
		marginBottom: 10,
		textAlign: 'left',
		width: '100%',
	},
	loginButton: {
		width: '80%',
		height: 60,
		backgroundColor: '#FCDE31',
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 50,
		marginVertical: 25,
	},
	loginLabel: {
		fontFamily: 'Poppins_700Bold',
		fontSize: 16,
		color: '#2E2E2E',
	},
});
