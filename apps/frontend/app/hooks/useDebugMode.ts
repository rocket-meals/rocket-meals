import { useSelector } from 'react-redux';

import { RootState } from '@/redux/reducer';

const useDebugMode = () => {
        return useSelector((state: RootState) => state.settings.debugMode);
};

export default useDebugMode;
