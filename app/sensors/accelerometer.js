import { Accelerometer } from 'expo-sensors';

let isTracking = false;
let yValues = [];
const THRESHOLD = 0.1; // Ignore small fluctuations
const REP_START = 0.7; // Upper range where rep starts
const REP_END = -0.8; // Lower range where rep ends
const MIN_REP_TIME = 200; // Minimum time for a valid rep (ms)

export const trackAccelerometer = (start) => {
    if (start) {
        yValues = [];
        isTracking = true;
        Accelerometer.setUpdateInterval(50); // Faster update interval for accuracy

        Accelerometer.addListener(({ y }) => {
            const filteredY = Math.abs(y) < THRESHOLD ? 0 : y; // Remove small fluctuations
            yValues.push({ timestamp: Date.now(), y: filteredY });
        });

    } else {
        Accelerometer.removeAllListeners();
        isTracking = false;

        let reps = 0;
        let repTUT = [];
        let inRep = false;
        let startTime = 0;

        //console.log("Raw Y-Values:", yValues.map(p => p.y));

        for (let i = 1; i < yValues.length; i++) {
            let currentY = yValues[i].y;
            let timeDiff = startTime ? yValues[i].timestamp - startTime : 0;

            //console.log(`i: ${i}, Y: ${currentY}, inRep: ${inRep}, timeDiff: ${timeDiff}`);

            // Detect start of a rep (top of movement)
            if (!inRep && currentY >= REP_START) {
                inRep = true;
                startTime = yValues[i].timestamp;
                console.log("Rep started at Y:", currentY);
            }

            // Detect end of a rep (bottom of movement)
            if (inRep && currentY <= REP_END) {
                inRep = false;
                let duration = timeDiff / 1000; // Convert to seconds

                if (timeDiff > MIN_REP_TIME) {
                    reps++;
                    repTUT.push(duration.toFixed(2));
                    console.log(`Rep ${reps} completed. Time under tension: ${duration} sec`);
                } else {
                    console.log("Ignored short movement (not a full rep)");
                }
            }
        }

        //console.log(`Final Reps Counted: ${reps}, Time Under Tension per rep: ${repTUT}`);
        return { reps, timeUnderTension: repTUT };
    }
};
