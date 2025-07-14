# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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