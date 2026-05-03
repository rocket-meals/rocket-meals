import { useEffect, useMemo, useState } from 'react';
import { ConfigCustomerEnum, CustomerConfig, getCustomerConfig, getCustomerConfigsDict, getCustomerEnumForConfig } from '@/config';
import { store } from '@/redux/store';

const customerConfigs = getCustomerConfigsDict();

const getFallbackCustomer = (): ConfigCustomerEnum =>
	store.getState().settings.selectedCustomer
	?? getCustomerEnumForConfig(getCustomerConfig())
	?? ConfigCustomerEnum.TEST;

export const useCustomerConfig = (): CustomerConfig => {
        const [selectedCustomer, setSelectedCustomer] = useState<ConfigCustomerEnum>(
                getFallbackCustomer()
        );

        useEffect(() => {
                const unsubscribe = store.subscribe(() => {
                        const next = store.getState().settings.selectedCustomer;
                        if (next !== null && next !== undefined) {
                                setSelectedCustomer(next);
                        }
                });

                return () => unsubscribe();
        }, []);

        return useMemo(
                () => customerConfigs[selectedCustomer] ?? getCustomerConfig(),
                [selectedCustomer]
        );
};

export default useCustomerConfig;
