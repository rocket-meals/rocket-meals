import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	container: {
		width: '100%',
		height: '100%',
		borderTopRightRadius: 28,
		borderTopLeftRadius: 28,
		padding: 10,
		paddingBottom: 0,
		alignItems: 'center',
	},
	header: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		borderTopRightRadius: 28,
		borderTopLeftRadius: 28,
		padding: 10,
	},
	titleContainer: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		borderTopRightRadius: 28,
		borderTopLeftRadius: 28,
	},
	closeButton: {
		width: 45,
		height: 45,
		borderRadius: 50,
		justifyContent: 'center',
		alignItems: 'center',
	},
	handle: {
		width: '30%',
		height: 6,
		borderRadius: 3,
		marginHorizontal: 10,
		alignSelf: 'center',
	},
	placeholder: {
		width: 45,
		height: 45,
	},
	sheetHeading: {
		fontFamily: 'Poppins_700Bold',
	},
        forecastContainer: {
                width: '100%',
                minHeight: 400,
        },
        loadingContainer: {
                width: '100%',
                height: 200,
                alignItems: 'center',
                justifyContent: 'center',
        },
        colorIndicator: {
                width: 18,
                height: 18,
                borderRadius: 4,
        },
        noDataText: {
                width: '100%',
                textAlign: 'center',
                fontFamily: 'Poppins_500Medium',
                fontSize: 16,
                marginTop: 40,
        },
});
