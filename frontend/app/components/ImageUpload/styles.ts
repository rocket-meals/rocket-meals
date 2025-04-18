import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: 16,
  },
  uploadContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  uploadText: {
    marginLeft: 10,
    marginTop: 4,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
  },
  fileContainer: {
    width: 110,
    marginTop: 20,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
    borderRadius: 8,
  },
  crossContainer: {
    width: 26,
    height: 26,
    position: 'absolute',
    top: -8,
    right: -8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    borderRadius: 50,
  },
  filePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  fileName: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
  },
});
