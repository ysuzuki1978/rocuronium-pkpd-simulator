// Main Application Logic - Rocuronium PK/PD Simulator

// Global state
let appState = {
    currentTab: 'patient',
    patient: null,
    doseEvents: [],
    simulationResult: null,
    isCalculating: false,
    chart: null
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    initializeDefaultPatient();
    setupEventListeners();
    updatePatientDisplay();
    updateDoseEventsDisplay();
    showDisclaimer();
}

function initializeDefaultPatient() {
    const now = new Date();
    now.setHours(8, 0, 0, 0);
    
    appState.patient = new Patient(
        `Patient-${new Date().toISOString().split('T')[0]}`,
        50,
        70.0,
        170.0,
        SexType.MALE,
        ModelType.WIERDA,
        now
    );
    
    // Default dose: 50mg bolus
    appState.doseEvents = [
        new DoseEvent(0, 50, 0)
    ];
}

function setupEventListeners() {
    // Disclaimer
    document.getElementById('acceptDisclaimer').addEventListener('click', hideDisclaimer);
    
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchTab(e.currentTarget.dataset.tab));
    });
    
    // Patient Tab
    document.getElementById('editPatientBtn').addEventListener('click', showPatientEditor);
    document.getElementById('toDoseScheduleBtn').addEventListener('click', () => switchTab('dose'));
    
    // Dose Tab
    document.getElementById('addDoseEventBtn').addEventListener('click', showDoseEventEditor);
    document.getElementById('runSimulationBtn').addEventListener('click', runSimulation);
    document.getElementById('toDoseTabBtn').addEventListener('click', () => switchTab('dose'));

    // Patient Editor
    document.getElementById('closePatientModal').addEventListener('click', hidePatientEditor);
    document.getElementById('cancelPatientEdit').addEventListener('click', hidePatientEditor);
    document.getElementById('patientForm').addEventListener('submit', savePatientData);
    
    // Dose Editor
    document.getElementById('closeDoseModal').addEventListener('click', hideDoseEventEditor);
    document.getElementById('cancelDoseAdd').addEventListener('click', hideDoseEventEditor);
    document.getElementById('doseForm').addEventListener('submit', addDoseEvent);
    
    // Sliders
    setupPatientFormSliders();
    setupDoseFormSliders();
    
    // Export
    document.getElementById('exportCsvBtn').addEventListener('click', exportToCsv);

    // Modal backdrop
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    });
}

function setupPatientFormSliders() {
    const ageSlider = document.getElementById('editAge');
    const weightSlider = document.getElementById('editWeight');
    const heightSlider = document.getElementById('editHeight');
    
    ageSlider.addEventListener('input', (e) => {
        document.getElementById('ageValue').textContent = e.target.value;
        updateBMICalculation();
    });
    
    weightSlider.addEventListener('input', (e) => {
        document.getElementById('weightValue').textContent = parseFloat(e.target.value).toFixed(1);
        updateBMICalculation();
    });
    
    heightSlider.addEventListener('input', (e) => {
        document.getElementById('heightValue').textContent = e.target.value;
        updateBMICalculation();
    });
}

function setupDoseFormSliders() {
    const bolusSlider = document.getElementById('bolusAmount');
    const continuousSlider = document.getElementById('continuousRate');
    
    bolusSlider.addEventListener('input', (e) => {
        document.getElementById('bolusValue').textContent = parseFloat(e.target.value).toFixed(1);
    });
    
    continuousSlider.addEventListener('input', (e) => {
        document.getElementById('continuousValue').textContent = parseFloat(e.target.value).toFixed(1);
    });
}

function updateBMICalculation() {
    const weight = parseFloat(document.getElementById('editWeight').value);
    const height = parseFloat(document.getElementById('editHeight').value);
    const bmi = weight / Math.pow(height / 100, 2);
    document.getElementById('bmiCalculated').textContent = bmi.toFixed(1);
}

// --- Modals ---
function showDisclaimer() {
    document.getElementById('disclaimerModal').classList.add('active');
}

function hideDisclaimer() {
    document.getElementById('disclaimerModal').classList.remove('active');
    document.getElementById('mainApp').classList.remove('hidden');
}

function showPatientEditor() {
    const modal = document.getElementById('patientModal');
    const p = appState.patient;
    
    document.getElementById('editPatientId').value = p.id;
    document.getElementById('editAge').value = p.age;
    document.getElementById('editWeight').value = p.weight;
    document.getElementById('editHeight').value = p.height;
    document.querySelector(`input[name="sex"][value="${p.sex === SexType.MALE ? 'male' : 'female'}"]`).checked = true;
    document.getElementById('editModel').value = p.model;
    document.getElementById('editAnesthesiaStart').value = p.anesthesiaStartTime.toTimeString().substring(0, 5);
    
    document.getElementById('ageValue').textContent = p.age;
    document.getElementById('weightValue').textContent = p.weight.toFixed(1);
    document.getElementById('heightValue').textContent = p.height;
    updateBMICalculation();
    
    modal.classList.add('active');
}

