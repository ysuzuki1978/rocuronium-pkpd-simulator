# Rocuronium PK/PD Simulator

A web-based pharmacokinetic and pharmacodynamic simulator for rocuronium neuromuscular blocking agent, implementing five validated pharmacokinetic models with age and sex covariates for effect-site concentration prediction.

## Quick Access

**🚀 Live Application**: https://ysuzuki1978.github.io/rocuronium-pkpd-simulator/

## Overview

This application provides real-time simulation of rocuronium plasma and effect-site concentrations using established pharmacokinetic models. The simulator incorporates patient-specific covariates (age, sex, body weight) to predict neuromuscular blockade progression and recovery, supporting clinical education and research applications.

## Features

- **Five Pharmacokinetic Models**: Wierda, Szenohradszky, Cooper, Alvarez-Gomez, and McCoy models
- **Covariate Integration**: Age and sex effects on pharmacodynamic parameters
- **Real-time Visualization**: Interactive graphs showing plasma concentration, effect-site concentration, and TOF ratio
- **Progressive Web App**: Offline functionality with responsive design
- **Clinical Validation**: Computational logic validated against published reference standards

## Directory Structure

```
rocuro_V1_0_0/
├── README.md                 # Project documentation
├── index.html               # Main application interface
├── manifest.json            # PWA configuration
├── sw.js                    # Service worker for offline functionality
├── css/
│   └── style.css           # Application styling
├── js/
│   ├── main.js             # User interface controller
│   ├── calculator.js       # Pharmacokinetic calculations
│   └── models.js           # Pharmacokinetic/pharmacodynamic model parameters
├── confirm_claude.md        # Computational validation report
├── confirm_claude.html      # Validation report (HTML format)
├── confirm_gemini.md        # Additional validation documentation
└── confirm_gemini.html      # Additional validation (HTML format)
```

## Implementation Details

### Pharmacokinetic Models

The application implements compartmental models with the following parameters:

- **Three-compartment models**: Wierda, Szenohradszky, Cooper, Alvarez-Gomez
- **Two-compartment model**: McCoy
- **Numerical integration**: Fourth-order Runge-Kutta method for plasma concentrations
- **Effect-site modeling**: First-order kinetics with Euler integration

### Pharmacodynamic Model

Sigmoid E_max model implementation:
```
Effect = E₀ + (E_max - E₀) × [Ce^γ / (Ce₅₀^γ + Ce^γ)]
```

Where:
- Ce₅₀ = θ₂ + (age - 50) × θ₅
- γ = θ₃ + (age - 50) × θ₆ + sex × θ₇ (model-dependent)
- ke₀ = θ₄ + (age - 50) × θ₈ (model-dependent)

### Validation

Computational accuracy verified against:
- Masui, K., Ishigaki, S., Tomita, A. et al. Rocuronium pharmacodynamic models for published five pharmacokinetic models: age and sex are covariates in pharmacodynamic models. *J Anesth* 32, 709–716 (2018). DOI: 10.1007/s00540-018-2543-3

## Usage

### Prerequisites

- Modern web browser with JavaScript enabled
- No installation required - runs directly in browser

### Running the Application

1. Open `index.html` in a web browser
2. Accept the disclaimer to proceed
3. Configure patient parameters (age, sex, body weight)
4. Set dosing regimen (bolus dose, infusion rate, duration)
5. Select pharmacokinetic model
6. View simulation results in real-time graphs

### Patient Parameter Ranges

Validated for patients within:
- Age: 21-76 years
- Body weight: 44-93 kg
- BMI: 17.3-29.8 kg/m²

## Clinical Applications

### Educational Use
- Pharmacokinetic/pharmacodynamic teaching
- Anesthesia training simulations
- Drug dosing optimization concepts

### Research Applications
- Protocol development support
- Theoretical dose-response modeling
- Comparative pharmacokinetic analysis

## Disclaimer

This application is an educational and research tool providing theoretical simulations based on pharmacokinetic models. Results do not guarantee actual clinical responses and should not be used for clinical decision-making. All clinical decisions must be made by qualified medical professionals.

## Technical Specifications

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Charting**: Chart.js library
- **PWA Features**: Service worker, manifest.json
- **Responsive Design**: Mobile and desktop compatible
- **Browser Support**: Modern browsers (Chrome, Firefox, Safari, Edge)

## License

MIT License

Copyright (c) 2025 Yasuyuki Suzuki

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Author

**Yasuyuki Suzuki, MD, PhD**

Affiliations:
1. Department of Anaesthesiology, Saiseikai Matsuyama Hospital, Matsuyama City, Ehime, Japan
2. Department of Pharmacology, Ehime University Graduate School of Medicine, Toon City, Ehime, Japan  
3. Research Division, Saiseikai Research Institute of Health Care and Welfare, Tokyo, Japan

## Citation

If you use this software in your research, please cite the associated publication (manuscript in preparation) and reference this repository:

```
Suzuki, Y. (2025). Rocuronium PK/PD Simulator [Computer software]. 
GitHub. https://github.com/ysuzuki1978/rocuronium-pkpd-simulator
```

## Contributing

This software is provided for educational and research purposes. For questions or collaboration inquiries, please contact the author through institutional channels.

---

## Release Notes

### Version 1.0.0 (Public Release - July 13, 2025)
- **INITIAL PUBLIC RELEASE**: First stable public version
- Five validated pharmacokinetic models with age and sex covariates
- Real-time simulation with interactive visualization
- Progressive Web App functionality with offline support
- Computational validation against published reference standards
- Responsive design for mobile and desktop devices
- Educational and research applications ready

---

*Version 1.0.0 - Released July 13, 2025*