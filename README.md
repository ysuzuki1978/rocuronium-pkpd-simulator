# Rocuronium PK/PD Simulator V1.1.0

## Overview

A Progressive Web Application for pharmacokinetic/pharmacodynamic simulation of rocuronium neuromuscular blocking agent. The app implements five validated PK models with age and sex covariates for effect-site concentration prediction and TOF ratio estimation — optimized for iPhone with an OR-monitor dark theme.

**Important Notice**: This application is designed exclusively for research and educational purposes. It is not intended for clinical decision-making, patient care, or therapeutic applications.

## Live Application

**https://ysuzuki1978.github.io/rocuronium-pkpd-simulator/**

## User Manual / 取扱説明書

- [User Manual (English)](docs/manual_en.html)
- [取扱説明書 (日本語)](docs/manual_ja.html)

## Features

- **Five PK Models**: Wierda, Szenohradszky, Cooper, Alvarez-Gomez, and McCoy models
- **Enhanced RK4 Integration**: Unified 4-dimensional Runge-Kutta system for superior numerical precision
- **Covariate Integration**: Age and sex effects on pharmacodynamic parameters
- **Real-time Visualization**: Interactive graphs showing plasma concentration, effect-site concentration, and TOF ratio
- **iPhone-optimized PWA**: Offline capability, dark OR-monitor theme, safe-area support

## System Requirements

Modern browsers (Chrome 80+, Firefox 75+, Safari 13+, Edge 80+). Works on desktop, tablet, and mobile devices.

## Pharmacokinetic/Pharmacodynamic Model

Masui, K., Ishigaki, S., Tomita, A. et al. Rocuronium pharmacodynamic models for published five pharmacokinetic models: age and sex are covariates in pharmacodynamic models. *J Anesth* 32, 709–716 (2018).

## Disclaimer

**Research Use Only**: This application is designed exclusively for research and educational purposes. It is not validated for clinical use, patient care decisions, or therapeutic applications. The developers explicitly disclaim all responsibility for any consequences arising from the use of this software in clinical settings.

## License

MIT License - Copyright (c) 2025 Yasuyuki Suzuki

## Author

**Yasuyuki Suzuki, MD, PhD**

1. Department of Anaesthesiology, Saiseikai Matsuyama Hospital, Matsuyama City, Ehime, Japan
2. Department of Pharmacology, Ehime University Graduate School of Medicine, Toon City, Ehime, Japan

## References

1. Masui, K., Ishigaki, S., Tomita, A. et al. Rocuronium pharmacodynamic models for published five pharmacokinetic models: age and sex are covariates in pharmacodynamic models. *Journal of Anesthesia*, 32, 709–716 (2018).
