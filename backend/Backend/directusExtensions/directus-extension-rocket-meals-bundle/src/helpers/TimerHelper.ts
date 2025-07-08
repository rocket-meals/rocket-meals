
import { MathUtil } from '@rocket-meals/shared';

export class TimerHelper {

    private name: string;
    private total_count: number;
    private current_count: number;
    private print_every_x_count: number;
    private startTime: number;
    private lastTime: number | undefined

    constructor(name: string, total_count: number, print_every_x_count: number) {
        this.name = name;
        this.total_count = total_count;
        this.startTime = this.private_getNow();
        this.current_count = 0;
        this.lastTime = undefined;
        this.print_every_x_count = print_every_x_count || 100;
    }

    start() {
        this.startTime = this.private_getNow();
        this.lastTime = this.startTime;
        this.current_count = 0;
    }

    private_getNow(){
       let date = new Date();
       return date.getTime();
    }

    calcEstimatedFinishedDate(current_count: number) {
        //console.log("calcEstimatedFinishedDate: current_count: "+current_count)
        let timeSpent = MathUtil.divide(MathUtil.subtract(this.private_getNow(), this.startTime), 1000); // Time spent in seconds
        //console.log("timeSpent: "+timeSpent);
        let averageTimePerTransaction = timeSpent / current_count;
        //console.log("averageTimePerTransaction: "+averageTimePerTransaction)
        let estimatedTotalTime = averageTimePerTransaction * this.total_count;
        //console.log("estimatedTotalTime: "+estimatedTotalTime);
        let estimatedCompletionTime = new Date(this.private_getNow() + (estimatedTotalTime - timeSpent) * 1000);
        //console.log("estimatedCompletionTime: "+estimatedCompletionTime);
        return estimatedCompletionTime;
    }

    formatSecondsIntoHHMMSS(remainingTime: number){
        // Convert remaining time to HH:MM:SS format
        let hours = Math.floor(remainingTime / 3600);
        let minutes = Math.floor((remainingTime % 3600) / 60);
        let seconds = Math.floor(remainingTime % 60);

        let remainingTimeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        return remainingTimeString;
    }

    setCurrentCount(current_count: number){
        this.current_count = current_count;
        if (this.startTime === undefined) {
            console.log("Timer not started.");
            return;
        }
        if(current_count===0){
            return; // skip division by 0
        }
        if(current_count % this.print_every_x_count!==0){
            // skipping since to much calculation
            return;
        }

        let now = this.private_getNow()
        this.lastTime = now;
    }

    calcTimeSpent(){
        let current_count = this.current_count;
        let now = this.lastTime || this.private_getNow();
        let remainingTime = (this.calcEstimatedFinishedDate(current_count).getTime() - now) / 1000; // Remaining time in seconds
        let remainingTimeString = this.formatSecondsIntoHHMMSS(remainingTime);
        let estimatedCompletionTimeString = this.calcEstimatedFinishedDate(current_count).toLocaleTimeString();
        let totalTimeInformation = `Estimated remaining time for ${this.name}: ${remainingTimeString}, probably finished at: ${estimatedCompletionTimeString} - `+current_count+" / "+this.total_count

        // print how many HH:MM:SS between now and this.lastTime divided by this.print_every_x_count to print the average
        // Calculate average time per count since last print
        let averageTimePerCount: number | undefined = undefined;
        let averageTimePerCountFormatted: string | undefined = undefined;
        if(!!this.lastTime){
            let timeSinceLastPrint = (now - this.lastTime) / 1000; // Time in seconds
            averageTimePerCount = timeSinceLastPrint / this.print_every_x_count;
            averageTimePerCountFormatted = this.formatSecondsIntoHHMMSS(averageTimePerCount);
        }

        return {
            totalTimeInformation: totalTimeInformation,
            remainingTime: remainingTime,
            estimatedCompletionTime: this.calcEstimatedFinishedDate(current_count),
            estimatedCompletionTimeString: estimatedCompletionTimeString,
            remainingTimeString: remainingTimeString,
            averageTimePerCount: averageTimePerCount,
            averageTimePerCountFormatted: averageTimePerCountFormatted,
        }
    }

    printEstimatedTime() {
        let calcTimeSpentResult = this.calcTimeSpent();
        console.log(calcTimeSpentResult.totalTimeInformation);
    }
}
