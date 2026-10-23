// Main Application Logic - Rocuronium PK/PD Simulator

// Global state
let appState = {
    currentTab: 'patient',
    patient: null,
    doseEvents: [],
    simulationResult: null,
    isCalculating: false,
    chart: null,
    cursorMin: 0
};

// Series the reader has switched off. Kept apart from the chart because the
// chart is rebuilt on every run.
const hiddenSeries = new Set();

// A finger gets no tooltip: it stays after the touch ends and covers the curves.
// A tap moves the time cursor instead and the legend chips read the values there.
const COARSE_POINTER = window.matchMedia('(pointer: coarse)').matches;

let zoom = null;

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
    document.getElementById('doseNowBtn').addEventListener('click', setDoseTimeNow);
    document.getElementById('startNowBtn').addEventListener('click', setStartTimeNow);
    document.getElementById('doseTime').addEventListener('input', updateDoseTimeNote);
    document.getElementById('doseForm').addEventListener('submit', addDoseEvent);
    
    // Sliders
    setupPatientFormSliders();
    setupDoseFormSliders();
    
    // Export
    document.getElementById('exportCsvBtn').addEventListener('click', exportToCsv);

    // Pinned strip: the summary is a shortcut to the fields it summarises
    document.getElementById('patientSummary').addEventListener('click', () => {
        switchTab('patient');
        showPatientEditor();
    });
    document.getElementById('cursorRange').addEventListener('input', (e) => {
        setCursor(Number(e.target.value));
    });

    // Chart: pinch / drag / wheel / double-tap, and buttons for the same
    zoom = createChartZoom({
        host: document.getElementById('chartWrap'),
        getChart: () => appState.chart,
        getDuration: () => (appState.simulationResult ? appState.simulationResult.simulationDurationMinutes : 0),
        onChange: applyView,
        onCursor: (t) => setCursor(Math.round(t))
    });
    document.getElementById('zoomIn').addEventListener('click', () => zoom.step(0.5));
    document.getElementById('zoomOut').addEventListener('click', () => zoom.step(2));
    document.getElementById('zoomReset').addEventListener('click', () => zoom.reset());
    document.getElementById('chartLegend').addEventListener('click', (e) => {
        const chip = e.target.closest('.legend-chip');
        if (!chip) return;
        const series = chip.dataset.series;
        if (hiddenSeries.has(series)) hiddenSeries.delete(series); else hiddenSeries.add(series);
        updateChart();
    });
    window.addEventListener('resize', () => moveCursor());

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
    updateDoseTimeNote();
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

    // The chart was drawn into a canvas that was display:none while its tab was
    // hidden, so it has no size to lay out against until the tab is shown.
    if (tabName === 'results' && appState.chart) {
        appState.chart.resize();
        moveCursor();
    }
    window.scrollTo(0, 0);
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
    markStale();
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
    document.getElementById('patientSummaryText').textContent =
        `${p.age} y · ${p.weight.toFixed(0)} kg · ${p.height.toFixed(0)} cm · ${p.sex === SexType.MALE ? 'M' : 'F'} · ${ModelType.displayName(p.model)}`;
}

// Results describe the patient and doses they were run with. Once either
// changes, the numbers in the pinned strip no longer belong to what is shown.
function markStale() {
    if (appState.simulationResult) document.getElementById('staleNote').hidden = false;
    document.getElementById('readouts').classList.add('stale');
}

// --- Dose Events ---

/**
 * How far into the case a clock time ("HH:MM") is. A time before the anaesthesia
 * start is read as the following day, which is the only reading that describes
 * a case; `wrapped` says that happened, so the form can show it.
 */
function minutesIntoCase(timeValue) {
    const at = new Date(appState.patient.anesthesiaStartTime);
    const [hours, minutes] = timeValue.split(':').map(Number);
    at.setHours(hours, minutes, 0, 0);
    let diff = appState.patient.clockTimeToMinutes(at);
    const wrapped = diff < 0;
    if (wrapped) diff += 1440;
    return { minutes: Math.max(0, Math.round(diff)), wrapped };
}

const clockNow = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

/** Puts the current wall-clock time in the dose time field. */
function setDoseTimeNow() {
    document.getElementById('doseTime').value = clockNow();
    updateDoseTimeNote();
}

/** The anesthesia start field in the patient editor, set to the wall clock. */
function setStartTimeNow() {
    document.getElementById('editAnesthesiaStart').value = clockNow();
}

/** Says where the entered time falls in the case, before it is added. */
function updateDoseTimeNote() {
    const note = document.getElementById('doseTimeNote');
    const value = document.getElementById('doseTime').value;
    if (!value) { note.textContent = ''; return; }
    const { minutes, wrapped } = minutesIntoCase(value);
    note.textContent = wrapped
        ? `Before the anesthesia start (${appState.patient.formattedStartTime}), so this is counted as the next day: minute ${minutes}. Change the start time in the patient settings if the case has already begun.`
        : `Minute ${minutes} of the case.`;
}

