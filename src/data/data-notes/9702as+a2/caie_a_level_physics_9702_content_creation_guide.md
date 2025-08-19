### **Internal Guide: CAIE A Level Physics 9702 Content Creation**

This document provides the definitive master plan for the development of educational content for the Cambridge International A Level Physics 9702 syllabus. It consolidates all project requirements into a single, actionable guide.

---

### **1. Final Markdown Template**

**Analysis & Decision:**
The user provided two templates. The initial template was comprehensive but complex. The subsequent instructions introduced a "strict" template and emphasized that **"field names and order are absolutely not allowed to change"** (*字段名和顺序绝不允许变动*). This final directive for absolute rigidity and consistency takes precedence.

Therefore, the simpler, strict template is adopted as the definitive standard for all content modules. Its rigid structure ensures uniformity, simplifies content creation, and supports automated processing and quality assurance.

**Definitive Template:**

All content must be structured using the following YAML front matter and Markdown body. The fields and their order are fixed.

```yaml
---
title: "Title of the Specific Syllabus Point"
syllabus_code: "9702"
level: "AS" # Options: AS or A2
paper: "1" # Or other relevant paper numbers
topic: "Physical Quantities and Units" # High-level topic name
sub_topic: "1.1 Physical Quantities" # Specific sub-topic name
---

### Learning Objectives

- (a) show an understanding that all physical quantities consist of a numerical magnitude and a unit
- (b) recall the following base quantities and their units: mass (kg), length (m), time (s), current (A), temperature (K), amount of substance (mol)

### Core Concepts

**1. Physical Quantities**
A physical quantity is a property of a material or system that can be quantified by measurement. It is always expressed as a combination of a numerical magnitude and a unit.
- **Magnitude:** The numerical value (e.g., 5.2, 100).
- **Unit:** The standard of measurement (e.g., metres, kilograms).
- *Example:* The length of a desk is `2.5 m`. Here, `2.5` is the magnitude and `m` (metres) is the unit.

**2. Base Quantities and SI Units**
The International System of Units (SI) defines seven base quantities from which all other physical quantities (derived quantities) are formed.

| Base Quantity          | Symbol for Quantity | Name of SI Unit | Symbol for Unit |
| ---------------------- | ------------------- | ----------------- | --------------- |
| Mass                   | *m*                 | kilogram          | kg              |
| Length                 | *l, x, r*           | metre             | m               |
| Time                   | *t*                 | second            | s               |
| Electric Current       | *I*                 | ampere            | A               |
| Thermodynamic Temp.    | *T*                 | kelvin            | K               |
| Amount of Substance    | *n*                 | mole              | mol             |

### Worked Example

**Question:**
A student measures the current flowing through a resistor as 0.025 amperes. Identify the magnitude and the unit of this physical quantity.

**Solution:**
1.  **Identify the full measurement:** The measurement is `0.025 A`.
2.  **Separate the parts:** A physical quantity is `magnitude × unit`.
3.  **Conclusion:**
    - The magnitude is **0.025**.
    - The unit is **amperes (A)**.

### Common Pitfalls & Exam Tips

- **Missing Units:** A very common mistake is to provide only the numerical answer in calculations. Always include the correct unit. An answer of `50` is incorrect; `50 Hz` is correct.
- **Unit Conversion:** Be vigilant about prefixes (e.g., kilo-, milli-, micro-). The base SI units (e.g., m, s, kg) must be used in most standard physics equations. Convert all quantities to base SI units *before* substituting them into formulas.
- **Scalar vs. Vector:** While not covered in this sub-topic, remember that some quantities (vectors) also have a direction. Base quantities are scalars.

```

---

### **2. Consolidated Project Rules**

This section outlines the mandatory rules for content creation, formatting, and quality assurance.

#### **A. Content & Language**

1.  **Language:** All content must be written in **English**.
2.  **Tone:** The tone must be objective, formal, and educational. Avoid colloquialisms and overly casual language.
3.  **Syllabus Adherence:** All content must be mapped directly to a specific learning objective from the official CAIE 9702 syllabus.
4.  **Clarity and Conciseness:** Explanations should be clear, direct, and easy to understand for an A Level student.
5.  **Definitions:** Key terms must be defined precisely as they are in the physics domain. Use **bold** for the term being defined.
6.  **Examples:** Provide clear, relevant worked examples to illustrate concepts and problem-solving techniques.

#### **B. Formatting & Syntax**

1.  **File Format:** All files must be in Markdown (`.md`).
2.  **Headings:** Use Markdown headings (`#`, `##`, `###`) to structure the document logically. The main sections (`Learning Objectives`, `Core Concepts`, etc.) must be `###` (H3).
3.  **Emphasis:**
    - Use **bold** (`**text**`) for key terms, definitions, and important takeaways.
    - Use *italics* (`*text*`) for emphasis, variable symbols (e.g., *v* for velocity), or introducing foreign terms.
