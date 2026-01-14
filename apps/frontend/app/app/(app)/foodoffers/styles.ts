import { StyleSheet } from 'react-native';
import { horizontalScreenPadding } from '@/constants/Constants';

export default StyleSheet.create({
	foodOfferContainer: {
		flex: 1,
	},
	header: {
		width: '100%',
		paddingBottom: 10,
		paddingVertical: 10,
		gap: 10,
	},
    row: {
            width: '100%',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
    },
	col1: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	col2: {
		flexDirection: 'row',
		alignItems: 'center',
	},
    heading: {
            fontSize: 18,
            fontFamily: 'Poppins_400Regular',
    },
    menuIconWrapper: {
            position: 'relative',
    },
    notificationDot: {
            position: 'absolute',
            top: -2,
            right: -2,
            width: 12,
            height: 12,
            borderRadius: 6,
            borderWidth: 2,
    },
	container: {
		flex: 1,
	},
	contentContainer: {
		width: '100%',
		alignItems: 'center',
		paddingBottom: 20,
	},
	foodContainer: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'stretch',
		flexWrap: 'wrap',
		marginTop: 20,
	},
	sheetBackground: {
		borderTopRightRadius: 30,
		borderTopLeftRadius: 30,
	},
	feebackContainer: {
		width: '100%',
		marginTop: 20,
		paddingHorizontal: horizontalScreenPadding,
	},
	foodLabels: {
		fontSize: 24,
		fontFamily: 'Poppins_700Bold',
	},
	elementContainer: {
		width: '100%',
		marginTop: 20,
		paddingHorizontal: horizontalScreenPadding,
	},
	noFoodContainer: {
		width: '100%',
		alignItems: 'center',
		justifyContent: 'center',
	},
	animationContainer: {
		width: 250,
		height: 250,
		marginBottom: 20,
		justifyContent: 'center',
		alignItems: 'center',
	},
	noFoodOffer: {
		fontSize: 18,
		fontFamily: 'Poppins_400Regular',
	},
	jumpButton: {
		marginTop: 10,
		paddingVertical: 10,
		paddingHorizontal: 20,
		borderRadius: 8,
		alignItems: 'center',
	},
        jumpButtonText: {
                fontSize: 16,
                fontFamily: 'Poppins_500Medium',
        },
        debugInfoContainer: {
                width: '100%',
                marginTop: 20,
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                gap: 6,
        },
        debugTitle: {
                fontSize: 16,
                fontFamily: 'Poppins_700Bold',
        },
        debugText: {
                fontSize: 14,
                fontFamily: 'Poppins_400Regular',
        },
});
