import { SET_COLOR, SET_SERVER_INFO } from '@/redux/Types/types';
import { ServerAPI, ServerInfo } from '@/redux/actions';
import { RootState } from '@/redux/reducer';
import { darkTheme, lightTheme } from '@/styles/themes';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

export interface ServerStatusFlowLoaderProps {
	children?: React.ReactNode;
}

export const ServerStatusLoader: React.FC<ServerStatusFlowLoaderProps> = ({ children }) => {
	const dispatch = useDispatch();
	const { primaryColor } = useSelector((state: RootState) => state.settings);

	async function loadServerInfo(): Promise<ServerInfo | null> {
		try {
			const result = await ServerAPI.downloadServerInfo();
			return result;
		} catch (error) {
			console.error('Failed to fetch server info:', error);
			return null;
		}
	}

	async function loadInformation() {
		const TIMEOUT_IN_SECONDS = 15;
		const timeoutInMillis = 1000 * TIMEOUT_IN_SECONDS;

		const timeoutPromise = new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Request timed out')), timeoutInMillis));

		const serverLoadPromise = loadServerInfo();

		try {
			const response = await Promise.race([serverLoadPromise, timeoutPromise]);
			if (response) {
				const serverInfo = response as ServerInfo;
				darkTheme.primary = serverInfo?.info?.project?.project_color || darkTheme.primary;
				darkTheme.activeBackground = serverInfo?.info?.project?.project_color || darkTheme.activeBackground;
				darkTheme.login.linkButton = serverInfo?.info?.project?.project_color || darkTheme.login.linkButton;
				darkTheme.modal.inputBorderValid = serverInfo?.info?.project?.project_color || darkTheme.modal.inputBorderValid;
				darkTheme.sheet.inputBorderValid = serverInfo?.info?.project?.project_color || darkTheme.sheet.inputBorderValid;
				darkTheme.activeBackground = serverInfo?.info?.project?.project_color || darkTheme.activeBackground;

				//Light Theme
				lightTheme.primary = serverInfo?.info?.project?.project_color || lightTheme.primary;
				lightTheme.activeBackground = serverInfo?.info?.project?.project_color || lightTheme.activeBackground;
				lightTheme.login.linkButton = serverInfo?.info?.project?.project_color || lightTheme.login.linkButton;
				lightTheme.modal.inputBorderValid = serverInfo?.info?.project?.project_color || lightTheme.modal.inputBorderValid;
				lightTheme.sheet.inputBorderValid = serverInfo?.info?.project?.project_color || lightTheme.sheet.inputBorderValid;
				lightTheme.activeBackground = serverInfo?.info?.project?.project_color || lightTheme.activeBackground;

				dispatch({
					type: SET_COLOR,
					payload: serverInfo?.info?.project?.project_color || '#FCDE31',
				});
				dispatch({ type: SET_SERVER_INFO, payload: serverInfo });
			}
		} catch (error) {
			console.error('Error loading server information:', error);
		}
	}

	useEffect(() => {
		loadInformation();
	}, [primaryColor]);

	return <>{children}</>;
};

export default ServerStatusLoader;
