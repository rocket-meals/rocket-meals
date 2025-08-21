import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	safeAreaContainer: {
		flex: 1,
	},
	container: {
		flex: 1,
	},
	contentContainer: {
		padding: 20,
		alignItems: 'center',
	},
	bulidingContainer: {
		flexDirection: 'row',
		gap: 20,
	},
	imageContainer: {
		backgroundColor: 'rgba(0,0,0,0.2)',
		borderRadius: 10,
	},
	image: {
		width: '100%',
		height: '100%',
		borderRadius: 10,
	},
	detailsContainer: {
		gap: 15,
	},
	buildingHeading: {
		fontSize: 28,
		fontFamily: 'Poppins_700Bold',
	},
	navigationButton: {
		width: 50,
		height: 50,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
	},
	tabViewContainer: {
		gap: 20,
		marginTop: 30,
		alignItems: 'center',
	},
	tabs: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	tab: {
		flex: 1,
		// width: 'auto',
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 10,
		borderRadius: 50,
		borderWidth: 1,
		borderColor: '#ffffff',
	},
	activeTab: {
		backgroundColor: '#FCDE31',
		borderColor: '#FCDE31',
	},
	tabLabel: {
		fontFamily: 'Poppins_400Regular',
		color: '#ffffff',
	},
	activeLabel: {
		color: '#2E2E2E',
	},
	pagerView: {
		paddingVertical: 10,
	},
	dumy: {},
});
