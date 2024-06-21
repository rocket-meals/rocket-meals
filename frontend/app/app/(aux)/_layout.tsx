import React from 'react';
import {isUserLoggedIn} from '@/states/User';
import {MyDrawer, useRenderMyDrawerScreen} from '@/components/drawer/MyDrawer';
import {TranslationKeys, useTranslation} from '@/helper/translations/Translation';
import {MyDrawerCustomItemProps} from '@/components/drawer/MyDrawerCustomItemCenter';
import {DEFAULT_AUTHENTICATED_ROUTE} from "@/app/(app)/home";
import {useMyDrawerWikiItems, useRenderedMyDrawerWikiScreens} from "@/components/drawer/useMyDrawerWikiItems";

export const unstable_settings = {
	// Ensure that reloading on `/modal` keeps a back button present.
	initialRouteName: 'wikis/index',
};

export default function AppLayout() {
	// This layout can be deferred because it's not the root layout.
	const loggedIn = isUserLoggedIn();

	const translation_home = useTranslation(TranslationKeys.home);
	const translation_sign_in = useTranslation(TranslationKeys.sign_in);

	const customDrawerWikiItems = useMyDrawerWikiItems()
	const renderedMyDrawerWikiItems = useRenderedMyDrawerWikiScreens()

	const customDrawerItems: MyDrawerCustomItemProps[] = [
		/**
         {
         label: "Hallo",
         onPress: undefined,
         onPressInternalRouteTo: undefined,
         onPressExternalRouteTo: undefined,
         icon: "home",
         position: 0
         }
         */
	]

	if (!loggedIn) {
		customDrawerItems.push(
			{
				label: translation_sign_in,
				onPress: undefined,
				onPressInternalRouteTo: '(auth)/login',
				visibleInDrawer: true,
				onPressExternalRouteTo: undefined,
				icon: 'chevron-left',
				position: 0
			}
		)
	}
	if (loggedIn) {
		customDrawerItems.push(
			{
				label: translation_home,
				onPress: undefined,
				onPressInternalRouteTo: '/(app)'+DEFAULT_AUTHENTICATED_ROUTE,
				visibleInDrawer: true,
				onPressExternalRouteTo: undefined,
				icon: 'chevron-left',
				position: 0
			}
		)
	}

	if (customDrawerWikiItems) {
		customDrawerItems.push(...customDrawerWikiItems)
	}

	return (
		<MyDrawer
			customDrawerItems={customDrawerItems}
		>
			{renderedMyDrawerWikiItems}
		</MyDrawer>
	)
}
