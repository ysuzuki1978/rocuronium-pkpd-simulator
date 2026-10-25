// Data Models and Constants for Rocuronium PK/PD Simulator

// Enums
const SexType = {
    MALE: 0,
    FEMALE: 1,
    
    displayName(value) {
        return value === this.MALE ? "Male" : "Female";
    }
};

const ModelType = {
    WIERDA: 'Wierda',
    SZENOHRADSZKY: 'Szenohradszky',
    COOPER: 'Cooper',
    ALVAREZ_GOMEZ: 'AlvarezGomez',
    MCCOY: 'McCoy',

    displayName(value) {
        const names = {
            'Wierda': 'Wierda',
            'Szenohradszky': 'Szenohradszky',
            'Cooper': 'Cooper',
            'AlvarezGomez': 'Alvarez-Gomez',
            'McCoy': 'McCoy'
        };
        return names[value] || value;
    }
};


// Validation Limits
const ValidationLimits = {
    Patient: {
        minimumAge: 18,
        maximumAge: 100,
        minimumWeight: 30.0,
        maximumWeight: 200.0,
        minimumHeight: 120.0,
        maximumHeight: 220.0,
        minimumBMI: 12.0,
        maximumBMI: 50.0
    },
    
    Dosing: {
        minimumTime: 0,
        maximumTime: 2880, // Allow 48h simulation
        minimumBolus: 0.0,
        maximumBolus: 200.0, // Increased for rocuronium
        minimumContinuous: 0.0,
        maximumContinuous: 30.0 // μg/kg/min
    }
};

// Patient Class
class Patient {
    constructor(id, age, weight, height, sex, model, anesthesiaStartTime = null) {
        this.id = id;
        this.age = age;
        this.weight = weight;
        this.height = height;
        this.sex = sex;
        this.model = model || ModelType.WIERDA;
        this.anesthesiaStartTime = anesthesiaStartTime || new Date();
    }
    
    get bmi() {
        return this.weight / Math.pow(this.height / 100, 2);
    }
    
    minutesToClockTime(minutesFromStart) {
        return new Date(this.anesthesiaStartTime.getTime() + minutesFromStart * 60000);
    }
    
    validate() {
        const errors = [];
        
        if (!this.id || this.id.trim().length === 0) {
            errors.push("Patient ID is required");
        }
        
        if (this.age < ValidationLimits.Patient.minimumAge || this.age > ValidationLimits.Patient.maximumAge) {
            errors.push(`Age must be between ${ValidationLimits.Patient.minimumAge} and ${ValidationLimits.Patient.maximumAge} years`);
        }
        
        if (this.weight < ValidationLimits.Patient.minimumWeight || this.weight > ValidationLimits.Patient.maximumWeight) {
            errors.push(`Weight must be between ${ValidationLimits.Patient.minimumWeight} and ${ValidationLimits.Patient.maximumWeight} kg`);
        }
        
        if (this.height < ValidationLimits.Patient.minimumHeight || this.height > ValidationLimits.Patient.maximumHeight) {
            errors.push(`Height must be between ${ValidationLimits.Patient.minimumHeight} and ${ValidationLimits.Patient.maximumHeight} cm`);
        }
        
        if (this.bmi < ValidationLimits.Patient.minimumBMI || this.bmi > ValidationLimits.Patient.maximumBMI) {
            errors.push(`BMI is at an extreme value (calculated: ${this.bmi.toFixed(1)})`);
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}

// Dose Event Class
class DoseEvent {
    constructor(timeInMinutes, bolusMg, continuousMcgKgMin) {
        this.timeInMinutes = timeInMinutes;
        this.bolusMg = bolusMg;
        this.continuousMcgKgMin = continuousMcgKgMin;
    }
    
    continuousRateMgMin(patient) {
        return (this.continuousMcgKgMin * patient.weight) / 1000.0;
    }
    
    validate() {
        const errors = [];
        
        if (this.bolusMg < ValidationLimits.Dosing.minimumBolus || this.bolusMg > ValidationLimits.Dosing.maximumBolus) {
            errors.push(`Bolus dose must be between ${ValidationLimits.Dosing.minimumBolus} and ${ValidationLimits.Dosing.maximumBolus} mg`);
        }
        
        if (this.continuousMcgKgMin < ValidationLimits.Dosing.minimumContinuous || this.continuousMcgKgMin > ValidationLimits.Dosing.maximumContinuous) {
            errors.push(`Continuous infusion rate must be between ${ValidationLimits.Dosing.minimumContinuous} and ${ValidationLimits.Dosing.maximumContinuous} μg/kg/min`);
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}

// PK/PD Parameters Class
class RocuroniumPKPDParameters {
    constructor(pk, pd) {
        this.pk = pk; // { v1, k10, k12, k21, k13, k31 }
        this.pd = pd; // { ke0, ce50, gamma, e0, emax }
    }
}

// Unified System State Class (4-dimensional: a1, a2, a3, Ce)
class UnifiedSystemState {
    constructor(a1 = 0.0, a2 = 0.0, a3 = 0.0, ce = 0.0) {
        this.a1 = a1;  // Central compartment amount (mg)
        this.a2 = a2;  // Peripheral compartment 1 amount (mg)
        this.a3 = a3;  // Peripheral compartment 2 amount (mg)
        this.ce = ce;  // Effect-site concentration (μg/mL)
    }
}

// Time Point Class
class TimePoint {
    constructor(timeInMinutes, plasmaConcentration, effectSiteConcentration, tofRatio) {
        this.timeInMinutes = timeInMinutes;
        this.plasmaConcentration = plasmaConcentration;
        this.effectSiteConcentration = effectSiteConcentration;
        this.tofRatio = tofRatio;
    }
}

// Simulation Result Class
class SimulationResult {
    constructor(timePoints, patient, doseEvents, calculationMethod, calculatedAt, sampleIntervalMin = 1) {
        this.timePoints = timePoints;
        this.sampleIntervalMin = sampleIntervalMin; // spacing of timePoints, minutes
        this.patient = patient;
        this.doseEvents = doseEvents;
        this.calculationMethod = calculationMethod;
        this.calculatedAt = calculatedAt || new Date();
    }
    
    get maxPlasmaConcentration() {
        return Math.max(...this.timePoints.map(tp => tp.plasmaConcentration));
    }
    
    get maxEffectSiteConcentration() {
        return Math.max(...this.timePoints.map(tp => tp.effectSiteConcentration));
    }

    
    
    get simulationDurationMinutes() {
        return this.timePoints.length > 0 ? this.timePoints[this.timePoints.length - 1].timeInMinutes : 0;
    }

    /** The sample nearest to `minute` (clamped to the run), found by time, not by array position. */
    pointAt(minute) {
        const points = this.timePoints;
        if (points.length === 0) return undefined;
        let lo = 0;
        let hi = points.length - 1;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (points[mid].timeInMinutes < minute) lo = mid + 1; else hi = mid;
        }
        const before = points[Math.max(lo - 1, 0)];
        const after = points[lo];
        return Math.abs(minute - before.timeInMinutes) <= Math.abs(after.timeInMinutes - minute) ? before : after;
    }
}
