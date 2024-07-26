import {Apartments, Buildings, Washingmachines} from '@/helper/database/databaseTypes/types';
import React, {useEffect, useState} from 'react';
import {useSynchedBuildingsDict} from "@/states/SynchedBuildings";
import {DetailsComponentTabProps} from "@/components/detailsComponent/DetailsComponent";
import {MySpinner, Text, View} from "@/components/Themed";
import {
	getDemoWashingmachines,
	loadApartmentWithWashingMachinesFromServer,
	useSynchedApartmentsDict
} from "@/states/SynchedApartments";
import {BuildingDetailsWithObject} from "@/compositions/buildings/BuildingDetails";
import {IconNames} from "@/constants/IconNames";
import {TranslationKeys, useTranslation} from "@/helper/translations/Translation";
import {DateHelper} from "@/helper/date/DateHelper";
import {WashingmachineAnimation} from "@/compositions/animations/WashingmachineAnimation";
import {Rectangle, RectangleWithLayoutCharactersWide} from "@/components/shapes/Rectangle";
import {MyButtonNotify} from "@/components/buttons/MyButtonNotify";
import {NotificationHelper} from "@/helper/notification/NotificationHelper";
import {NotificationRequest} from "expo-notifications";
import {Platform} from "react-native";
import {PlatformHelper} from "@/helper/PlatformHelper";
import {DisabledTouchableOpacity} from "@/components/buttons/DisabledTouchableOpacity";
import {useProjectName} from "@/states/ProjectInfo";
import {useIsDemo} from "@/states/SynchedDemo";
import {useHousingAreaColor} from "@/states/SynchedAppSettings";

export default function ApartmentDetails({ apartmentId }: { apartmentId: string }) {
	const [buildingsDict, setBuildingsDict] = useSynchedBuildingsDict()
	const [apartmentsDict, setApartmentsDict] = useSynchedApartmentsDict()
	const apartment = apartmentsDict?.[apartmentId];
	const buildingId = apartment?.building;
	let building = buildingsDict?.[buildingId];

	if(building && typeof building === 'object' && apartment && typeof apartment === 'object'){
		return <ApartmentDetailsWithObject building={building} apartment={apartment} />
	}
}

function Washingmachine({ washingmachine, index }: { washingmachine: Washingmachines, index: number }) {
	const [notification, setNotification] = useState<NotificationRequest | null | undefined>(undefined);
	const [error, setError] = useState<any>(undefined);
	const notificationKey = "WashingMachine"+washingmachine.id;
	const notificationActive = notification !== undefined && notification !== null;

	const deviceCanBeNotified = !PlatformHelper.isWeb();

	const housingAreaColor = useHousingAreaColor();

	async function loadNotification(){
		let notification = null;
		try{
			notification = await NotificationHelper.getScheduleLocalNotificationByCustomIdentifier(notificationKey);
		} catch (e) {
			console.error("NotificationHelperComponentLocalMobile.loadNotification", notificationKey, e);
			setError(e);
		}
		setNotification(notification);
	}

	// run useEffect to get NotificationHelper notification by custom Identifier
	useEffect(() => {
		//console.log("useEffect: loadNotification");
		if(deviceCanBeNotified){
			loadNotification();
		}
	}, []);

	const date_finished_string = washingmachine.date_finished;
	const now = new Date();
	const isFinished = date_finished_string && new Date(date_finished_string) < now;
	const isDateFinishedUnknown = !date_finished_string;

	const translation_washingmachine = useTranslation(TranslationKeys.washing_machine)

	const translation_washingmachine_finished = useTranslation(TranslationKeys.washingmachine_state_finished)
	const translation_washingmachine_estimate_finished = useTranslation(TranslationKeys.washingmachine_estimate_finished_at);
	const translation_washingmachine_state_unknown = useTranslation(TranslationKeys.washingmachine_state_unknown)

	const projectName = useProjectName()

	const isDemo = useIsDemo();


	const displayName = washingmachine.alias || washingmachine.id;
	const tooltip = translation_washingmachine + ": " + displayName;

	let state_text: any = translation_washingmachine_state_unknown
	let animationRunning = false;
	let canBeNotified = false;


	let renderedNotifyButton = null;

	if(!isDateFinishedUnknown){
		const date_finished = new Date(date_finished_string);
		const minutes_until_finished = DateHelper.formatDateToHHMM(date_finished);
		animationRunning = !isFinished;
		canBeNotified = !isFinished;
		state_text = isFinished ? translation_washingmachine_finished : translation_washingmachine_estimate_finished+": "+minutes_until_finished

		if(canBeNotified){
			const secondsFromNow = DateHelper.getSecondsToDate(date_finished);
			let notificationBody = {
				title: projectName,
				body: translation_washingmachine_finished+": "+displayName,
				secondsFromNow: secondsFromNow
			}

			renderedNotifyButton = <MyButtonNotify color={housingAreaColor} tooltip={tooltip} accessibilityLabel={tooltip} active={notificationActive} onPress={() => {
				setError(null);
				try{
					if(notificationActive){
						NotificationHelper.cancelScheduledLocalNotification(notificationKey);
					} else {
						// title, body, secondsFromNow, customIdentifier
						let notificationMessageObject = notificationBody

						const title = notificationMessageObject?.title || "title";
						const body = notificationMessageObject?.body || "body";
						let secondsFromNow = notificationMessageObject?.secondsFromNow
						if(isDemo){
							secondsFromNow = 10;
						}

						NotificationHelper.scheduleLocalNotification(title, body, secondsFromNow, notificationKey);
					}
					loadNotification();
				} catch (e){
					setError(e);
				}
			}} />
		}
	}

	if(!deviceCanBeNotified){
		renderedNotifyButton = <DisabledTouchableOpacity reason={"Im Browser nicht nutzbar"}>
			{renderedNotifyButton}
		</DisabledTouchableOpacity>
	}

	let renderedError = null;
	if(error){
		renderedError = <View><Text>{JSON.stringify(error, null, 2)}</Text></View>
	}

	return <View style={{
		width: '100%',
		paddingBottom: 20,
	}}>
		<View style={{
			width: '100%',
			flexDirection: 'row',
		}}>
			<View style={{
				justifyContent: 'flex-start',
			}}>
				<RectangleWithLayoutCharactersWide amountOfCharactersWide={10}>
					<WashingmachineAnimation active={animationRunning}/>
				</RectangleWithLayoutCharactersWide>
			</View>
			<View style={{
				justifyContent: 'space-between',
				flexWrap: 'wrap',
				flexDirection: 'row',
				flexGrow: 1,
			}}>
				<View style={{
					flex: 1,
					flexWrap: 'wrap',
					justifyContent: 'flex-start',
					alignItems: 'flex-start',
				}}>
					<Text>{displayName}</Text>
					<Text>{state_text}</Text>
				</View>
				<View>
					{renderedNotifyButton}
				</View>
			</View>
		</View>
		{renderedError}
		<View>
			<Text>{JSON.stringify(notification, null, 2)}</Text>
		</View>
	</View>
}

