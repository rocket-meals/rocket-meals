import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  sheetView: {
    width: '100%',
    height: '100%',
    borderTopRightRadius: 28,
    borderTopLeftRadius: 28,
    padding: 10,
    paddingBottom: 0,
  },
  contentContainer: {
    alignItems: 'center',
  },
  sheetHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 28,
    borderTopLeftRadius: 28,
  },
  sheetHeading: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 30,
    textAlign: 'center',
  },
  sheetSubHeading: {
    width: '95%',
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  loginButton: {
    width: '80%',
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
    marginVertical: 25,
  },
  loginLabel: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 16,
    color: '#2E2E2E',
  },
});