4.  **Lists:** Use bulleted or numbered lists for clarity.
5.  **Tables:** Use Markdown tables to present structured data, such as the base units or comparisons.
6.  **Code Blocks:**
    - Use inline code (`...`) for file paths, variable names, and short technical terms.
    - **Crucially, do not place general prose, analysis, or lists inside code blocks.** They are reserved for code, configuration, or terminal output only.

#### **C. Mathematical & Scientific Notation**

1.  **LaTeX for Equations:** All mathematical formulas, equations, and complex expressions must be formatted using LaTeX.
    - Inline equations: `$ E = mc^2 $`
    - Block (display) equations: `$$ F = G \frac{m_1 m_2}{r^2} $$`
2.  **Variable Symbols:** Italicize variable symbols in prose (e.g., "where *F* represents force").
3.  **Units:**
    - There must be a space between the numerical magnitude and the unit (e.g., `9.81 m s⁻²`, not `9.81m s⁻²`).
    - Use negative powers for inverse units (e.g., `m s⁻¹`), not slashes (`m/s`).

#### **D. File Naming & Metadata**

1.  **File Naming Convention:** Files should be named descriptively in `kebab-case`. The name should reflect the sub-topic.
    - *Example:* `1-1-physical-quantities.md`
2.  **YAML Front Matter:** Every file must begin with a YAML block (`---...---`) containing the required metadata fields: `title`, `syllabus_code`, `level`, `paper`, `topic`, `sub_topic`. The field names and their order are fixed as per the template.

#### **E. Quality Assurance Checklist**

Before finalizing any content file, verify the following:
- [ ] **Template Compliance:** Does the file strictly adhere to the final template structure and field order?
- [ ] **Syllabus Accuracy:** Does the content accurately reflect the specified learning objectives from the 9702 syllabus?
- [ ] **Formatting Correctness:** Are all Markdown, LaTeX, and notational rules correctly applied?
- [ ] **Clarity:** Is the language clear, and are the examples easy to follow?
- [ ] **Completeness:** Does the file contain all required sections (Objectives, Concepts, Example, Pitfalls)?
- [ ] **File Naming:** Is the file named according to the convention?

---

### **3. Project Workflow**

The project will proceed in a structured, sequential manner to ensure comprehensive coverage and high quality.

**Phase 1: Foundation & Resource Gathering**
1.  **Acquire Official Syllabus:** Obtain the latest version of the CAIE A Level Physics (9702) syllabus. This document is the ultimate source of truth for all content requirements.
2.  **Compile Past Papers:** Gather a comprehensive library of past examination papers (Papers 1, 2, 4, etc.) from the last 5-7 years. These are essential for creating realistic examples and practice questions.
3.  **Create Topic Map:** Develop a master list or spreadsheet mapping every single syllabus point (e.g., 1.1a, 1.1b, 2.1a) to a corresponding content file. This will serve as the project dashboard.

**Phase 2: Content Generation (Iterative Cycle)**
This phase will proceed sequentially through the syllabus, starting with AS Level topics and then moving to A2 Level topics. For each syllabus sub-topic:

1.  **Draft Learning Objectives:** Copy the exact wording of the learning objectives from the syllabus into the `Learning Objectives` section of the template.
2.  **Develop Core Concepts:** Write clear, detailed explanations for the concepts, laws, and principles required by the learning objectives. Use diagrams, tables, and structured lists where appropriate.
3.  **Create Worked Example:** Design a worked example that directly tests the application of the core concepts. The problem should be of a style and difficulty comparable to those found in past papers.
4.  **Identify Common Pitfalls:** Analyze past paper mark schemes and examiner reports to identify common student errors, misconceptions, and strategic tips. Compile these into the `Common Pitfalls & Exam Tips` section.
5.  **Internal Review:** Perform a self-check using the **Quality Assurance Checklist**.

**Phase 3: Peer Review & Refinement**
1.  **Peer Review:** Once a logical block of content (e.g., an entire chapter like 'Kinematics') is complete, it will be assigned to another team member for peer review.
2.  **Feedback Integration:** The original author integrates feedback from the review, focusing on accuracy, clarity, and adherence to the guide. Any disagreements are resolved by the project lead.

**Phase 4: Finalization & Version Control**
1.  **Final Approval:** The project lead gives final approval to the refined content.
2.  **File Management:** The approved file is named correctly and committed to the central content repository (e.g., a Git repository). The project dashboard (topic map) is updated to reflect the completion.
3.  **Iteration:** The team proceeds to the next topic in the syllabus, repeating Phase 2 and 3.