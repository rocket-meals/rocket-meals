import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingTop: 20,
	},
	sheetBackground: {
		borderTopRightRadius: 30,
		borderTopLeftRadius: 30,
	},
	sheetHeader: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		borderTopRightRadius: 28,
		borderTopLeftRadius: 28,
		padding: 10,
	},
	sheetcloseButton: {
		width: 45,
		height: 45,
		borderRadius: 50,
		justifyContent: 'center',
		alignItems: 'center',
	},
	sheetHeading: {
		fontFamily: 'Poppins_700Bold',
	},
	additionalInfoContainer: {
		width: '100%',
		marginTop: 20,
	},
	info: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
	},
	imageContainer: {
		width: 170,
		height: 170,
		marginBottom: 20,
		justifyContent: 'center',
		alignItems: 'center',
	},
	image: {
		width: '100%',
		height: '100%',
		resizeMode: 'contain',
	},
	balanceTitle: {
		fontSize: 18,
		marginTop: 20,
	},
	balance: {
		fontSize: 28,
		fontWeight: 'bold',
		marginBottom: 10,
	},
	subText: {
		fontSize: 14,
		marginBottom: 20,
		marginTop: 20,
	},
	infoContainer: {
		padding: 15,
		elevation: 3,
		marginTop: 10,
	},
	infoRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginVertical: 15,
	},
	label: {
		fontSize: 16,
	},
	iconLabelContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	icon: {
		marginRight: 8,
	},
	value: {
		fontSize: 16,
		fontWeight: 'bold',
	},
	nfcButton: {
		width: '80%',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 10,
		borderRadius: 12,
		marginVertical: 10,
		gap: 10,
		borderWidth: 2,
	},
	nfcLabel: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
	},
	nfcInstructionRead: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
	},
	sheetView: {
		width: '100%',
		alignItems: 'center',
		marginTop: 30,
	},
	nfcAnimationContainer: {
		width: 200,
		height: 200,
		justifyContent: 'center',
		alignItems: 'center',
	},
	nfcAnimation: {
		width: '100%',
		height: '100%',
		resizeMode: 'contain',
	},
});
