import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { Entypo, FontAwesome, Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/hooks/useLanguage';
import { FormSubmissions } from '@/constants/types';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import { isWeb } from '@/constants/Constants';
import { FormsSubmissionsHelper } from '@/redux/actions/Forms/FormSubmitions';
import BaseBottomSheet from '@/components/BaseBottomSheet';
import type BottomSheet from '@gorhom/bottom-sheet';
import FilterFormSheet from '@/components/FilterFormSheet/FilterFormSheet';
import { excerpt } from '@/constants/HelperFunctions';
import { filterOptions } from './constants';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { RootState } from '@/redux/reducer';

const index = () => {
  useSetPageTitle(TranslationKeys.select_a_form_submission);
  const { translate } = useLanguage();
  const { theme } = useTheme();
  const { form_id } = useLocalSearchParams();
  const sheetRef = useRef<BottomSheet>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState<string>('');
  const [isActive, setIsActive] = useState(false);
  const [screenWidth, setScreenWidth] = useState(
    Dimensions.get('window').width
  );
  const formsSubmissionsHelper = new FormsSubmissionsHelper();
  const [formSubmissions, setFormSubmissions] = useState<FormSubmissions[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>('draft');
  const { drawerPosition } = useSelector((state: RootState) => state.settings);

  const openFilterSheet = () => {
    sheetRef.current?.expand();
  };

  const closeFilterSheet = () => {
    sheetRef?.current?.close();
  };

  const loadFormSubmissions = async (
    pageNumber: number,
    append: boolean = false
  ) => {
    if (!form_id) return;
    setLoading(true);

    try {
      const result = (await formsSubmissionsHelper.fetchFormSubmissions({
        state: selectedOption || 'draft',
        form: form_id,
        alias: query ? query?.trim() : '',
      })) as FormSubmissions[];

      if (result) {
        if (append) {
          setFormSubmissions((prev) => [...prev, ...result]);
        } else {
          setFormSubmissions(result);
        }
      }
    } catch (error) {
      console.error('Error fetching form submissions', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (form_id) {
        loadFormSubmissions(1, false);
      }
      return () => {};
    }, [form_id, selectedOption])
  );

  const handleSearchFilter = () => {
    if (query && query?.trim()?.length > 0) {
      loadFormSubmissions(1, false);
    } else {
      loadFormSubmissions(1, false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setIsActive(true);
      return () => {
        setIsActive(false);
      };
    }, [])
  );

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(Dimensions.get('window').width);
    };

    const subscription = Dimensions.addEventListener('change', handleResize);

    return () => subscription?.remove();
  }, []);

  const renderItem = ({ item }: { item: FormSubmissions }) => {
    return (
      <TouchableOpacity
        style={{
          ...styles.formCategory,
          backgroundColor: theme.screen.iconBg,
        }}
        key={item.id}
        onPress={() => {
          router.push({
            pathname: '/form-submission',
            params: { form_submission_id: item?.id },
          });
        }}
      >
        <Text style={{ ...styles.body, color: theme.screen.text }}>
          {item.alias}
        </Text>
        <Entypo
          name='chevron-small-right'
          color={theme.screen.icon}
          size={24}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={{
        ...styles.container,
        backgroundColor: theme.screen.background,
      }}
    >
      <View
        style={{
          ...styles.header,
          backgroundColor: theme.header.background,
          paddingHorizontal: isWeb ? 20 : 10,
          gap: screenWidth > 768 ? 20 : 10,
        }}
      >
        <View
          style={[
            styles.row,
            {
              flexDirection: drawerPosition === 'right' ? 'row-reverse' : 'row',
            },
          ]}
        >
          <View
            style={[
              styles.col1,
              screenWidth > 768
                ? {
                    gap: 20,
                  }
                : {
                    gap: 10,
                  },
              {
                flexDirection:
                  drawerPosition === 'right' ? 'row-reverse' : 'row',
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => router.navigate('/form-categories')}
              style={{ padding: 10 }}
            >
              <Ionicons name='arrow-back' size={26} color={theme.header.text} />
            </TouchableOpacity>
            <Text style={{ ...styles.heading, color: theme.header.text }}>
              {excerpt(
                translate(TranslationKeys.select_a_form_submission),
                screenWidth > 900 ? 100 : screenWidth > 700 ? 80 : 22
              )}
            </Text>
          </View>
          <View style={{ ...styles.col2, gap: isWeb ? 30 : 15 }}>
            <TouchableOpacity onPress={openFilterSheet} style={{ padding: 10 }}>
              <FontAwesome name='filter' size={24} color={theme.header.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <View style={styles.contentContainer}>
        <View style={styles.stateContainer}>
          <Text
            style={{
              ...styles.selectedState,
              color: theme.screen.text,
              fontSize: screenWidth > 600 ? 30 : 20,
              marginBottom: screenWidth > 600 ? 0 : 10,
            }}
          >
            {`${translate(TranslationKeys.state)}: ${translate(
              selectedOption
            )}`}
          </Text>
        </View>
        <View
          style={{
            ...styles.searchContainer,
            width: screenWidth > 768 ? '60%' : '90%',
            marginTop: screenWidth > 768 ? 20 : 0,
            marginBottom: screenWidth > 768 ? 20 : 0,
          }}
        >
          <TextInput
            style={{
              ...styles.searchInput,
              width: screenWidth > 768 ? '90%' : '85%',
              color: theme.screen.text,
            }}
            cursorColor={theme.screen.text}
            placeholderTextColor={theme.screen.placeholder}
            onChangeText={setQuery}
            value={query}
            placeholder={translate(TranslationKeys.search_with_alias)}
          />
          <TouchableOpacity
            style={{
              ...styles.searchButton,
              backgroundColor: theme.screen.iconBg,
              width: screenWidth > 768 ? '10%' : '15%',
            }}
            onPress={handleSearchFilter}
          >
            <Ionicons name='search' color={theme.screen.icon} size={22} />
          </TouchableOpacity>
        </View>
      </View>
      <View
        style={{
          flex: 1,
          width: '100%',
          marginTop: 10,
          alignItems: 'center',
        }}
      >
        <View style={{ flex: 1, width: screenWidth > 768 ? '70%' : '90%' }}>
          {loading ? (
            <View
              style={{
                height: 200,
                width: '100%',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <ActivityIndicator size={30} color={theme.screen.text} />
            </View>
          ) : formSubmissions?.length > 0 ? (
            <FlatList
              data={formSubmissions}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: 10 }}
            />
          ) : (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: theme.screen.text, fontSize: 16 }}>
                {translate(TranslationKeys.no_data_found)}
              </Text>
            </View>
          )}
        </View>
      </View>
      {isActive && (
        <BaseBottomSheet
          ref={sheetRef}
          index={-1}
          backgroundStyle={{
            ...styles.sheetBackground,
            backgroundColor: theme.sheet.sheetBg,
          }}
          enablePanDownToClose
          handleComponent={null}
          onClose={closeFilterSheet}
        >
          <FilterFormSheet
            closeSheet={closeFilterSheet}
            isFormSubmission={true}
            setSelectedOption={setSelectedOption}
            selectedOption={selectedOption}
            options={filterOptions}
          />
        </BaseBottomSheet>
      )}
    </View>
  );
};

export default index;
