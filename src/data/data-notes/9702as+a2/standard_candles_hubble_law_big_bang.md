## Astronomy and cosmology: Standard Candles, Hubble's Law and the Big Bang

**Syllabus Reference**: 9702.25
**Learning Objective**: Use inverse-square law for flux, apply Hubble's law, and estimate the age of the universe from $H_0$.

### Example Question
State Hubble's law and show how it can be used with standard candles to estimate the age of the universe.

### Mark Scheme / Solution
- State Hubble's law $v=H_0 d$ (B1)
- Use inverse-square law $F=\dfrac{L}{4\pi d^2}$ to find distance from a standard candle (M1)
- Combine $v=H_0 d$ and $T\approx 1/H_0$ to estimate age (A1)

### Standard Solution Steps
- Define luminosity and flux; recall $F=\dfrac{L}{4\pi d^2}$
- Measure flux of a known-luminosity object to infer $d$
- Use redshift to compute recessional speed and apply $v=H_0 d$
- Invert $H_0$ to estimate $T\approx 1/H_0$

### Common Mistakes
- Mixing units for $H_0$; not converting km s$^{-1}$ Mpc$^{-1}$ to s$^{-1}$
- Confusing luminosity with flux

### Tags
astronomy, cosmology, standard_candles, hubble_law, inverse_square_law, 25

### Core Concepts

**1. Stellar Distances and Standard Candles**

To measure the vast distances to other galaxies, astronomers use **standard candles**.

- **Luminosity (L):** The total power radiated by a star or galaxy. It is an intrinsic property. Unit: watts (W).
- **Radiant Flux Intensity (F):** The power received per unit area at the observer. It is what we measure on Earth and depends on distance. Unit: W m⁻².
- **Inverse Square Law:** For a source radiating uniformly in all directions, its flux *F* at a distance *d* is given by:
  $ F = \frac{L}{4 \pi d^2} $
  This equation is fundamental for distance measurement. If the luminosity *L* of an object is known, and we measure its flux *F*, we can calculate its distance *d*.

- **Standard Candle:** An astronomical object with a known luminosity. By measuring its apparent brightness (flux), its distance can be calculated.

- **Cepheid Variables:** A crucial type of standard candle. These are pulsating giant stars whose luminosity is directly related to their period of pulsation.
    - **Period-Luminosity Relationship:** Stars with longer pulsation periods are intrinsically more luminous.
    - **Method:**
        1. Observe a Cepheid variable in a distant galaxy and measure its period of pulsation.
        2. Use the known period-luminosity relationship to determine its absolute luminosity (*L*).
        3. Measure its radiant flux intensity (*F*) on Earth.
        4. Calculate the distance (*d*) to the star (and its host galaxy) using the inverse square law.

**2. Hubble's Law and the Expanding Universe**

- **Redshift (z):** Light from distant galaxies is shifted to longer wavelengths. This is known as cosmological redshift and is caused by the expansion of space itself. It is calculated as:
  $ z = \frac{\Delta\lambda}{\lambda_0} = \frac{\lambda_{obs} - \lambda_0}{\lambda_0} $
  For non-relativistic speeds, redshift is related to recessional velocity *v* by $ z \approx \frac{v}{c} $.

- **Hubble's Law:** The recessional speed *v* of a galaxy is directly proportional to its distance *d*.
  $ v = H_0 d $
  - *v* is the recessional speed, determined from the galaxy's redshift.
  - *d* is the distance to the galaxy, determined using standard candles.
  - *H₀* is the **Hubble constant**, the constant of proportionality. Its value is approximately $2.2 \times 10^{-18} \text{ s}^{-1}$.

Hubble's Law is primary evidence for an expanding universe. It shows that galaxies are moving away from each other, and the further away they are, the faster they are receding.

**3. The Big Bang Theory**

The Big Bang theory is the leading cosmological model for the observable universe. It states that the universe began from an extremely hot, dense singularity approximately 13.8 billion years ago and has been expanding and cooling ever since.

**Key Evidence:**
1.  **Hubble's Law (Galactic Redshift):** The observation that all distant galaxies are receding from us implies that the universe is expanding. If we reverse this expansion back in time, everything must have been concentrated at a single point in the past.
2.  **Cosmic Microwave Background (CMB) Radiation:**
    - This is the thermal radiation "afterglow" left over from the time of recombination in the early universe.
    - When the universe was ~380,000 years old, it cooled enough for protons and electrons to form neutral hydrogen atoms, making the universe transparent to light for the first time. The photons from that era have been travelling through space ever since.
    - Due to the expansion of the universe, these photons have been redshifted to microwave wavelengths.
    - The CMB appears as a nearly uniform background radiation with a black-body temperature of about **2.7 K**, providing a snapshot of the early universe. Its existence and near-uniformity are strong confirmations of the Big Bang model.

