# Computational Logic Validation for Rocuronium Effect-Site Concentration Prediction Application

## Executive Summary

This validation confirms that the JavaScript-based rocuronium effect-site concentration prediction application implements the computational methodology described in Masui et al. (2018) with complete accuracy. All pharmacokinetic parameters, pharmacodynamic equations, covariate implementations, and numerical integration methods align precisely with the published reference.

## Validation Methodology

The validation process compared application source code against the pharmacokinetic and pharmacodynamic models presented in "Rocuronium pharmacodynamic models for published five pharmacokinetic models: age and sex are covariates in pharmacodynamic models" (Journal of Anesthesia 2018; 32:709–716).

## 1. Pharmacokinetic Model Parameters

### 1.1 Parameter Verification
All five pharmacokinetic models (Wierda, Szenohradszky, Cooper, Alvarez-Gomez, McCoy) are correctly implemented:

**Application Implementation vs. Paper Values:**
- **Wierda**: V₁=0.044×BW, k₁₀=0.1, k₁₂=0.21, k₁₃=0.028, k₂₁=0.13, k₃₁=0.01 ✓
- **Szenohradszky**: V₁=0.0769×BW, k₁₀=0.0376, k₁₂=0.1143, k₁₃=0.0196, k₂₁=0.1748, k₃₁=0.0189 ✓
- **Cooper**: V₁=0.0385×BW, k₁₀=0.119, k₁₂=0.259, k₁₃=0.060, k₂₁=0.163, k₃₁=0.012 ✓
- **Alvarez-Gomez**: V₁=0.057×BW, k₁₀=0.0952, k₁₂=0.2807, k₁₃=0.0322, k₂₁=0.2149, k₃₁=0.0166 ✓
- **McCoy**: V₁=0.0622×BW, k₁₀=0.0530, k₁₂=0.0334, k₁₃=0, k₂₁=0.0141, k₃₁=0 (2-compartment) ✓

### 1.2 Compartmental Model Implementation
The application correctly implements the three-compartment (or two-compartment for McCoy) differential equation system:
```
dA₁/dt = infusion_rate - (k₁₀ + k₁₂ + k₁₃)×A₁ + k₂₁×A₂ + k₃₁×A₃
dA₂/dt = k₁₂×A₁ - k₂₁×A₂
dA₃/dt = k₁₃×A₁ - k₃₁×A₃
```

## 2. Pharmacodynamic Model Implementation

### 2.1 Parameter Correspondence
All pharmacodynamic parameters from Table 2 are correctly encoded:

**Wierda Model:**
- θ₂=1.08, θ₃=6.41, θ₄=0.100, θ₅=-0.00605, θ₆=-0.0494, θ₇=-1.24, θ₈=-0.00138 ✓

**Szenohradszky Model:**
- θ₂=1.44, θ₃=8.30, θ₄=0.247, θ₅=-0.00862, θ₆=-0.0981, θ₇=null, θ₈=-0.00343 ✓

**Cooper Model:**
- θ₂=0.980, θ₃=6.18, θ₄=0.0820, θ₅=-0.00557, θ₆=-0.0341, θ₇=-1.32, θ₈=-0.00109 ✓

**Alvarez-Gomez Model:**
- θ₂=0.900, θ₃=5.99, θ₄=0.110, θ₅=-0.00539, θ₆=-0.0443, θ₇=-1.14, θ₈=-0.00158 ✓

**McCoy Model:**
- θ₂=1.08, θ₃=4.20, θ₄=0.113, θ₅=-0.00770, θ₆=-0.0283, θ₇=null, θ₈=null ✓

### 2.2 Covariate Implementation
The application correctly implements age and sex covariates as described in the paper:

**Ce₅₀ Calculation:**
```javascript
const ce50 = pd.theta2 + (age - 50) * pd.theta5;
```
This matches the paper's formula: Ce₅₀ = θ₂ + (age - 50) × θ₅

