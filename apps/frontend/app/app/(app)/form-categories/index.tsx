import { ActivityIndicator, Dimensions, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { Entypo } from '@expo/vector-icons';
import { FormCategoriesHelper } from '@/redux/actions/Forms/FormCategories';
import { DatabaseTypes } from 'repo-depkit-common';
import { router, useFocusEffect } from 'expo-router';
import { useSelector } from 'react-redux';
import { getFromCategoryTranslation } from '@/helper/resourceHelper';
import { iconLibraries } from '@/components/Drawer/CustomDrawerContent';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { RootState } from '@/redux/reducer';

const Index = () => {
	useSetPageTitle(TranslationKeys.select_a_form_category);
	const { theme } = useTheme();
	const [loading, setLoading] = useState(false);
	const { language } = useSelector((state: RootState) => state.settings);
	const [formCategories, setFormCategories] = useState<DatabaseTypes.FormCategories[]>([]);
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
	const formCategoriesHelper = new FormCategoriesHelper();

	const getAllCategories = async () => {
		setLoading(true);
		const result = (await formCategoriesHelper.fetchFormCategories({
			filter: { status: { _eq: 'published' } },
		})) as DatabaseTypes.FormCategories[];

		if (result) {
			setLoading(false);

			setFormCategories(result);
		}
	};

	useFocusEffect(
		useCallback(() => {
			getAllCategories();
			return () => {};
		}, [])
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
						{formCategories &&
							formCategories?.map((category, index) => {
								let IconComponent: any = null;
								let iconName = '';
								if (category?.icon_expo) {
									const [library, name] = category?.icon_expo?.split(':') ?? [];
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
										key={category?.id}
										onPress={() => {
											router.push({
												pathname: '/forms',
												params: { category_id: category?.id },
											});
										}}
									>
										<View style={styles.col}>
											{IconComponent && <IconComponent name={iconName} size={20} color={theme.screen.icon} />}
											<Text style={{ ...styles.body, color: theme.screen.text }}>{category?.translations ? getFromCategoryTranslation(category?.translations, language) : category?.alias}</Text>
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
