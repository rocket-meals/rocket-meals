import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { UserHelper } from '@/helper/UserHelper';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';

const useLogoutButtonTranslation = () => {
        const { translate } = useLanguage();
        const { user } = useSelector((state: RootState) => state.authReducer);
        const isRegisteredUser = UserHelper.isRegisteredUser(user);

        const buttonLabel = useMemo(
                () => translate(isRegisteredUser ? TranslationKeys.logout : TranslationKeys.sign_in),
                [isRegisteredUser, translate]
        );

        const modalDescription = useMemo(
                () => translate(TranslationKeys.logout_flow_modal_description),
                [translate]
        );

        return { buttonLabel, modalDescription, isRegisteredUser };
};

export default useLogoutButtonTranslation;
