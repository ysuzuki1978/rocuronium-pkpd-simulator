const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./lib/load-app');

const { formatClock, parseClock, withClock, minutesIntoCase } = loadApp();
const at = (h, m, s = 0) => new Date(2026, 9, 24, h, m, s);

test('formatClock pads and reads 00:00 at midnight', () => {
    assert.equal(formatClock(at(8, 5)), '08:05');
    assert.equal(formatClock(at(0, 0)), '00:00');
    assert.equal(formatClock(at(23, 59, 59)), '23:59');
});

test('parseClock accepts HH:MM and rejects everything else', () => {
    assert.deepEqual({ ...parseClock('08:05') }, { hours: 8, minutes: 5 });
    assert.deepEqual({ ...parseClock('8:05') }, { hours: 8, minutes: 5 });
    for (const bad of ['', '24:00', '12:60', '1205', '12:5', 'ab:cd', null, undefined]) {
        assert.equal(parseClock(bad), null, String(bad));
    }
});

test('withClock sets the time of day, clears seconds, does not mutate its argument', () => {
    const base = at(8, 0, 30);
    const result = withClock(base, '13:45');
    assert.equal(formatClock(result), '13:45');
    assert.equal(result.getSeconds(), 0);
    assert.equal(base.getHours(), 8);
    assert.equal(withClock(base, 'nope'), null);
});

test('minutesIntoCase: later the same day', () => {
    assert.deepEqual({ ...minutesIntoCase(at(8, 0), '08:30') }, { minutes: 30, wrapped: false });
    assert.deepEqual({ ...minutesIntoCase(at(8, 0), '23:59') }, { minutes: 959, wrapped: false });
});

test('minutesIntoCase: the same minute is minute 0, also when the start has seconds', () => {
    assert.deepEqual({ ...minutesIntoCase(at(8, 0), '08:00') }, { minutes: 0, wrapped: false });
    assert.deepEqual({ ...minutesIntoCase(at(8, 0, 45), '08:00') }, { minutes: 0, wrapped: false });
});

test('minutesIntoCase: just before the start is the next day', () => {
    assert.deepEqual({ ...minutesIntoCase(at(8, 0), '07:59') }, { minutes: 1439, wrapped: true });
});

test('minutesIntoCase: a case that crosses midnight', () => {
    assert.deepEqual({ ...minutesIntoCase(at(23, 50), '00:10') }, { minutes: 20, wrapped: true });
    assert.deepEqual({ ...minutesIntoCase(at(23, 50), '23:55') }, { minutes: 5, wrapped: false });
});

test('minutesIntoCase: invalid text is null, not NaN', () => {
    assert.equal(minutesIntoCase(at(8, 0), ''), null);
    assert.equal(minutesIntoCase(at(8, 0), '25:00'), null);
});

test('minutesIntoCase does not read global state', () => {
    // Loaded in a fresh context with no appState: it must still work.
    assert.equal(typeof globalThis.appState, 'undefined');
    assert.equal(minutesIntoCase(at(9, 0), '10:00').minutes, 60);
});
