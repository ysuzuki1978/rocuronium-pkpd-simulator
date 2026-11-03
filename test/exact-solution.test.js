const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./lib/load-app');
const { exactTrajectory } = require('./lib/exact');

const MODELS = ['Wierda', 'Szenohradszky', 'Cooper', 'AlvarezGomez', 'McCoy'];
const DURATION = 300;
const TOLERANCE = 1e-6;

// Events at minutes 10, 60 and 240, which accumulated floating-point time (t += 0.01)
// reached one step late. [timeMin, bolusMg, mcgKgMin]
const EVENT_SETS = {
    'bolus then infusion on at 10, off at 60': [[0, 40, 0], [10, 0, 5], [60, 0, 0]],
    'bolus at 10, infusion 60-240': [[10, 30, 0], [60, 0, 4], [240, 0, 0]],
    'repeated boluses and rate changes': [[0, 50, 0], [10, 0, 3], [60, 10, 6], [240, 0, 0]],
};

const WEIGHT = 70;

/** Worst relative error of Cp and Ce against the exact solution for one run. */
function worstError(app, model, events) {
    const engine = new app.PKCalculationEngine();
    const patient = new app.Patient('t', 50, WEIGHT, 170, app.SexType.MALE, model, new Date(2026, 9, 24, 8));
    const { pk, pd } = engine.calculatePKPDParameters(patient);
    const result = engine.performSimulation(patient, events.map(e => new app.DoseEvent(...e)), DURATION);
    // The rate is computed here, from µg/kg/min, not by the code under test.
    const exact = exactTrajectory(
        events.map(([timeMin, bolusMg, mcgKgMin]) => ({ timeMin, bolusMg, rateMgMin: mcgKgMin * WEIGHT / 1000 })),
        pk, pd.ke0, DURATION);
    assert.equal(result.timePoints.length, exact.length);
    let worst = 0;
    result.timePoints.forEach((tp, i) => {
        assert.equal(tp.timeInMinutes, exact[i].minute);
        for (const [got, want] of [[tp.plasmaConcentration, exact[i].cp], [tp.effectSiteConcentration, exact[i].ce]]) {
            if (want > 1e-6) worst = Math.max(worst, Math.abs(got - want) / want);
        }
    });
    return worst;
}

const app = loadApp();

for (const model of MODELS) {
    for (const [name, events] of Object.entries(EVENT_SETS)) {
        test(`exact solution: ${model}, ${name}`, () => {
            const worst = worstError(app, model, events);
            assert.ok(worst < TOLERANCE, `max relative error ${worst.toExponential(2)} >= ${TOLERANCE}`);
        });
    }
}

// Negative controls: each reintroduces a defect and must be caught by the same comparison.
const OLD_GRID = [
    ['for (let i = 0; i * timeStep <= finalDuration + GRID_EPS; i++) {\n            times.push(i * timeStep);\n        }',
        'for (let t = 0; t <= finalDuration; t += timeStep) {\n            times.push(t);\n        }'],
    ['currentTime >= infusionSchedule[infusionIndex].time - GRID_EPS', 'currentTime >= infusionSchedule[infusionIndex].time'],
];

test('control: the accumulated time grid (t += dt) is detected', () => {
    const old = loadApp({ 'calculator.js': OLD_GRID });
    const worst = worstError(old, 'Wierda', EVENT_SETS['bolus then infusion on at 10, off at 60']);
    assert.ok(worst > TOLERANCE, `old grid went unnoticed: ${worst.toExponential(2)}`);
});

test('control: a rate change applied one step late is detected', () => {
    const late = loadApp({ 'calculator.js': [
        ['currentTime >= infusionSchedule[infusionIndex].time - GRID_EPS', 'currentTime >= infusionSchedule[infusionIndex].time + timeStep'],
    ] });
    const worst = worstError(late, 'Wierda', EVENT_SETS['bolus then infusion on at 10, off at 60']);
    assert.ok(worst > TOLERANCE, `one-step delay went unnoticed: ${worst.toExponential(2)}`);
});

test('control: a 60x error in the infusion rate is detected', () => {
    const wrong = loadApp({ 'models.js': [['/ 1000.0', '* 60 / 1000.0']] });
    const worst = worstError(wrong, 'Wierda', EVENT_SETS['bolus then infusion on at 10, off at 60']);
    assert.ok(worst > 0.1, `60x rate went unnoticed: ${worst.toExponential(2)}`);
});
