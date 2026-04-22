import React from 'react';
import { FriendsContent } from '@/components/FriendsContent';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { TranslationKeys } from '@/locales/keys';

const FriendshipsScreen = () => {
useSetPageTitle(TranslationKeys.friendships);
return <FriendsContent showHeading={true} />;
};

export default FriendshipsScreen;
