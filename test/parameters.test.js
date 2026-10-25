const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./lib/load-app');

const app = loadApp();
const engine = new app.PKCalculationEngine();
const patient = (age, weight, sex, model) => new app.Patient('t', age, weight, 170, sex, model, new Date(2026, 9, 24, 8));
const close = (got, want, label) => assert.ok(Math.abs(got - want) < 1e-9, `${label}: ${got} != ${want}`);

test('Wierda (Masui 2018), age 50, male: parameters are the published typical values', () => {
    const { pk, pd } = engine.calculatePKPDParameters(patient(50, 70, app.SexType.MALE, 'Wierda'));
    close(pk.v1, 0.044 * 70, 'V1 (0.044 L/kg x 70 kg)');
    close(pk.k10, 0.1, 'k10');
    close(pk.k12, 0.21, 'k12');
    close(pk.k13, 0.028, 'k13');
    close(pk.k21, 0.13, 'k21');
    close(pk.k31, 0.01, 'k31');
    close(pd.ke0, 0.100, 'ke0');
    close(pd.ce50, 1.08, 'Ce50');
    close(pd.gamma, 6.41, 'gamma');
    assert.equal(pd.e0, 100);
    assert.equal(pd.emax, 0);
});

test('Wierda covariates: age 70, female, 60 kg (terms worked out by hand from the thetas)', () => {
    const { pk, pd } = engine.calculatePKPDParameters(patient(70, 60, app.SexType.FEMALE, 'Wierda'));
    close(pk.v1, 0.044 * 60, 'V1');
    close(pd.ce50, 1.08 + 20 * -0.00605, 'Ce50');                       // 0.959
    close(pd.gamma, 6.41 + 20 * -0.0494 + 1 * -1.24, 'gamma');          // 4.182
    close(pd.ke0, 0.100 + 20 * -0.00138, 'ke0');                        // 0.0724
});

test('the sex term acts only on gamma, and only where the model has one', () => {
    for (const model of ['Wierda', 'Cooper', 'AlvarezGomez']) {
        const male = engine.calculatePKPDParameters(patient(50, 70, app.SexType.MALE, model)).pd;
        const female = engine.calculatePKPDParameters(patient(50, 70, app.SexType.FEMALE, model)).pd;
        assert.notEqual(male.gamma, female.gamma, `${model} gamma should depend on sex`);
        assert.equal(male.ce50, female.ce50);
        assert.equal(male.ke0, female.ke0);
    }
    for (const model of ['Szenohradszky', 'McCoy']) {
        const male = engine.calculatePKPDParameters(patient(50, 70, app.SexType.MALE, model)).pd;
        const female = engine.calculatePKPDParameters(patient(50, 70, app.SexType.FEMALE, model)).pd;
        assert.equal(male.gamma, female.gamma, `${model} has no sex term`);
    }
});

test('V1 is per kg of body weight in every model', () => {
    for (const model of Object.keys(app.RocuroniumPKPDModelData)) {
        const a = engine.calculatePKPDParameters(patient(50, 50, app.SexType.MALE, model)).pk;
        const b = engine.calculatePKPDParameters(patient(50, 100, app.SexType.MALE, model)).pk;
        close(b.v1 / a.v1, 2, `${model} V1 ratio`);
        assert.equal(a.k10, b.k10);
    }
});

test('all five models are present; McCoy is the two-compartment one', () => {
    assert.deepEqual(Object.keys(app.RocuroniumPKPDModelData).sort(),
        ['AlvarezGomez', 'Cooper', 'McCoy', 'Szenohradszky', 'Wierda']);
    for (const [model, { pk }] of Object.entries(app.RocuroniumPKPDModelData)) {
        for (const key of ['k10', 'k12', 'k21', 'v1_bw']) assert.ok(pk[key] > 0, `${model}.${key}`);
        const threeCompartment = model !== 'McCoy';
        assert.equal(pk.k13 > 0, threeCompartment, `${model}.k13`);
        assert.equal(pk.k31 > 0, threeCompartment, `${model}.k31`);
    }
});
