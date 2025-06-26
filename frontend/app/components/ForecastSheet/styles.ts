import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    width: '100%',
    flex: 1,
    borderTopRightRadius: 28,
    borderTopLeftRadius: 28,
    padding: 10,
    paddingBottom: 0,
    alignItems: 'center',
  },
  sheetHeader: {
    width: '100%',
    alignItems: 'flex-end',
    borderTopRightRadius: 28,
    borderTopLeftRadius: 28,
  },
  titleContainer: {
    width: '100%',
    alignItems: 'center',
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
    textAlign: 'center',
  },
  forecastContainer: {
    width: '100%',
    minHeight: 400,
  },
  graphStyle: {
    width: '100%',
  },
});
