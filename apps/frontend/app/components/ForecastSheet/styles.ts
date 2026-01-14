import { StyleSheet } from 'react-native';

export default StyleSheet.create({
        container: {
                width: '100%',
                gap: 16,
        },
        debugInformation: {
                fontFamily: 'Poppins_400Regular',
                fontSize: 14,
        },
        forecastContainer: {
                width: '100%',
                minHeight: 400,
                gap: 8,
        },
        loadingContainer: {
                width: '100%',
                height: 200,
                alignItems: 'center',
                justifyContent: 'center',
        },
        colorIndicator: {
                width: "100%",
                height: "100%",
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
