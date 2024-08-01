import {WashingmachineParserInterface} from "./../WashingmachineParserInterface";
import {Washingmachines} from "../../databaseTypes/types";
import {DateHelper} from "../../helpers/DateHelper";


export class TestWashingmachineParser implements WashingmachineParserInterface {

    constructor() {

    }

    async getWashingmachines(): Promise<Partial<Washingmachines>[]> {

        let washingmachines: Partial<Washingmachines>[] = []

        // create 2 washingmachines, one is free, one is occupied
        // switch between free and occupied every 5 minutes
        let external_identifier_1 = "test_washingmachine_1"; // occupied on 0-5 minutes, free on 5-10 minutes, ...
        let external_identifier_2 = "test_washingmachine_2"; // free on 0-5 minutes, occupied on 5-10 minutes, ...

        let occupiedWashingmachineDateFinished = new Date();
        // set the minutes to the next 5 minute interval (e.g. 0-5, 5-10, 10-15, ...)
        occupiedWashingmachineDateFinished.setMinutes(occupiedWashingmachineDateFinished.getMinutes() + (5 - occupiedWashingmachineDateFinished.getMinutes() % 5));

        // washingmachine 1 is occupied if the current minute is 0-5, 10-15, 20-25, ...
        let isWashingMachine1Occupied = occupiedWashingmachineDateFinished.getMinutes() % 10 < 5;

        let occupiedWashingmachineExternalIdentifier = isWashingMachine1Occupied ? external_identifier_1 : external_identifier_2;
        let freeWashingmachineExternalIdentifier = isWashingMachine1Occupied ? external_identifier_2 : external_identifier_1;

        let occupiedWashingmachine: Partial<Washingmachines> = {
            external_identifier: occupiedWashingmachineExternalIdentifier,
            date_finished: DateHelper.formatDateToIso8601WithoutTimezone(occupiedWashingmachineDateFinished)
        }

        let freeWashingmachine: Partial<Washingmachines> = {
            external_identifier: freeWashingmachineExternalIdentifier,
            date_finished: null
        }

        washingmachines.push(occupiedWashingmachine);
        washingmachines.push(freeWashingmachine);

        return washingmachines;

    }

}
