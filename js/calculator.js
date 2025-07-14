// PK/PD Calculation Engine for Rocuronium

// Based on Masui, K., et al. J Anesth 32, 709–716 (2018).
const RocuroniumPKPDModelData = {
    Wierda: {
        pk: { v1_bw: 0.044, k10: 0.1, k12: 0.21, k13: 0.028, k21: 0.13, k31: 0.01 },
        pd: { theta2: 1.08, theta3: 6.41, theta4: 0.100, theta5: -0.00605, theta6: -0.0494, theta7: -1.24, theta8: -0.00138 }
    },
    Szenohradszky: {
        pk: { v1_bw: 0.0769, k10: 0.0376, k12: 0.1143, k13: 0.0196, k21: 0.1748, k31: 0.0189 },
        pd: { theta2: 1.44, theta3: 8.30, theta4: 0.247, theta5: -0.00862, theta6: -0.0981, theta7: null, theta8: -0.00343 }
    },
    Cooper: {
        pk: { v1_bw: 0.0385, k10: 0.119, k12: 0.259, k13: 0.060, k21: 0.163, k31: 0.012 },
        pd: { theta2: 0.980, theta3: 6.18, theta4: 0.0820, theta5: -0.00557, theta6: -0.0341, theta7: -1.32, theta8: -0.00109 }
    },
    AlvarezGomez: {
        pk: { v1_bw: 0.057, k10: 0.0952, k12: 0.2807, k13: 0.0322, k21: 0.2149, k31: 0.0166 },
        pd: { theta2: 0.900, theta3: 5.99, theta4: 0.110, theta5: -0.00539, theta6: -0.0443, theta7: -1.14, theta8: -0.00158 }
    },
    McCoy: {
        pk: { v1_bw: 0.0622, k10: 0.0530, k12: 0.0334, k13: 0, k21: 0.0141, k31: 0 }, // 2-compartment
        pd: { theta2: 1.08, theta3: 4.20, theta4: 0.113, theta5: -0.00770, theta6: -0.0283, theta7: null, theta8: null }
    }
};

class PKCalculationEngine {

    calculatePKPDParameters(patient) {
        const modelData = RocuroniumPKPDModelData[patient.model];
        if (!modelData) {
            throw new Error(`Invalid model selected: ${patient.model}`);
        }

        const { pk, pd } = modelData;
        const { age, weight, sex } = patient;

        // PK Parameters
        const v1 = pk.v1_bw * weight;
        const pkParams = { v1, ...pk };

        // PD Parameters
        const ageTerm = age - 50;
        
        const ce50 = pd.theta2 + ageTerm * pd.theta5;
        let gamma = pd.theta3 + ageTerm * pd.theta6;
        if (pd.theta7 !== null) { // Wierda, Cooper, AlvarezGomez
            gamma += sex * pd.theta7;
        }

        let ke0 = pd.theta4;
        if (pd.theta8 !== null) { // Not for McCoy
            ke0 += ageTerm * pd.theta8;
        }

        const pdParams = {
            ke0: ke0,
            ce50: ce50,
            gamma: gamma,
            e0: 100, // Assuming TOF ratio starts at 100%
            emax: 0   // Max effect is TOF ratio 0%
        };

        return new RocuroniumPKPDParameters(pkParams, pdParams);
    }

    performSimulation(patient, doseEvents, simulationDurationMin = null) {
        if (!doseEvents || doseEvents.length === 0) {
            throw new Error("At least one dose event is required");
        }

        const params = this.calculatePKPDParameters(patient);
        const { pk, pd } = params;

        const maxEventTime = Math.max(...doseEvents.map(event => event.timeInMinutes));
        const finalDuration = simulationDurationMin || (maxEventTime + 240.0); // Extend simulation time
        
        const timeStep = 0.01; // 0.01 min precision
        const times = [];
        for (let t = 0; t <= finalDuration; t += timeStep) {
            times.push(t);
        }

        // --- Plasma Concentration Calculation ---
        const plasmaConcentrations = this.calculatePlasmaConcentrations(patient, doseEvents, times, pk);

        // --- Effect-Site Concentration Calculation ---
        const effectSiteConcentrations = this.calculateEffectSiteConcentrations(plasmaConcentrations, times, pd.ke0);

        // --- TOF Ratio Calculation ---
        const tofRatios = this.calculateTofRatios(effectSiteConcentrations, pd);

        // --- Format Results ---
        const timePoints = [];
        const sampleInterval = Math.round(1.0 / timeStep); // Sample every 1 minute for display

        for (let i = 0; i < times.length; i += sampleInterval) {
            if (i >= times.length) break;
            
            const currentTime = times[i];
            const plasma = plasmaConcentrations[i];
            const effectSite = effectSiteConcentrations[i];
            const tof = tofRatios[i];

            const doseEvent = doseEvents.find(event => Math.abs(event.timeInMinutes - currentTime) < 0.5);

            timePoints.push(new TimePoint(Math.round(currentTime), doseEvent, plasma, effectSite, tof));
        }
        
        return new SimulationResult(
            timePoints,
            patient,
            doseEvents,
            `${ModelType.displayName(patient.model)} Model`,
            new Date()
        );
    }