function hidePatientEditor() {
    document.getElementById('patientModal').classList.remove('active');
}

function showDoseEventEditor() {
    const modal = document.getElementById('doseModal');
    document.getElementById('doseForm').reset();
    document.getElementById('doseTime').value = appState.patient.formattedStartTime;
    document.getElementById('bolusValue').textContent = '0.0';
    document.getElementById('continuousValue').textContent = '0.0';
    document.getElementById('anesthesiaStartTime').textContent = appState.patient.formattedStartTime;
    modal.classList.add('active');
}

function hideDoseEventEditor() {
    document.getElementById('doseModal').classList.remove('active');
}

// --- Tabs ---
function switchTab(tabName) {
    appState.currentTab = tabName;
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    updateSimulationButtonState();
}

// --- Patient Data ---
function savePatientData(e) {
    e.preventDefault();
    
    const timeValue = document.getElementById('editAnesthesiaStart').value;
    const anesthesiaStart = new Date(appState.patient.anesthesiaStartTime);
    const [hours, minutes] = timeValue.split(':').map(Number);
    anesthesiaStart.setHours(hours, minutes, 0, 0);
    
    appState.patient = new Patient(
        document.getElementById('editPatientId').value,
        parseInt(document.getElementById('editAge').value),
        parseFloat(document.getElementById('editWeight').value),
        parseFloat(document.getElementById('editHeight').value),
        document.querySelector('input[name="sex"]:checked').value === 'male' ? SexType.MALE : SexType.FEMALE,
        document.getElementById('editModel').value,
        anesthesiaStart
    );
    
    const validation = appState.patient.validate();
    if (!validation.isValid) {
        alert('Input Error:\n' + validation.errors.join('\n'));
        return;
    }
    
    updatePatientDisplay();
    updateDoseEventsDisplay();
    hidePatientEditor();
}

function updatePatientDisplay() {
    const p = appState.patient;
    document.getElementById('patientId').textContent = p.id;
    document.getElementById('patientAge').textContent = `${p.age} years`;
    document.getElementById('patientWeight').textContent = `${p.weight.toFixed(1)} kg`;
    document.getElementById('patientHeight').textContent = `${p.height.toFixed(0)} cm`;
    document.getElementById('patientBMI').textContent = p.bmi.toFixed(1);
    document.getElementById('patientSex').textContent = SexType.displayName(p.sex);
    document.getElementById('patientModel').textContent = ModelType.displayName(p.model);
    document.getElementById('anesthesiaStart').textContent = p.formattedStartTime;
}

// --- Dose Events ---
function addDoseEvent(e) {
    e.preventDefault();
    
    const timeValue = document.getElementById('doseTime').value;
    const bolusAmount = parseFloat(document.getElementById('bolusAmount').value);
    const continuousRate = parseFloat(document.getElementById('continuousRate').value);
    
    const doseTime = new Date(appState.patient.anesthesiaStartTime);
    const [hours, minutes] = timeValue.split(':').map(Number);
    doseTime.setHours(hours, minutes, 0, 0);
    
    let minutesFromStart = appState.patient.clockTimeToMinutes(doseTime);
    if (minutesFromStart < 0) minutesFromStart += 1440;
    minutesFromStart = Math.max(0, Math.round(minutesFromStart));
    
    const doseEvent = new DoseEvent(minutesFromStart, bolusAmount, continuousRate);
    
    const validation = doseEvent.validate();
    if (!validation.isValid) {
        alert('Input Error:\n' + validation.errors.join('\n'));
        return;
    }
    
    appState.doseEvents.push(doseEvent);
    appState.doseEvents.sort((a, b) => a.timeInMinutes - b.timeInMinutes);
    
    updateDoseEventsDisplay();
    updateSimulationButtonState();
    hideDoseEventEditor();
}

function removeDoseEvent(index) {
    appState.doseEvents.splice(index, 1);
    updateDoseEventsDisplay();
    updateSimulationButtonState();
}

function updateDoseEventsDisplay() {
    const container = document.getElementById('doseEventsList');
    container.innerHTML = '';
    appState.doseEvents.forEach((event, index) => {
        container.appendChild(createDoseEventElement(event, index));
    });
}

