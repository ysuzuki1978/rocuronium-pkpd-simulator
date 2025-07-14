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
    
    clockTimeToMinutes(clockTime) {
        let minutesDiff = (clockTime.getTime() - this.anesthesiaStartTime.getTime()) / 60000;
        return minutesDiff;
    }
    
    get formattedStartTime() {
        return this.anesthesiaStartTime.toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
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
    
    formattedClockTime(patient) {
        const clockTime = patient.minutesToClockTime(this.timeInMinutes);
        return clockTime.toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
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

// System State Class
class SystemState {
    constructor(a1 = 0.0, a2 = 0.0, a3 = 0.0) {
        this.a1 = a1;
        this.a2 = a2;
        this.a3 = a3;
    }
}

// Time Point Class
class TimePoint {
    constructor(timeInMinutes, doseEvent, plasmaConcentration, effectSiteConcentration, tofRatio) {
        this.timeInMinutes = timeInMinutes;
        this.doseEvent = doseEvent;
        this.plasmaConcentration = plasmaConcentration;
        this.effectSiteConcentration = effectSiteConcentration;
        this.tofRatio = tofRatio;
    }
    
    get plasmaConcentrationString() {
        return this.plasmaConcentration.toFixed(3);
    }
    
    get effectSiteConcentrationString() {
        return this.effectSiteConcentration.toFixed(3);
    }

    get tofRatioString() {
        return this.tofRatio.toFixed(1);
    }
    
    formattedClockTime(patient) {
        const clockTime = patient.minutesToClockTime(this.timeInMinutes);
        return clockTime.toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }
}

// Simulation Result Class
class SimulationResult {
    constructor(timePoints, patient, doseEvents, calculationMethod, calculatedAt) {
        this.timePoints = timePoints;
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
    
    toCSV() {
        const header = "ClockTime,Time(min),Cp(ug/mL),Ce(ug/mL),TOF_Ratio(%)";
        const csvLines = [header];
        
        for (const tp of this.timePoints) {
            const clockTime = tp.formattedClockTime(this.patient);
            const line = `${clockTime},${tp.timeInMinutes},${tp.plasmaConcentration.toFixed(4)},${tp.effectSiteConcentration.toFixed(4)},${tp.tofRatio.toFixed(2)}`;
            csvLines.push(line);
        }
        
        return csvLines.join("\n");
    }
}
