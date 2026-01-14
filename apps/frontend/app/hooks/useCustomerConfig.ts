import { useEffect, useMemo, useState } from 'react';
import { ConfigCustomerEnum, CustomerConfig, getCustomerConfig, getCustomerConfigsDict } from '@/config';
import { configureStore } from '@/redux/store';

const customerConfigs = getCustomerConfigsDict();

export const useCustomerConfig = (): CustomerConfig => {
        const [selectedCustomer, setSelectedCustomer] = useState<ConfigCustomerEnum>(
                configureStore.getState().settings.selectedCustomer
        );

        useEffect(() => {
                const unsubscribe = configureStore.subscribe(() => {
                        setSelectedCustomer(configureStore.getState().settings.selectedCustomer);
                });

                return () => unsubscribe();
        }, []);

        return useMemo(
                () => customerConfigs[selectedCustomer] ?? getCustomerConfig(),
                [selectedCustomer]
        );
};

export default useCustomerConfig;
