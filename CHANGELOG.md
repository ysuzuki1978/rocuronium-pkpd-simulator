# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2026-10-25

### Fixed
- Rate changes were applied one integration step (0.01 min) late at some event minutes (10, 60, 240 ...): the time grid was built with `t += 0.01`, which drifts (59.99999999999 at minute 60), so the strict `>=` test missed the event. The grid is now index based (`i * 0.01`) with a 1e-9 min tolerance. Max relative error of Cp and Ce against the matrix-exponential solution: 5.7e-4 (Wierda, one dose set) and 1.7e-3 (worst of 5 models x 3 dose sets) before, 2.3e-12 and 5.6e-12 after
- A start time with seconds and a dose time in the same minute was read as the next day (minute 1440); the start is now compared to the minute

### Changed
- Wall-clock handling is in `js/clock.js` (`formatClock`, `parseClock`, `withClock`, `minutesIntoCase`), pure functions with no DOM or `appState`; invalid times show an alert instead of producing NaN. `00:00` is printed at midnight (`toLocaleTimeString('ja-JP')` can print `24:00`)
- Display formatting (concentrations, TOF, clock labels, CSV) moved from the model classes to `js/format.js`; `models.js` holds data and validation only
- `SimulationResult` records `sampleIntervalMin` and has `pointAt(minute)`, which finds a sample by time; the chart cursor and the axis labels no longer assume index = minute
- `package.json` and `test/` added (`npm test`, 38 tests, including negative controls for the old time grid, a one-step delay and a 60x rate error)

### Removed
- Unused `updateSystemState`, `calculateEffectSiteConcentrations` (Euler), `SystemState`, `TimePoint.doseEvent` (per-sample `find`), and `Patient.clockTimeToMinutes`; 65 lines in the dead-code commit. Output of the unchanged paths is bit-identical (14460 values)

## [1.2.0] - 2026-10-23

### Added
- Bottom tab bar with a fixed strip of the plasma, effect-site and TOF values above every tab; the Results tab is ordered chart, peak values, table
- Pinch zoom, drag pan, double-tap reset, `+` / `−` / `Fit` buttons and Ctrl+wheel on the results chart (`js/chart-zoom.js`); the y axis follows the visible window; legend chips show the values at the cursor on touch screens (no tooltip)
- `Now` button beside the dose time, with a line saying which minute of the case the entered time is (a time before the anesthesia start is counted as the next day, and the form says so)
- `Now` button beside the anesthesia start time
- A note on the strip when the patient or the doses changed after the last run

### Changed
- The results chart uses a linear time axis (minutes) with clock-time tick labels
- Chart.js 4.4.1 is bundled (`js/vendor/chart.umd.min.js`) instead of loaded from a CDN, so the chart also draws offline
- `viewport-fit=cover` added so that the safe-area insets take effect

### Notes
- No change to `js/models.js` or `js/calculator.js`. Output for five models and three dose events was identical before and after (point count, peak Cp, peak Ce and the CSV hash).

## [1.1.0] - 2025-07-20

### Added
- **🚀 Unified 4-Dimensional RK4 Integration**: Enhanced numerical precision with simultaneous calculation of plasma and effect-site concentrations
  - Implemented UnifiedSystemState class for 4-dimensional system state (a1, a2, a3, Ce)
  - Added updateUnifiedSystemState method with 4th-order Runge-Kutta integration
  - Created calculateUnifiedConcentrations method for simultaneous concentration calculations
  - Professional-grade numerical methods aligned with propofol/remimazolam TCI applications

### Changed
- **Enhanced Effect-Site Calculation**: Upgraded from Euler method to RK4 integration
  - Effect-site concentration now calculated using proper differential equation: dCe/dt = ke0 * (Cp - Ce)
  - Improved numerical stability and accuracy for pharmacokinetic modeling
  - Consistent numerical approach across all concentration calculations
  - Maintained backward compatibility with legacy calculation methods

### Technical Improvements
- **Higher Accuracy**: 4th-order accuracy vs 1st-order (Euler method) provides significantly better precision
- **Numerical Stability**: More stable integration for pharmacokinetic differential equations
- **Consistent Time Steps**: Unified 0.01-minute time steps for reliable calculations
- **Non-negative Constraints**: Robust handling of concentration bounds to ensure physically meaningful results

### Compatibility
- Maintained full backward compatibility with existing API
- Legacy Euler method available for compatibility (with deprecation warning)
- Consistent model parameters and validation ranges
- No breaking changes to user interface or data structures

### Performance
- Optimized 4-dimensional system calculation
- Improved computational efficiency through unified integration approach
- Enhanced memory management for large simulation datasets
- Professional-grade numerical precision for clinical applications

## [1.0.0] - 2025-07-13

### Added
- **INITIAL PUBLIC RELEASE**: First stable public version
- Five validated pharmacokinetic models (Wierda, Szenohradszky, Cooper, Alvarez-Gomez, McCoy)
- Real-time pharmacokinetic/pharmacodynamic simulation
- Age and sex covariates integration in pharmacodynamic models
- Interactive visualization with Chart.js
- Progressive Web App (PWA) functionality with offline support
- Responsive design for mobile and desktop devices
- Service worker for offline functionality
- Comprehensive computational validation against published reference standards
- Educational disclaimer and safety warnings
- Professional medical documentation and citation format

### Features
- Three-compartment models: Wierda, Szenohradszky, Cooper, Alvarez-Gomez
- Two-compartment model: McCoy
- Fourth-order Runge-Kutta numerical integration for plasma concentrations
- First-order kinetics with Euler integration for effect-site modeling
- Sigmoid E_max pharmacodynamic model with covariate effects
- Real-time graphical display of plasma concentration, effect-site concentration, and TOF ratio
- Parameter validation for clinical ranges (age: 21-76 years, weight: 44-93 kg)

### Documentation
- Comprehensive README.md with technical specifications
- MIT License
- Validation reports (confirm_claude.md, confirm_gemini.md)
- Professional author attribution with institutional affiliations

---

## Unreleased

### Planned Features
- Additional pharmacokinetic models
- Extended patient population support
- Enhanced visualization options
- Data export functionality

---

**Note**: This changelog follows semantic versioning. For detailed technical validation, see confirm_claude.md and confirm_gemini.md.