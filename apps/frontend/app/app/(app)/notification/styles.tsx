import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F9F9F9',
		alignItems: 'center',
		paddingTop: 50,
	},
	imageContainer: {
		width: 250,
		height: 250,
		marginBottom: 20,
		justifyContent: 'center',
		alignItems: 'center',
	},
	bellIconContainer: {
		borderRadius: 18,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#d14510',
	},
	bellIconAtiveContainer: {
		borderRadius: 18,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#d14510',
	},
	image: {
		width: '100%',
		height: '100%',
		resizeMode: 'contain',
	},
	balanceTitle: {
		fontSize: 18,
		marginTop: 20,
		color: '#555',
	},

	infoContainer: {
		flex: 1,
		padding: 15,
		elevation: 3,
		marginTop: 10,
	},
	infoRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginVertical: 5,
		alignItems: 'center',
		paddingVertical: 8,
		paddingHorizontal: 15,
		borderRadius: 10,
		width: '98%',
	},
	label: {
		wordWrap: 'break-word',
		textOverflow: 'ellipsis',
		fontSize: 16,
		color: '#333',
	},
	iconLabelContainer: {
		maxWidth: '80%',
		flexDirection: 'row',
		alignItems: 'center',
	},
	icon: {
		marginRight: 8,
	},
	value: {
		fontSize: 20,
		marginBottom: 20,
		fontWeight: 'bold',
	},
});
