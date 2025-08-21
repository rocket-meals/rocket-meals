import { Dimensions, StyleSheet } from 'react-native';

const { width } = Dimensions.get('window'); // To handle responsiveness

export default StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F9F9F9',
		// alignItems: 'center',
		// justifyContent:'center'
	},
	sheetView: {
		width: '100%',
		height: '100%',
		borderTopRightRadius: 28,
		borderTopLeftRadius: 28,
		padding: 10,
		paddingBottom: 0,
	},
	contentContainer: {
		width: '100%',
		alignItems: 'center',
		paddingHorizontal: 10,
		paddingVertical: 40,
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
		// marginBottom: 10,
		marginTop: 20,
		color: '#555',
	},

	infoContainer: {
		// width: width * 0.9,
		paddingHorizontal: 0,
		paddingVertical: 0,
		elevation: 3,
		marginTop: 20,
		marginBottom: 20,
	},
	infoRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginVertical: 10,
		alignItems: 'center',
		alignSelf: 'flex-end',
		width: '98%',
		borderRadius: 10,
	},
	label: {
		// fontSize: 16,
		// color: '#333',
	},
	iconLabelContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	icon: {
		marginRight: 8, // Add some space between the icon and the label
	},
	value: {
		fontSize: 20,
		marginTop: 30,
		fontWeight: 'bold',
	},
	titleHeading: {
		marginLeft: 10,
		marginTop: 10,
		fontWeight: 'bold',
	},
	rowInfo: {
		display: 'flex',
		flexDirection: 'row',
		alignItems: 'center',
	},
	labelParagraph: {
		marginBottom: 10,
		fontSize: 16,
		marginTop: 30,
	},
});
