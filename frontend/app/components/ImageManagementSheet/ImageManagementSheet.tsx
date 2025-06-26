import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import styles from './styles';
import { isWeb } from '@/constants/Constants';
import { useTheme } from '@/hooks/useTheme';
import { ImageManagementSheetProps } from './types';
import { ServerAPI } from '@/redux/actions';
import { uploadFiles } from '@directus/sdk';
import { CollectionHelper } from '@/helper/collectionHelper';
import { useSelector } from 'react-redux';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';

const ImageManagementSheet: React.FC<ImageManagementSheetProps> = ({
  closeSheet,
  selectedFoodId,
  handleFetch,
  fileName,
}) => {
  const { theme } = useTheme();
  const { translate } = useLanguage();
  const [loading, setLoading] = useState({
    camera: false,
    image: false,
    delete: false,
  });
  const [isDelete, setIsDelete] = useState(false);
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get('window').width
  );
  const MAX_IMAGE_DIMENSION = 6000;
  const { foodCollection } = useSelector((state: RootState) => state.food);
  const [selectedImage, setSelectedImage] = useState<string | undefined>(
    undefined
  );

  const getFolder = () => {
    if (foodCollection) {
      const id = foodCollection?.meta?.options?.folder;
      return id || '';
    }
  };
  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(Dimensions.get('window').width);
    };

    const subscription = Dimensions.addEventListener('change', handleResize);

    return () => subscription?.remove();
  }, []);

  const handleImagePick = async (useCamera: boolean) => {
    try {
      const permissionResponse = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResponse.granted) {
        Alert.alert(
          'Permission Denied',
          'Please grant permissions to access the camera or gallery.'
        );
        return;
      }

      const pickerResult = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            allowsMultipleSelection: false,
            selectionLimit: 1,
            quality: 1,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            allowsMultipleSelection: false,
            selectionLimit: 1,
            quality: 1,
          });

      if (pickerResult.canceled) {
        Alert.alert('Canceled the image');
        return;
      }

      const { uri, width, height } = pickerResult.assets[0];
      let finalUri = uri;

      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        const aspectRatio = width / height;
        const newDimensions =
          width > height
            ? {
                width: MAX_IMAGE_DIMENSION,
                height: MAX_IMAGE_DIMENSION / aspectRatio,
              }
            : {
                width: MAX_IMAGE_DIMENSION * aspectRatio,
                height: MAX_IMAGE_DIMENSION,
              };

        const resizedImage = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: newDimensions }],
          { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
        );

        finalUri = resizedImage.uri;
      }
      if (useCamera) {
        setLoading({ ...loading, camera: true });
      } else {
        setLoading({ ...loading, image: true });
      }
      const formData = new FormData();
      const file_name = fileName + '_' + selectedFoodId;
      let storage = '';
      if (fileName === 'foods') {
        storage = getFolder();
      }
      let fileSizes: number | undefined = undefined;

      if (Platform.OS === 'web') {
        const blob: Blob = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = function () {
            resolve(xhr.response);
          };
          xhr.onerror = function (e) {
            console.log(e);
            reject(new TypeError('Network request failed'));
          };
          xhr.responseType = 'blob';
          xhr.open('GET', finalUri, true);
          xhr.send(null);
        });

        fileSizes = blob.size;
        if (storage) {
          formData.append('folder', storage);
        }
        formData.append('image', blob, file_name);
      } else {
        const uriParts = finalUri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        const fileExtension = `.${fileType}`;

        const file: any = {
          uri: finalUri,
          name: file_name + fileExtension,
          type: `image/${fileType}`,
        };
        if (storage) {
          formData.append('folder', storage);
        }
        formData.append('image', file, file_name);

        const response = await fetch(finalUri);
        const blob = await response.blob();
        fileSizes = blob.size;
      }

      const client = ServerAPI.getClient();
      formData.append('title', file_name);

      const resultFileUpload = await client.request(uploadFiles(formData));

      const file_id = resultFileUpload.id;

      const collectionHelper = new CollectionHelper(fileName);
      let resultImageLinked = await collectionHelper.updateItem(
        selectedFoodId,
        {
          image: file_id,
        }
      );
      handleFetch();
      setLoading({ ...loading, camera: false, image: false });
      closeSheet();
    } catch (error) {
      console.error('Error selecting image:', error);
      setLoading({ ...loading, camera: false, image: false });
    }
  };

  const handleDeleteImage = async () => {
    try {
      const collectionHelper = new CollectionHelper(fileName);
      setLoading({ ...loading, delete: true });
      let result = await collectionHelper.updateItem(selectedFoodId, {
        image: null,
        image_remote_url: null,
      });
      handleFetch();
      closeSheet();
      setLoading({ ...loading, delete: false });
    } catch (error) {
      console.error('Error deleting image:', error);
      setLoading({ ...loading, delete: false });
    }
  };

  return (
    <BottomSheetView
      style={{ ...styles.sheetView, backgroundColor: theme.sheet.sheetBg }}
    >
      <View
        style={{
          ...styles.sheetHeader,
          paddingRight: isWeb ? 10 : 0,
          paddingTop: isWeb ? 10 : 0,
        }}
      >
        <View />
        <Text
          style={{
            ...styles.sheetHeading,
            color: theme.sheet.text,
          }}
        >
          Edit: Image
        </Text>
      </View>
      <View
        style={{
          ...styles.mainContentContainer,
          width: isWeb ? '90%' : '100%',
          paddingHorizontal: screenWidth > 600 ? 20 : 0,
          marginTop: screenWidth > 600 ? 40 : 20,
        }}
      >
        {isDelete ? (
          <View>
            <TouchableOpacity
              style={{ ...styles.row, backgroundColor: theme.background }}
              onPress={handleDeleteImage}
            >
              <View style={styles.col}>
                <MaterialCommunityIcons
                  name='delete'
                  size={24}
                  color={theme.screen.icon}
                />
                <Text style={{ ...styles.label, color: theme.screen.text }}>
                  {translate(TranslationKeys.delete)}
                </Text>
              </View>
              {loading?.delete ? (
                <ActivityIndicator size='small' color={theme.screen.icon} />
              ) : (
                <MaterialCommunityIcons
                  name='checkbox-blank-circle-outline'
                  size={24}
                  color={theme.screen.icon}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={{ ...styles.row, backgroundColor: theme.background }}
              onPress={() => {
                setIsDelete(false);
                closeSheet();
              }}
            >
              <View style={styles.col}>
                <MaterialCommunityIcons
                  name='close'
                  size={24}
                  color={theme.screen.icon}
                />
                <Text style={{ ...styles.label, color: theme.screen.text }}>
                  {translate(TranslationKeys.cancel)}
                </Text>
              </View>
              <MaterialCommunityIcons
                name='checkbox-blank-circle-outline'
                size={24}
                color={theme.screen.icon}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={{ ...styles.row, backgroundColor: theme.background }}
              onPress={() => setIsDelete(false)}
            >
              <View style={styles.col}>
                <MaterialCommunityIcons
                  name='keyboard-backspace'
                  size={24}
                  color={theme.screen.icon}
                />
                <Text style={{ ...styles.label, color: theme.screen.text }}>
                  {translate(TranslationKeys.navigate_back)}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {!isWeb && (
              <TouchableOpacity
                style={{ ...styles.row, backgroundColor: theme.background }}
                onPress={() => handleImagePick(true)}
              >
                <View style={styles.col}>
                  <Ionicons name='camera' size={24} color={theme.screen.icon} />
                  <Text style={{ ...styles.label, color: theme.screen.text }}>
                    {translate(TranslationKeys.camera)}
                  </Text>
                </View>
                {loading?.camera ? (
                  <ActivityIndicator size='small' color={theme.screen.icon} />
                ) : (
                  <MaterialCommunityIcons
                    name='checkbox-blank-circle-outline'
                    size={24}
                    color={theme.screen.icon}
                  />
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={{ ...styles.row, backgroundColor: theme.background }}
              onPress={() => handleImagePick(false)}
            >
              <View style={styles.col}>
                <MaterialCommunityIcons
                  name='folder-image'
                  size={24}
                  color={theme.screen.icon}
                />
                <Text style={{ ...styles.label, color: theme.screen.text }}>
                  {translate(TranslationKeys.gallery)}
                </Text>
              </View>
              {loading?.image ? (
                <ActivityIndicator size='small' color={theme.screen.icon} />
              ) : (
                <MaterialCommunityIcons
                  name='checkbox-blank-circle-outline'
                  size={24}
                  color={theme.screen.icon}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={{ ...styles.row, backgroundColor: theme.background }}
              onPress={() => setIsDelete(true)}
            >
              <View style={styles.col}>
                <MaterialCommunityIcons
                  name='delete'
                  size={24}
                  color={theme.screen.icon}
                />
                <Text style={{ ...styles.label, color: theme.screen.text }}>
                  {translate(TranslationKeys.delete)}
                </Text>
              </View>
              <MaterialCommunityIcons
                name='arrow-right'
                size={24}
                color={theme.screen.icon}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={{ ...styles.row, backgroundColor: theme.background }}
              onPress={closeSheet}
            >
              <View style={styles.col}>
                <MaterialCommunityIcons
                  name='close'
                  size={24}
                  color={theme.screen.icon}
                />
                <Text style={{ ...styles.label, color: theme.screen.text }}>
                  {translate(TranslationKeys.cancel)}
                </Text>
              </View>
            </TouchableOpacity>
          </>
        )}
      </View>
    </BottomSheetView>
  );
};

export default ImageManagementSheet;
