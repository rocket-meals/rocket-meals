import { useMemo } from 'react';
import useCustomerConfig from './useCustomerConfig';

const useCustomerServerUrl = () => {
        const customerConfig = useCustomerConfig();

        return useMemo(() => customerConfig.server_url, [customerConfig]);
};

export default useCustomerServerUrl;
