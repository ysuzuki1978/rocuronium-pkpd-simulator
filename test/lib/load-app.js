// Loads the browser scripts (classic scripts, no modules) into one VM context.
// `mutations` rewrite a source file before it runs: they are how the negative
// controls reintroduce an old defect. A mutation whose text is not found throws,
// so a control cannot pass because the code it meant to break has moved.
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const JS = path.join(__dirname, '..', '..', 'js');
const FILES = ['clock.js', 'models.js', 'format.js', 'calculator.js'];
const EXPORTS = ['PKCalculationEngine', 'Patient', 'DoseEvent', 'SexType', 'ModelType',
    'RocuroniumPKPDModelData', 'formatClock', 'parseClock', 'withClock', 'minutesIntoCase',
    'formatConcentration', 'formatTofRatio', 'formatCaseClock', 'resultToCsv'];

function loadApp(mutations = {}) {
    const sources = FILES.map(file => {
        let text = readFileSync(path.join(JS, file), 'utf8');
        for (const [from, to] of mutations[file] || []) {
            if (!text.includes(from)) throw new Error(`mutation target not found in ${file}: ${from}`);
            text = text.replace(from, to);
        }
        return text;
    });
    const code = `${sources.join('\n')}\n;({ ${EXPORTS.join(', ')} })`;
    return vm.runInNewContext(code, { console: { log() {}, warn() {}, error() {} } });
}

module.exports = { loadApp };