function addDoseEvent(e) {
    e.preventDefault();
    
    const timeValue = document.getElementById('doseTime').value;
    const bolusAmount = parseFloat(document.getElementById('bolusAmount').value);
    const continuousRate = parseFloat(document.getElementById('continuousRate').value);
    
    const { minutes: minutesFromStart } = minutesIntoCase(timeValue);
    
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
    markStale();
    hideDoseEventEditor();
}

function removeDoseEvent(index) {
    appState.doseEvents.splice(index, 1);
    updateDoseEventsDisplay();
    updateSimulationButtonState();
    markStale();
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
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = () => removeDoseEvent(index);
    
    div.append(infoDiv, deleteBtn);
    return div;
}

function updateSimulationButtonState() {
    const button = document.getElementById('runSimulationBtn');
    button.disabled = appState.doseEvents.length === 0 || appState.isCalculating;
    button.innerHTML = appState.isCalculating ? '<span class="loading"><span class="spinner"></span>Calculating...</span>' : 'Run Simulation';
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

    document.getElementById('staleNote').hidden = true;
    document.getElementById('readouts').classList.remove('stale');

    // Open on the minute of the effect-site peak: the first thing worth reading.
    const ce = result.timePoints.map(tp => tp.effectSiteConcentration);
    appState.cursorMin = result.timePoints[ce.indexOf(Math.max(...ce))].timeInMinutes;
    const range = document.getElementById('cursorRange');
    range.max = String(result.simulationDurationMinutes);
    range.disabled = false;
    zoom.reset();

    updateChart();
    updateTable();
    drawCursorReadouts();
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

/** The point at minute `t`; the run is sampled once a minute. */
function pointAt(t) {
    const points = appState.simulationResult.timePoints;
    return points[Math.min(Math.max(Math.round(t), 0), points.length - 1)];
}

function setCursor(t) {
    if (!appState.simulationResult) return;
    appState.cursorMin = Math.min(Math.max(Math.round(t), 0), appState.simulationResult.simulationDurationMinutes);
    drawCursorReadouts();
    moveCursor();
}

/** The pinned strip, the slider and the legend chips, all read at the cursor. */
function drawCursorReadouts() {
    const result = appState.simulationResult;
    if (!result) return;
    const tp = pointAt(appState.cursorMin);
    document.getElementById('readCp').textContent = tp.plasmaConcentrationString;
    document.getElementById('readCe').textContent = tp.effectSiteConcentrationString;
    document.getElementById('readTof').textContent = tp.tofRatioString;
    document.getElementById('cursorRange').value = String(tp.timeInMinutes);
    document.getElementById('cursorValue').textContent =
        `${tp.formattedClockTime(appState.patient)} · ${tp.timeInMinutes} min`;
    const values = { plasma: tp.plasmaConcentrationString, effect: tp.effectSiteConcentrationString, tof: tp.tofRatioString };
    document.querySelectorAll('[data-value-for]').forEach(node => {
        node.textContent = hiddenSeries.has(node.dataset.valueFor) ? '' : values[node.dataset.valueFor];
    });
}

/** The cursor line is an element over the canvas, placed from the chart's own scale. */
function moveCursor() {
    const line = document.getElementById('chartCursor');
    const chart = appState.chart;
    if (!chart || !chart.scales?.x || !chart.chartArea) { line.hidden = true; return; }
    const x = chart.scales.x;
    const area = chart.chartArea;
    if (appState.cursorMin < x.min || appState.cursorMin > x.max) { line.hidden = true; return; }
    line.hidden = false;
    line.style.left = `${x.getPixelForValue(appState.cursorMin)}px`;
    line.style.top = `${area.top}px`;
    line.style.height = `${area.bottom - area.top}px`;
}

/**
 * Top of the concentration axis for what is inside the window, so that zooming
 * into the washout does not leave the curves flat along the bottom of an axis
 * sized for the peak.
 */
function concentrationTop(datasets, win) {
    let peak = 0;
    for (const set of datasets) {
        if (set.yAxisID !== 'y-conc' || set.hidden) continue;
        for (const point of set.data) {
            if (point.x >= win.min && point.x <= win.max && point.y > peak) peak = point.y;
        }
    }
    return peak > 0 ? peak * 1.08 : 1;
}

/** Moves the window on the chart that is already drawn. */
function applyView() {
    document.getElementById('zoomReset').disabled = !zoom.isZoomed();
    const chart = appState.chart;
    if (!chart) return;
    const win = zoom.window();
    chart.options.scales.x.min = win.min;
    chart.options.scales.x.max = win.max;
    chart.options.scales['y-conc'].max = concentrationTop(chart.data.datasets, win);
    chart.update('none');
    moveCursor();
}

function drawLegend(chips) {
    document.getElementById('chartLegend').innerHTML = chips.map(c => {
        const off = hiddenSeries.has(c.series);
        return `<button type="button" class="legend-chip${off ? ' off' : ''}" data-series="${c.series}"
                    aria-pressed="${!off}" title="${off ? 'Show' : 'Hide'} ${c.label}">
                <span class="legend-swatch" style="--swatch:${c.colour}"></span>
                <span class="legend-name">${c.label}</span>
                <span class="legend-value data-value" data-value-for="${c.series}"></span>
                <span class="legend-unit"><span class="legend-u">${c.unit} </span>${c.side}</span>
            </button>`;
    }).join('');
}

function updateChart() {
    if (appState.chart) appState.chart.destroy();

    const ctx = document.getElementById('concentrationChart').getContext('2d');
    const result = appState.simulationResult;
    const chartData = result.timePoints;
    const toPoints = (key) => chartData.map(tp => ({ x: tp.timeInMinutes, y: tp[key] }));
    const axisFont = { family: 'Figtree', size: 11 };

    const series = [
        { series: 'plasma', label: 'Plasma', unit: 'µg/mL', side: '←', colour: '#29B6F6', key: 'plasmaConcentration', axis: 'y-conc' },
        { series: 'effect', label: 'Effect site', unit: 'µg/mL', side: '←', colour: '#4CAF50', key: 'effectSiteConcentration', axis: 'y-conc' },
        { series: 'tof', label: 'TOF ratio', unit: '%', side: '→', colour: '#CE93D8', key: 'tofRatio', axis: 'y-tof' }
    ];
    const datasets = series.map(sr => ({
        label: `${sr.label} (${sr.unit})`,
        data: toPoints(sr.key),
        borderColor: sr.colour,
        backgroundColor: sr.series === 'tof' ? 'rgba(206, 147, 216, 0.08)' : undefined,
        fill: sr.series === 'tof',
        borderWidth: 2,
        yAxisID: sr.axis,
        tension: 0.2,
        pointRadius: 0,
        series: sr.series,
        hidden: hiddenSeries.has(sr.series)
    }));
    drawLegend(series);

    const win = zoom.window();
    // The window is minutes into the run; ticks are written as the clock time of that minute.
    const clockAt = (minute) => {
        const tp = chartData[Math.round(minute)];
        return tp ? tp.formattedClockTime(appState.patient) : '';
    };

    appState.chart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 },
            interaction: { mode: 'index', intersect: false },
            events: COARSE_POINTER ? [] : ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove'],
            plugins: {
                // Drawn in HTML above the canvas: it takes no height from the plot
                // and its chips carry the values at the cursor.
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#333',
                    titleColor: '#e0e0e0',
                    bodyColor: '#e0e0e0',
                    borderColor: '#4a4a4a',
                    borderWidth: 1,
                    titleFont: { family: 'Figtree' },
                    bodyFont: { family: 'SF Mono, Menlo, monospace', size: 12 },
                    callbacks: {
                        title: (items) => `${clockAt(items[0].parsed.x)} (${items[0].parsed.x} min)`
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    min: win.min,
                    max: win.max,
                    ticks: {
                        color: '#a0a0a0', font: axisFont, maxTicksLimit: 6,
                        includeBounds: false, maxRotation: 0,
                        callback: (value) => clockAt(value)
                    },
                    grid: { color: 'rgba(255,255,255,0.08)' }
                },
                'y-conc': {
                    type: 'linear',
                    position: 'left',
                    min: 0,
                    max: concentrationTop(datasets, win),
                    // Decimals follow the size of the axis, so a zoomed axis that spans
                    // 0.2 to 0.3 does not print 0.3 on two neighbouring ticks.
                    ticks: {
                        color: '#a0a0a0', font: axisFont, maxTicksLimit: 6,
                        callback: (value, index, ticks) => {
                            const top = ticks[ticks.length - 1]?.value ?? value;
                            return Number(value.toFixed(top < 1 ? 3 : top < 10 ? 2 : 1));
                        }
                    },
                    grid: { color: 'rgba(255,255,255,0.08)' }
                },
                'y-tof': {
                    type: 'linear',
                    position: 'right',
                    min: 0,
                    max: 100,
                    ticks: { color: '#a0a0a0', font: axisFont, maxTicksLimit: 6 },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
    document.getElementById('zoomReset').disabled = !zoom.isZoomed();
    drawCursorReadouts();
    moveCursor();
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