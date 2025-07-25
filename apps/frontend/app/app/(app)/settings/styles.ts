import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    width: '100%',
    paddingHorizontal: 10,
    paddingVertical: 40,
    alignItems: 'center',
  },
  settingContainer: {
    flex: 1,
    gap: 10,
  },
  list: {
    width: '100%',
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
  },
  col: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    fontFamily: 'Poppins_700Bold',
  },
  value: {
    fontFamily: 'Poppins_400Regular',
  },
  text: {
    fontSize: 18,
    marginBottom: 20,
  },

  Modalcontainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  input: {
    width: '100%',
    height: 60,
    borderRadius: 20,
    paddingHorizontal: 20,
    borderColor: '#d14510',
    marginTop: 10,
    fontFamily: 'Poppins_400Regular',
    fontSize: 18,
  },

  languageContainer: {
    marginTop: 10,
    paddingHorizontal: 10,
  },
  amountOfCardContainer: {
    marginTop: 10,
    paddingHorizontal: 10,
    maxHeight: '100%',
    height: 400,
  },

  deleteAccountContent: {
    width: '100%',
    marginTop: 10,
    alignItems: 'center',
  },

  languageRow: {
    marginTop: 10,
    width: '100%',
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
  },
  flagIcon: {
    width: 35.2,
    height: 22,
    marginRight: 10,
  },
  languageText: {
    flex: 1,
    fontSize: 18,
  },
  radioButton: {
    marginLeft: 10,
  },
  icon: {
    marginRight: 8,
  },
  sheetBackground: {
    borderTopRightRadius: 30,
    borderTopLeftRadius: 30,
  },
  gifContainer: {
    width: 100,
    height: 100,
  },
  gif: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  deleteYourAccount: {
    fontSize: 20,
    fontFamily: 'Poppins_400Regular',
    marginTop: 10,
    textAlign: 'center',
  },
  attentionActions: {
    width: '100%',
    marginTop: 10,
  },
  confirmButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#FCDE31',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
  },
  cancleButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
    marginTop: 10,
  },
  confirmLabel: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#424242',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  heading: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
  },
  groupHeading: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    marginTop: 20,
    marginBottom: 10,
  },
  logo: {
    width: 72,
    height: 72,
  },
  devModeText: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
  },
});
