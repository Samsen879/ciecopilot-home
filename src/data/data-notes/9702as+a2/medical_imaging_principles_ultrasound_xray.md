## Medical Physics: Principles of Medical Imaging

**Syllabus Reference**: 9702.24
**Learning Objective**: Analyse and compare medical imaging techniques, including calculations involving acoustic impedance, the intensity reflection coefficient for ultrasound, and the attenuation of X-rays.

### Example Question
A patient undergoes diagnostic imaging to investigate an abnormality. Both ultrasound and X-ray techniques are considered.

**Data:**
- Acoustic impedance of soft tissue, $Z_{tissue} = 1.63 \times 10^6$ kg m⁻² s⁻¹
- Acoustic impedance of bone, $Z_{bone} = 7.80 \times 10^6$ kg m⁻² s⁻¹
- Linear attenuation coefficient of soft tissue for 50 keV X-rays, $\mu_{tissue} = 0.21$ cm⁻¹
- Linear attenuation coefficient of bone for 50 keV X-rays, $\mu_{bone} = 0.95$ cm⁻¹

(a) An ultrasound pulse is directed at a boundary between soft tissue and bone.
(i) State what is meant by *acoustic impedance*.
(ii) Calculate the percentage of the ultrasound intensity that is reflected at the soft tissue-bone boundary.

(b) An X-ray beam with an initial intensity $I_0$ passes through 4.0 cm of soft tissue and then 2.0 cm of bone.
(i) State the equation that describes the attenuation of X-rays in a medium.
(ii) Calculate the final intensity of the X-ray beam as a fraction of its initial intensity, $I_0$.

(c) Using your calculations and physical principles, explain why X-ray imaging is highly effective for visualising bone fractures, whereas ultrasound is often preferred for imaging organs within soft tissue.

### Mark Scheme / Solution
(a) (i) Acoustic impedance is the product of the density of a medium and the speed of sound in that medium. ($Z = \rho c$) [B1]
It is a measure of the opposition of the medium to the propagation of ultrasound. [B1]

(a) (ii) Use the intensity reflection coefficient formula: $\alpha = \left(\frac{Z_2 - Z_1}{Z_2 + Z_1}\right)^2$. [C1]
Substitution: $\alpha = \left(\frac{7.80 \times 10^6 - 1.63 \times 10^6}{7.80 \times 10^6 + 1.63 \times 10^6}\right)^2 = \left(\frac{6.17 \times 10^6}{9.43 \times 10^6}\right)^2$. [C1]
$\alpha = (0.6543)^2 = 0.428$.
Percentage reflected = $0.428 \times 100\% = 43\%$. [A1]

(b) (i) $I = I_0 e^{-\mu x}$ where $I_0$ is the initial intensity, $I$ is the transmitted intensity, $\mu$ is the linear attenuation coefficient, and $x$ is the thickness of the medium. [B1]

(b) (ii)
Intensity after passing through soft tissue ($I_1$):
$I_1 = I_0 e^{-(0.21 \text{ cm}^{-1} \times 4.0 \text{ cm})} = I_0 e^{-0.84} = 0.4317 I_0$. [M1]
Intensity after then passing through bone ($I_2$):
$I_2 = I_1 e^{-(0.95 \text{ cm}^{-1} \times 2.0 \text{ cm})} = (0.4317 I_0) e^{-1.90}$. [M1]
$I_2 = (0.4317 I_0)(0.1496) = 0.0646 I_0$.
The final intensity is $0.065 I_0$ (or 6.5% of $I_0$). [A1]

(c)
**X-rays for bone:**
The calculation in (b) shows significant attenuation by bone ($\mu_{bone}$ is large). X-rays are absorbed much more by dense materials like bone than by soft tissue. [M1]
This large difference in attenuation creates high contrast in the image, making bones appear white against the darker soft tissue, which is ideal for spotting fractures. [A1]

**Ultrasound for soft tissue:**
The calculation in (a) shows a very high reflection (43%) at the tissue-bone boundary. This means very little ultrasound penetrates the bone to image structures behind it (*acoustic shadowing*). [M1]
However, boundaries between different soft tissues have smaller differences in acoustic impedance, leading to partial reflection and partial transmission. This allows for visualisation of organ boundaries and structures within soft tissue. [A1]

### Standard Solution Steps
- Part (a)(i): Recall $Z=\rho c$ for acoustic impedance
- Part (a)(ii): Use intensity reflection coefficient $\alpha=\left(\frac{Z_2-Z_1}{Z_2+Z_1}\right)^2$ and compute percentage
- Part (b)(i): State $I=I_0 e^{-\mu x}$ and define symbols
- Part (b)(ii): Apply attenuation sequentially through tissue then bone and express as a fraction of $I_0$
- Part (c): Synthesize results to explain modality suitability (X-ray for bone, ultrasound for soft tissue)

### Common Mistakes
-   **Ultrasound Calculation:** Using the formula for pressure amplitude reflection ratio, $\frac{Z_2 - Z_1}{Z_2 + Z_1}$, and forgetting to square it for the intensity ratio.
-   **X-ray Calculation:**
    -   Adding the attenuation effects incorrectly, e.g., adding the exponents before calculating, $e^{-(\mu_1 x_1 + \mu_2 x_2)}$, which is correct, but prone to error if not done carefully. A common mistake is to calculate attenuations separately and then add the *intensities*, which is wrong.
    -   Unit mismatch: Ensure the units of thickness ($x$) and attenuation coefficient ($\mu$) are consistent (e.g., both in cm or both in m). Here, they are both in cm, so no conversion is needed.
    -   Forgetting the negative sign in the exponent.
-   **Explanation:**
    -   Providing a generic explanation without referring to the calculations performed in parts (a) and (b).
    -   Confusing the concepts. Stating that bone has a high acoustic impedance for X-rays (wrong) or a high attenuation coefficient for ultrasound (also wrong terminology). The correct terms are *attenuation* for X-rays and *acoustic impedance* for ultrasound.
    -   Vaguely stating "bone is dense" without linking it to the relevant physical principle for each imaging technique (high attenuation for X-rays, high acoustic impedance for ultrasound).

### Tags
medical_physics, ultrasound, x_ray, acoustic_impedance, attenuation, intensity_reflection_coefficient, medical_imaging, 24