    calculatePlasmaConcentrations(patient, doseEvents, times, pkParams) {
        const timeStep = times.length > 1 ? times[1] - times[0] : 0.01;
        let state = new SystemState();
        const plasmaConcentrations = [];

        const infusionSchedule = this.createInfusionSchedule(doseEvents, patient);
        let currentInfusionRate = 0.0; // mg/min
        let infusionIndex = 0;

        const bolusEvents = doseEvents.filter(e => e.bolusMg > 0);
        let bolusIndex = 0;

        for (const currentTime of times) {
            // Apply bolus doses
            while (bolusIndex < bolusEvents.length && Math.abs(bolusEvents[bolusIndex].timeInMinutes - currentTime) < timeStep / 2) {
                state.a1 += bolusEvents[bolusIndex].bolusMg;
                bolusIndex++;
            }

            // Update infusion rate
            while (infusionIndex < infusionSchedule.length && currentTime >= infusionSchedule[infusionIndex].time) {
                currentInfusionRate = infusionSchedule[infusionIndex].rate;
                infusionIndex++;
            }

            const plasmaConc = Math.max(0.0, state.a1 / pkParams.v1);
            plasmaConcentrations.push(plasmaConc);

            state = this.updateSystemState(state, pkParams, currentInfusionRate, timeStep);
        }

        return plasmaConcentrations;
    }

    createInfusionSchedule(doseEvents, patient) {
        const schedule = [];
        doseEvents.forEach(event => {
            schedule.push({ time: event.timeInMinutes, rate: event.continuousRateMgMin(patient) });
        });
        schedule.sort((a, b) => a.time - b.time);

        // Ensure there's a starting rate
        if (schedule.length === 0 || schedule[0].time > 0) {
            schedule.unshift({ time: 0, rate: 0 });
        }
        return schedule;
    }

    updateSystemState(state, pk, infusionRate, dt) {
        const { k10, k12, k21, k13, k31 } = pk;
        
        const derivatives = (s) => {
            const da1_dt = infusionRate - (k10 + k12 + k13) * s.a1 + k21 * s.a2 + k31 * s.a3;
            const da2_dt = k12 * s.a1 - k21 * s.a2;
            const da3_dt = k13 * s.a1 - k31 * s.a3;
            return { da1: da1_dt, da2: da2_dt, da3: da3_dt };
        };

        // 4th order Runge-Kutta integration
        const k1 = derivatives(state);
        const k2_state = new SystemState(state.a1 + dt * k1.da1 / 2, state.a2 + dt * k1.da2 / 2, state.a3 + dt * k1.da3 / 2);
        const k2 = derivatives(k2_state);
        const k3_state = new SystemState(state.a1 + dt * k2.da1 / 2, state.a2 + dt * k2.da2 / 2, state.a3 + dt * k2.da3 / 2);
        const k3 = derivatives(k3_state);
        const k4_state = new SystemState(state.a1 + dt * k3.da1, state.a2 + dt * k3.da2, state.a3 + dt * k3.da3);
        const k4 = derivatives(k4_state);

        const newState = new SystemState();
        newState.a1 = state.a1 + dt * (k1.da1 + 2 * k2.da1 + 2 * k3.da1 + k4.da1) / 6;
        newState.a2 = state.a2 + dt * (k1.da2 + 2 * k2.da2 + 2 * k3.da2 + k4.da2) / 6;
        newState.a3 = state.a3 + dt * (k1.da3 + 2 * k2.da3 + 2 * k3.da3 + k4.da3) / 6;

        // Ensure non-negative values
        newState.a1 = Math.max(0.0, newState.a1);
        newState.a2 = Math.max(0.0, newState.a2);
        newState.a3 = Math.max(0.0, newState.a3);

        return newState;
    }

    calculateEffectSiteConcentrations(plasmaConcentrations, timePoints, ke0) {
        const ceValues = new Array(timePoints.length).fill(0);
        ceValues[0] = 0.0;
        
        for (let i = 1; i < timePoints.length; i++) {
            const dt = timePoints[i] - timePoints[i-1];
            const cpPrev = plasmaConcentrations[i-1];
            const cePrev = ceValues[i-1];
            
            const dce_dt = ke0 * (cpPrev - cePrev);
            ceValues[i] = cePrev + dt * dce_dt;
        }
        return ceValues;
    }

    calculateTofRatios(effectSiteConcentrations, pd) {
        const { ce50, gamma, e0, emax } = pd;

        if (ce50 <= 0 || gamma <= 0) {
            console.error("Invalid PD parameters for TOF calculation:", pd);
            return effectSiteConcentrations.map(() => 100);
        }

        const ce50_gamma = Math.pow(ce50, gamma);

        return effectSiteConcentrations.map(ce => {
            if (ce < 0) ce = 0; 
            
            const ce_gamma = Math.pow(ce, gamma);
            const denominator = ce50_gamma + ce_gamma;
            
            if (denominator === 0) {
                return emax; 
            }

            const effect = e0 + (emax - e0) * (ce_gamma / denominator);
            
            if (isNaN(effect)) {
                console.warn("NaN detected in TOF calculation. Returning safe value. Info:", {ce, pd});
                return e0; // Return baseline (100%)
            }

            return Math.max(0, Math.min(100, effect));
        });
    }
}
