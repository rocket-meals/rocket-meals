import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { RootState } from './reducer';
import { store } from './store/store';


export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
