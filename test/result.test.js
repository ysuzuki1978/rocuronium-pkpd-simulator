const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./lib/load-app');

const app = loadApp();
const engine = new app.PKCalculationEngine();
const patient = new app.Patient('t', 50, 70, 170, app.SexType.MALE, 'Wierda', new Date(2026, 9, 24, 23, 50));
const run = (duration = 120) => engine.performSimulation(patient, [new app.DoseEvent(0, 50, 0), new app.DoseEvent(30, 0, 5)], duration);

test('the result records its sample spacing and one point per spacing', () => {
    const result = run(120);
    assert.equal(result.sampleIntervalMin, 1);
    assert.equal(result.timePoints.length, 121);
    assert.equal(result.simulationDurationMinutes, 120);
});

test('pointAt finds samples by time, nearest, clamped to the run', () => {
    const result = run(120);
    assert.equal(result.pointAt(45).timeInMinutes, 45);
    assert.equal(result.pointAt(45.4).timeInMinutes, 45);
    assert.equal(result.pointAt(45.6).timeInMinutes, 46);
    assert.equal(result.pointAt(-5).timeInMinutes, 0);
    assert.equal(result.pointAt(999).timeInMinutes, 120);
});

test('pointAt does not assume index = minute', () => {
    const result = run(120);
    result.timePoints = result.timePoints.filter(tp => tp.timeInMinutes % 2 === 0); // every 2 min
    assert.equal(result.pointAt(50).timeInMinutes, 50);
    assert.equal(result.pointAt(51.2).timeInMinutes, 52);
});

test('formatCaseClock follows the start across midnight', () => {
    assert.equal(app.formatCaseClock(patient, 0), '23:50');
    assert.equal(app.formatCaseClock(patient, 10), '00:00');
    assert.equal(app.formatCaseClock(patient, 75), '01:05');
});

test('resultToCsv: header, one row per sample, fixed decimals', () => {
    const lines = app.resultToCsv(run(60)).split('\n');
    assert.equal(lines[0], 'ClockTime,Time(min),Cp(ug/mL),Ce(ug/mL),TOF_Ratio(%)');
    assert.equal(lines.length, 62);
    assert.match(lines[1], /^23:50,0,\d+\.\d{4},\d+\.\d{4},\d+\.\d{2}$/);
    assert.match(lines[11], /^00:00,10,/);
});

test('display formats', () => {
    assert.equal(app.formatConcentration(1.23456), '1.235');
    assert.equal(app.formatTofRatio(99.96), '100.0');
});
