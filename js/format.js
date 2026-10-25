// Display formatting: numbers, clock labels and CSV text. Pure functions of their
// arguments; the model classes in models.js hold data only.

/** Cp, Ce and their peaks, ug/mL, as shown on screen. */
function formatConcentration(value) {
    return value.toFixed(3);
}

/** TOF ratio, %, as shown on screen. */
function formatTofRatio(value) {
    return value.toFixed(1);
}

/** "HH:MM" of the moment `minutes` after the anesthesia start of `patient`. */
function formatCaseClock(patient, minutes) {
    return formatClock(patient.minutesToClockTime(minutes));
}

/** CSV text of a simulation result: one row per sample, clock time first. */
function resultToCsv(result) {
    const lines = ["ClockTime,Time(min),Cp(ug/mL),Ce(ug/mL),TOF_Ratio(%)"];
    for (const tp of result.timePoints) {
        lines.push([
            formatCaseClock(result.patient, tp.timeInMinutes),
            tp.timeInMinutes,
            tp.plasmaConcentration.toFixed(4),
            tp.effectSiteConcentration.toFixed(4),
            tp.tofRatio.toFixed(2)
        ].join(','));
    }
    return lines.join("\n");
}
