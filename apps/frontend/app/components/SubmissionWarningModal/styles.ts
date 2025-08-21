import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
	modalContainer: {
		width: '100%',
	},
	modalView: {
		height: 'auto',
		borderRadius: 40,
		padding: 20,
		alignItems: 'center',
	},
	modalHeader: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'flex-end',
		justifyContent: 'space-between',
		marginBottom: 30,
	},
	closeButton: {
		width: 50,
		height: 50,
		borderRadius: 50,
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalHeading: {
		fontSize: 32,
		fontFamily: 'Poppins_700Bold',
	},
	modalSubHeading: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
		marginTop: 15,
		marginBottom: 10,
		textAlign: 'center',
	},
	actionContainer: {
		width: '100%',
		gap: 10,
		alignItems: 'center',
		marginTop: 20,
	},
	loginButton: {
		width: '80%',
		height: 60,
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: 50,
	},
	loginLabel: {
		fontFamily: 'Poppins_700Bold',
		fontSize: 16,
		color: '#2E2E2E',
	},
});
