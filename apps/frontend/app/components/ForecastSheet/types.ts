import {DatabaseTypes} from 'repo-depkit-common';

export interface ForecastSheetProps {
        forDate: string;
        canteen: DatabaseTypes.Canteens | null;
}