**γ (Gamma) Calculation:**
```javascript
let gamma = pd.theta3 + (age - 50) * pd.theta6;
if (pd.theta7 !== null) { // Wierda, Cooper, AlvarezGomez
    gamma += sex * pd.theta7;
}
```
This correctly implements: γ = θ₃ + (age - 50) × θ₆ + sex × θ₇ (where applicable)

**ke₀ Calculation:**
```javascript
let ke0 = pd.theta4;
if (pd.theta8 !== null) { // Not for McCoy
    ke0 += (age - 50) * pd.theta8;
}
```
This matches: ke₀ = θ₄ + (age - 50) × θ₈ (where applicable)

## 3. Effect-Site Concentration Calculation

### 3.1 Differential Equation Implementation
The application correctly implements the effect-site concentration differential equation:
```javascript
const dce_dt = ke0 * (cpPrev - cePrev);
ceValues[i] = cePrev + dt * dce_dt;
```

This accurately represents: dCₑ/dt = ke₀ × (C₁ - Cₑ) as specified in the paper.

### 3.2 Numerical Integration
The effect-site concentration calculation uses Euler's method with appropriate time stepping (0.01 min), providing sufficient numerical precision for clinical applications.

## 4. Sigmoid Eₘₐₓ Model Implementation

### 4.1 TOF Ratio Calculation
The application correctly implements the sigmoid Eₘₐₓ model:
```javascript
const effect = e0 + (emax - e0) * (ce_gamma / denominator);
```

Where:
- E₀ = 100 (TOF ratio baseline)
- Eₘₐₓ = 0 (maximum effect)
- denominator = Ce₅₀^γ + Cₑ^γ

This precisely matches the paper's equation: Effect = E₀ + (Eₘₐₓ - E₀) × [Cₑ^γ/(Ce₅₀^γ + Cₑ^γ)]

## 5. Numerical Integration Methods

### 5.1 Pharmacokinetic Integration
The application employs fourth-order Runge-Kutta integration for the pharmacokinetic differential equations, providing superior numerical stability and accuracy compared to simpler methods.

### 5.2 Time Step Validation
The 0.01-minute time step ensures adequate temporal resolution for capturing rapid concentration changes while maintaining computational efficiency.

## 6. Sex Encoding Verification

The application correctly encodes sex variables:
- Male = 0
- Female = 1

This matches the paper's coding scheme as specified in Table 2 footnotes.

## 7. Model-Specific Considerations

### 7.1 Two-Compartment vs Three-Compartment Models
The application correctly handles the McCoy model as a two-compartment system (k₁₃ = k₃₁ = 0) while implementing the others as three-compartment models.

### 7.2 Missing Covariate Handling
For models where sex is not a covariate (Szenohradszky, McCoy), the application correctly omits θ₇ terms. Similarly, for the McCoy model where age does not affect ke₀, θ₈ is properly excluded.

## 8. Validation Limitations

### 8.1 Clinical Data Validation
This validation confirms computational accuracy against the published mathematical models but does not include validation against independent clinical datasets.

### 8.2 Extreme Value Handling
While the application includes range checking for patient parameters, extreme pharmacological scenarios (e.g., organ failure, drug interactions) are not specifically addressed, consistent with the scope of the original publication.

## Conclusion

The rocuronium effect-site concentration prediction application demonstrates complete fidelity to the computational methodology described in Masui et al. (2018). All pharmacokinetic parameters, pharmacodynamic equations, covariate implementations, and numerical methods are correctly implemented without mathematical errors or algorithmic deviations.

The application is suitable for clinical research and educational purposes within the parameter ranges validated in the original study (ages 21-76 years, weights 44-93 kg, BMI 17.3-29.8 kg/m²).

**Validation Status: CONFIRMED** - The computational logic is mathematically sound and clinically appropriate for the intended application domain.

---

*Original validation: July 11, 2025 | Public Release Version 1.0.0: July 13, 2025*
*Reference: Masui, K., Ishigaki, S., Tomita, A. et al. Rocuronium pharmacodynamic models for published five pharmacokinetic models: age and sex are covariates in pharmacodynamic models. J Anesth 32, 709–716 (2018). https://doi.org/10.1007/s00540-018-2543-3*