import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	card: {
		width: '100%',
		borderRadius: 10,
		flexDirection: 'row',
		gap: 10,
		padding: 10,
	},
	imageContainer: {
		height: 200,
		borderRadius: 5,
		backgroundColor: 'rgba(0,0,0,0.2)',
	},
	image: {
		width: '100%',
		height: '100%',
		borderRadius: 5,
		objectFit: 'cover',
	},
	newsHeader: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
	},
	newsHeading: {
		fontSize: 22,
		fontFamily: 'Poppins_700Bold',
	},
	newsDate: {
		fontSize: 14,
		fontFamily: 'Poppins_400Regular',
	},
	newsBody: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
		marginBottom: 10,
	},
	actionContainer: {
		width: '100%',
	},
	readMoreButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 12,
		paddingVertical: 10,
		gap: 10,
		marginTop: 10,
	},
	readMore: {
		fontSize: 16,
		fontFamily: 'Poppins_700Bold',
	},
	dummy: {},
});
