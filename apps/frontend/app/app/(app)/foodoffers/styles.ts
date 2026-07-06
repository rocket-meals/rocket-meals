import { StyleSheet } from 'react-native';

export default StyleSheet.create({
	foodOfferContainer: {
		flex: 1,
	},
	header: {
		width: '100%',
		paddingBottom: 10,
		paddingVertical: 10,
		gap: 10,
        paddingHorizontal: 10,
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
    rowReverse: {
        flexDirection: 'row-reverse',
    },
    colGapTiny: {
        gap: 5,
    },
    colGapSmall: {
        gap: 6,
    },
    colGapMedium: {
        gap: 10,
    },
    colGapLarge: {
        gap: 15,
    },
    paddingSmall: {
        padding: 5,
    },
    paddingMedium: {
        padding: 10,
    },
    paddingArrowSmall: {
        padding: 2,
    },
    paddingArrowMedium: {
        padding: 5,
    },
    row: {
            width: '100%',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
    },
	col1: {
		flex: 1,
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
	},
	foodLabels: {
		fontSize: 24,
		fontFamily: 'Poppins_700Bold',
	},
	elementContainer: {
		width: '100%',
		marginTop: 20,
	},
	safeArea: {
        flex: 1,
    },
    contentWrapper: {
        flex: 1,
        // alignItems: 'center',
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
    canteenNameButton: {
        flex: 1,
    },
    loadingContainer: {
        width: '100%',
        height: 400,
        justifyContent: 'center',
    },
    footerSpacer: {
        height: 40,
    },
    lottieView: {
        width: '100%',
        height: '100%',
    },
    listItemContainer: {
        flex: 1,
        marginHorizontal: 10,
        marginVertical: 10,
    },
});
