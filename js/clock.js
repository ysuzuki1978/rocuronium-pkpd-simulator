// Wall-clock helpers: pure functions of their arguments (no DOM, no app state).
// Times of day are "HH:MM" strings in local time, 24-hour.

const MINUTES_PER_DAY = 1440;

/** "HH:MM" of a Date, local time, zero-padded, 00:00 at midnight. */
function formatClock(date) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** { hours, minutes } of an "HH:MM" string, or null when it is not a valid time of day. */
function parseClock(text) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(String(text).trim());
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    return hours < 24 && minutes < 60 ? { hours, minutes } : null;
}

/** A copy of `date` with its time of day set to "HH:MM" (seconds cleared); null when `text` is invalid. */
function withClock(date, text) {
    const clock = parseClock(text);
    if (!clock) return null;
    const result = new Date(date);
    result.setHours(clock.hours, clock.minutes, 0, 0);
    return result;
}

/**
 * How many minutes after `startDate` the clock time "HH:MM" falls. A time before the
 * start (to the minute) is read as the following day, the only reading that describes
 * a case; `wrapped` says that happened. Returns null when `text` is invalid.
 */
function minutesIntoCase(startDate, text) {
    const clock = parseClock(text);
    if (!clock) return null;
    const start = new Date(startDate);
    start.setSeconds(0, 0);
    const at = withClock(start, text);
    let diff = Math.round((at.getTime() - start.getTime()) / 60000);
    const wrapped = diff < 0;
    if (wrapped) diff += MINUTES_PER_DAY;
    return { minutes: diff, wrapped };
}
