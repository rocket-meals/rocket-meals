import React from 'react';
import { Redirect } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';

const Index = () => {
	const { loggedIn } = useSelector((state: RootState) => state.authReducer);
	if (loggedIn) {
		return <Redirect href="/(app)" />;
	} else {
		return <Redirect href="/(auth)/login" />;
	}
};

export default Index;
