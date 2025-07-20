# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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