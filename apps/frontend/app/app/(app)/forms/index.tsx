import { ActivityIndicator, Dimensions, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { Entypo } from '@expo/vector-icons';
import { DatabaseTypes } from 'repo-depkit-common';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import { getFromCategoryTranslation } from '@/helper/resourceHelper';
import { iconLibraries } from '@/components/Drawer/CustomDrawerContent';
import { FormsHelper } from '@/redux/actions/Forms/Forms';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { RootState } from '@/redux/reducer';

const Index = () => {
	useSetPageTitle(TranslationKeys.select_a_form);
	const { theme } = useTheme();
	const [loading, setLoading] = useState(false);
	const { category_id } = useLocalSearchParams();
	const { language } = useSelector((state: RootState) => state.settings);
	const [forms, setForms] = useState<DatabaseTypes.Forms[]>([]);
	const formsHelper = new FormsHelper();
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

	const getAllForms = async () => {
		setLoading(true);
		const result = (await formsHelper.fetchForms({
			filter: { category: { _eq: category_id }, status: { _eq: 'published' } },
		})) as DatabaseTypes.Forms[];
		if (result) {
			setLoading(false);
			setForms(result);
		}
	};

	useFocusEffect(
		useCallback(() => {
			if (category_id) {
				getAllForms();
			}
			return () => {};
		}, [category_id])
	);

	useEffect(() => {
		const handleResize = () => setScreenWidth(Dimensions.get('window').width);
		const subscription = Dimensions.addEventListener('change', handleResize);
		return () => subscription?.remove();
	}, []);

	return (
		<ScrollView style={{ ...styles.container, backgroundColor: theme.screen.background }} contentContainerStyle={{ ...styles.contentContainer }}>
			<View
				style={{
					...styles.formCategories,
					width: screenWidth > 600 ? '80%' : '90%',
				}}
			>
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
				) : (
					<>
						{forms &&
							forms?.map((form, index) => {
								let IconComponent: any = null;
								let iconName = '';
								if (form?.icon_expo) {
									const [library, name] = form?.icon_expo?.split(':') ?? [];
									if (iconLibraries[library]) {
										IconComponent = iconLibraries[library];
										iconName = name;
									}
								}
								return (
									<TouchableOpacity
										style={{
											...styles.formCategory,
											backgroundColor: theme.screen.iconBg,
										}}
										key={form?.id}
										onPress={() => {
											router.push({
												pathname: '/form-submissions',
												params: { form_id: form?.id },
											});
										}}
									>
										<View style={styles.col}>
											{IconComponent && <IconComponent name={iconName} size={20} color={theme.screen.icon} />}
											<Text style={{ ...styles.body, color: theme.screen.text }}>{form?.translations ? getFromCategoryTranslation(form?.translations, language) : form?.alias}</Text>
										</View>
										<Entypo name="chevron-small-right" color={theme.screen.icon} size={24} />
									</TouchableOpacity>
								);
							})}
					</>
				)}
			</View>
		</ScrollView>
	);
};

export default Index;