**4. Age of the Universe**
By assuming the expansion rate has been constant, the age of the universe (*T*) can be estimated as the reciprocal of the Hubble constant.
From Hubble's law, $d = vT$. Comparing with $v = H_0 d$, we get:
$ T \approx \frac{1}{H_0} $

### Worked Example

**Question:**
An astronomer observes a Cepheid variable star in the galaxy NGC 4603.
(a) The star's period of pulsation allows its luminosity to be determined as $L = 2.5 \times 10^{30}$ W. The radiant flux intensity measured at Earth is $F = 6.2 \times 10^{-14}$ W m⁻². Calculate the distance to the galaxy in metres.

(b) A spectral line from hydrogen in the galaxy's light is observed at a wavelength of 487.4 nm. The same line has a rest wavelength of 486.1 nm in the laboratory. Calculate the recessional speed of NGC 4603.

(c) Using your answers from (a) and (b), calculate a value for the Hubble constant, $H_0$.

(d) Use your value of $H_0$ to estimate the age of the Universe in years. (1 year = $3.16 \times 10^7$ s)

**Solution:**
(a) **Calculate distance**
Use the inverse square law formula: $F = \frac{L}{4 \pi d^2}$
Rearrange for distance *d*:
$d = \sqrt{\frac{L}{4 \pi F}}$
$d = \sqrt{\frac{2.5 \times 10^{30}}{4 \pi (6.2 \times 10^{-14})}}$
$d = \sqrt{3.209 \times 10^{42}}$
$d = 1.79 \times 10^{21}$ m

(b) **Calculate recessional speed**
First, find the redshift *z*:
$\Delta\lambda = 487.4 \text{ nm} - 486.1 \text{ nm} = 1.3 \text{ nm}$
$z = \frac{\Delta\lambda}{\lambda_0} = \frac{1.3 \text{ nm}}{486.1 \text{ nm}} = 0.00267$
Now, use the redshift to find the velocity *v*:
$v \approx z \times c = 0.00267 \times (3.0 \times 10^8 \text{ m s}^{-1})$
$v = 8.01 \times 10^5 \text{ m s}^{-1}$

(c) **Calculate the Hubble constant**
Use Hubble's law: $H_0 = \frac{v}{d}$
$H_0 = \frac{8.01 \times 10^5 \text{ m s}^{-1}}{1.79 \times 10^{21} \text{ m}}$
$H_0 = 4.47 \times 10^{-16} \text{ s}^{-1}$

(d) **Estimate the age of the Universe**
The age *T* is the reciprocal of the Hubble constant:
$T \approx \frac{1}{H_0} = \frac{1}{4.47 \times 10^{-16} \text{ s}^{-1}} = 2.24 \times 10^{15}$ s
Convert seconds to years:
$T = \frac{2.24 \times 10^{15} \text{ s}}{3.16 \times 10^7 \text{ s year}^{-1}} = 7.08 \times 10^7$ years.
*(Note: This is an illustrative example. The actual distance to NGC 4603 is much greater, leading to an age closer to the accepted value of ~13.8 billion years. This highlights how small measurement uncertainties can significantly affect the result.)*

### Common Pitfalls & Exam Tips

- **Units for H₀:** Be careful with the units of the Hubble constant. While the base SI unit is s⁻¹, it is often given in km s⁻¹ Mpc⁻¹ (kilometres per second per megaparsec). You must perform conversions to use consistent units in calculations.
- **Age Calculation:** Remember that $T \approx 1/H_0$ is an *estimate*. It assumes the rate of expansion has been constant throughout the history of the universe. Modern observations suggest the expansion is accelerating.
- **Nature of Expansion:** The redshift of distant galaxies is not due to them moving *through* space away from a central point. It is due to the *expansion of space itself*, which stretches the wavelength of light as it travels.
- **Distinguishing Luminosity and Flux:** Do not confuse luminosity (*L*, an intrinsic property of the star) with radiant flux intensity (*F*, what is measured at a distance). The inverse square law connects them.
- **Standard Candles vs. Parallax:** Trigonometric parallax is used for measuring distances to nearby stars within our own galaxy. Standard candles are essential for the much larger intergalactic distances.
 