import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  card: {
    borderRadius: 18,
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  imageContainer: {
    width: '100%',
    borderRadius: 18,
    position: 'relative',
  },
  overlay: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderTopRightRadius: 18,
    borderTopLeftRadius: 18,
  },
  image: {
    width: '100%',
    height: '100%',
    borderTopRightRadius: 18,
    borderTopLeftRadius: 18,
    resizeMode: 'cover',
  },
  imageActionContainer: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editImageButton: {
    width: 35,
    height: 35,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  directionButton: {
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  distance: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
  },
  cardContent: {
    alignItems: 'stretch',
    justifyContent: 'center',
    flex: 1,
  },
  campusName: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  dummy: {},
});
