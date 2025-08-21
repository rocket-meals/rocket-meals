import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	contentContainer: {
		borderTopRightRadius: 12,
		borderBottomRightRadius: 12,
		paddingTop: 20,
		paddingBottom: 20,
		justifyContent: 'space-between',
	},
	content: {
		paddingHorizontal: 15,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	logoContainer: {
		width: 80,
		height: 80,
		borderRadius: 8,
		backgroundColor: '#424242',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 15,
	},
	heading: {
		fontSize: 28,
		fontFamily: 'Poppins_700Bold',
	},
	logo: {
		width: 72,
		height: 72,
	},
	menuContainer: {
		flex: 1,
		paddingVertical: 10,
		marginTop: 10,
	},
	menuItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 10,
		paddingHorizontal: 20,
		borderRadius: 10,
		marginBottom: 5,
	},
	menuLabel: {
		width: '80%',
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
		marginTop: 4,
	},
	divider: {
		width: '100%',
		height: 1,
		backgroundColor: '#696969',
		marginVertical: 20,
	},
	footer: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'center',
		flexWrap: 'wrap',
		marginTop: 10,
	},
	link: {
		fontSize: 14,
		fontFamily: 'Poppins_400Regular',
		paddingHorizontal: 2,
	},
	bar: {
		color: '#696969',
		marginHorizontal: 10,
	},
});
