import { ActivityIndicator, Dimensions, Text, TouchableOpacity, View } from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { Entypo } from '@expo/vector-icons';
import { FormCategoriesHelper } from '@/redux/actions/Forms/FormCategories';
import { DatabaseTypes } from 'repo-depkit-common';
import { router, useFocusEffect } from 'expo-router';
import { useAppSelector } from '@/redux/hooks';
import { getFromCategoryTranslation } from '@/helper/resourceHelper';
import { iconLibraries } from '@/components/Drawer/CustomDrawerContent';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { FlashList } from '@shopify/flash-list';

const Index = () => {
	useSetPageTitle(TranslationKeys.select_a_form_category);
	const { theme } = useTheme();
	const [loading, setLoading] = useState(false);
	const { language } = useAppSelector((state) => state.settings);
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

	const renderItem = useCallback(({ item: category }: { item: DatabaseTypes.FormCategories }) => {
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
	}, [theme, language]);

	const keyExtractor = useCallback((item: DatabaseTypes.FormCategories) => item?.id ?? '', []);

	return (
		<View style={{ ...styles.container, backgroundColor: theme.screen.background }}>
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
				<View style={{ flex: 1, alignItems: 'center' }}>
					<View style={{ width: screenWidth > 600 ? '80%' : '90%', flex: 1 }}>
						<FlashList
							data={formCategories}
							renderItem={renderItem}
							keyExtractor={keyExtractor}
							contentContainerStyle={{ paddingVertical: 20, gap: 10 }}
							// @ts-ignore: estimatedItemSize is missing in the type definition but required for performance
							estimatedItemSize={50}
							extraData={[theme, language]}
						/>
					</View>
				</View>
			)}
		</View>
	);
};

export default Index;