function createDoseEventElement(event, index) {
    const div = document.createElement('div');
    div.className = 'dose-event';
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'dose-info';
    
    const title = document.createElement('h4');
    title.textContent = `${event.timeInMinutes} min (${event.formattedClockTime(appState.patient)})`;
    
    const details = document.createElement('div');
    details.className = 'dose-details';
    
    if (event.bolusMg > 0) details.innerHTML += `<span>Bolus: ${event.bolusMg.toFixed(1)}mg</span>`;
    if (event.continuousMcgKgMin > 0) details.innerHTML += `<span>Continuous: ${event.continuousMcgKgMin.toFixed(1)}μg/kg/min</span>`;
    if (event.bolusMg === 0 && event.continuousMcgKgMin === 0) details.innerHTML = '<span class="dose-stop">Dosing Stopped</span>';
    
    infoDiv.append(title, details);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-dose';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.onclick = () => removeDoseEvent(index);
    
    div.append(infoDiv, deleteBtn);
    return div;
}

function updateSimulationButtonState() {
    const button = document.getElementById('runSimulationBtn');
    button.disabled = appState.doseEvents.length === 0 || appState.isCalculating;
    button.innerHTML = appState.isCalculating ? '<span class="loading"><span class="spinner"></span>Calculating...</span>' : '▶️ Run Simulation';
}

// --- Simulation & Results ---
async function runSimulation() {
    if (appState.isCalculating || appState.doseEvents.length === 0) return;
    
    appState.isCalculating = true;
    updateSimulationButtonState();
    
    try {
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const engine = new PKCalculationEngine();
        const lastEventTime = Math.max(...appState.doseEvents.map(e => e.timeInMinutes));
        const simulationDuration = lastEventTime + 240.0;
        
        appState.simulationResult = engine.performSimulation(appState.patient, appState.doseEvents, simulationDuration);
        
        updateResultsDisplay();
        switchTab('results');
        
    } catch (error) {
        console.error('Simulation error:', error);
        alert('Simulation calculation error:\n' + error.message);
    } finally {
        appState.isCalculating = false;
        updateSimulationButtonState();
    }
}

function updateResultsDisplay() {
    const result = appState.simulationResult;
    if (!result) {
        document.getElementById('noResults').classList.remove('hidden');
        document.getElementById('resultsContent').classList.add('hidden');
        return;
    }
    
    document.getElementById('noResults').classList.add('hidden');
    document.getElementById('resultsContent').classList.remove('hidden');
    
    document.getElementById('calculationMethod').textContent = result.calculationMethod;
    document.getElementById('maxPlasma').textContent = result.maxPlasmaConcentration.toFixed(3);
    document.getElementById('maxEffect').textContent = result.maxEffectSiteConcentration.toFixed(3);
    

    updateChart();
    updateTable();
}

function updateTable() {
    const tbody = document.querySelector('#resultsTable tbody');
    tbody.innerHTML = '';
    appState.simulationResult.timePoints.forEach(tp => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${tp.formattedClockTime(appState.patient)}</td>
            <td>${tp.plasmaConcentrationString}</td>
            <td>${tp.effectSiteConcentrationString}</td>
            <td>${tp.tofRatioString}</td>
        `;
    });
}

function updateChart() {
    if (appState.chart) appState.chart.destroy();

    const ctx = document.getElementById('concentrationChart').getContext('2d');
    const result = appState.simulationResult;
    const chartData = result.timePoints;

    const labels = chartData.map(tp => tp.formattedClockTime(appState.patient));
    const plasmaData = chartData.map(tp => tp.plasmaConcentration);
    const effectData = chartData.map(tp => tp.effectSiteConcentration);
    const tofData = chartData.map(tp => tp.tofRatio);

    appState.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Plasma Concentration (µg/mL)',
                    data: plasmaData,
                    borderColor: 'rgba(0, 122, 255, 1)',
                    yAxisID: 'y-conc',
                    tension: 0.2, pointRadius: 0
                },
                {
                    label: 'Effect Site Concentration (µg/mL)',
                    data: effectData,
                    borderColor: 'rgba(255, 149, 0, 1)',
                    yAxisID: 'y-conc',
                    tension: 0.2, pointRadius: 0
                },
                {
                    label: 'TOF Ratio (%)',
                    data: tofData,
                    borderColor: 'rgba(52, 199, 89, 1)',
                    backgroundColor: 'rgba(52, 199, 89, 0.1)',
                    fill: true,
                    yAxisID: 'y-tof',
                    tension: 0.2, pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { title: { display: true, text: 'Time' } },
                'y-conc': {
                    type: 'linear',
                    position: 'left',
                    title: { display: true, text: 'Concentration (µg/mL)' },
                    beginAtZero: true
                },
                'y-tof': {
                    type: 'linear',
                    position: 'right',
                    title: { display: true, text: 'TOF Ratio (%)' },
                    min: 0,
                    max: 100,
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}

// --- Export ---
function exportToCsv() {
    if (!appState.simulationResult) {
        alert('No results available for export.');
        return;
    }
    
    const csvContent = appState.simulationResult.toCSV();
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const patientId = appState.patient.id.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `rocuronium_sim_${patientId}_${new Date().toISOString().slice(0,16).replace(':','-')}.csv`;
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}