function ApartmentDetailsWashingMachines({ apartment }: { apartment: Apartments }) {
	const updateWashersInSeconds = 10;
	const apartment_id = apartment.id;
	const [washmashines, setWashmashines] = useState<Washingmachines[] | undefined | null>(undefined);
	const demo = useIsDemo();

	// This variable is used to store the timeout id for clearing later
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	async function loadWashmashines() {
		console.log("Loading washing machines for apartment " + apartment_id);
		try {
			if(demo){
				let demoMachines = getDemoWashingmachines();
				setWashmashines(demoMachines);
			} else {
				let result = await loadApartmentWithWashingMachinesFromServer(apartment_id);
				setWashmashines(result.washingmachines);
			}
		} catch (e) {
			console.error(e);
			setWashmashines(null);
		}
	}

	async function reloadWashmashines() {
		let timeout = updateWashersInSeconds * 1000;
		timeoutId = setTimeout(() => {
			loadWashmashines();
			reloadWashmashines();
		}, timeout);
	}

	useEffect(() => {
		loadWashmashines();
		reloadWashmashines();

		// Cleanup function
		return () => {
			if (timeoutId) {
				console.log("Clearing timeout for washing machines");
				clearTimeout(timeoutId);
			}
		};
	}, [apartment_id]); // Only re-run the effect if apartment_id changes

	if (washmashines === undefined) {
		return <MySpinner />;
	} else if (washmashines === null) {
		return <Text>{"Error loading washing machines"}</Text>;
	} else {
		let renderedWashingmachines: JSX.Element[] = [];
		for (let i = 0; i < washmashines.length; i++) {
			const washingmachine = washmashines[i];
			if (!!washingmachine && typeof washingmachine === 'object') {
				renderedWashingmachines.push(<Washingmachine index={i} key={washingmachine.id} washingmachine={washingmachine} />);
			}
		}
		return <View style={{ width: '100%' }}>{renderedWashingmachines}</View>;
	}
}

function ApartmentDetailsWithObject({ apartment, building }: { apartment: Apartments, building: Buildings }) {

	const translation_washing_machines = useTranslation(TranslationKeys.washing_machines)

	const housingAreaColor = useHousingAreaColor();

	let additionalTabs: DetailsComponentTabProps[] = []
	let washingmachinesTab: DetailsComponentTabProps = {
		iconName: IconNames.washing_machine_icon,
		color: housingAreaColor,
		accessibilityLabel: translation_washing_machines,
		text: translation_washing_machines,
		content: <ApartmentDetailsWashingMachines apartment={apartment} />
	}
	if(apartment.washingmachines && apartment.washingmachines.length > 0){
		additionalTabs.push(washingmachinesTab)
	}

	return <BuildingDetailsWithObject building={building} additionalTabs={additionalTabs} color={housingAreaColor}  />
}