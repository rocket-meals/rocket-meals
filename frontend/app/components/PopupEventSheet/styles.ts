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
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopRightRadius: 28,
    borderTopLeftRadius: 28,
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
    marginLeft: 30,
    textAlign: 'center',
  },
  popupContainer: {
    width: '100%',
    paddingHorizontal: 10,
    gap: 20,
    marginTop: 30,
    alignItems: 'center',
  },
  imageContainer: {
    width: '100%',
    height: 300,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  dummy: {},
});
