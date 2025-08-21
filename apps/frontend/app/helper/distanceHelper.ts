export type LocationType = {
	latitude: number;
	longitude: number;
};

export { calculateDistanceInMeter } from 'repo-depkit-common';

export function getDistanceUnit(distance: number): string {
	if (distance > 1000) {
		return `${(distance / 1000).toFixed(2)} km`; // Return distance in kilometers with 2 decimal places
	} else {
		return `${Math.round(distance)} m`; // Return distance in meters rounded to the nearest integer
	}
}
