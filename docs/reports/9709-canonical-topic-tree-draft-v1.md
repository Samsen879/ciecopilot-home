# 9709 canonical topic tree draft v1

Issue: #289
Parent tracker: #286
Source contract predecessors: #287, #288

## Verdict

This is a first draft canonical topic tree for Cambridge International AS & A Level Mathematics 9709, generated from the locked official syllabus source artifacts only.

- Draft JSON: `data/syllabus/9709/canonical_topic_tree_draft_v1.json`
- Schema contract: `data/contracts/9709_syllabus_topic_tree_schema_v1.json`
- Source inventory: `data/syllabus/9709/source_inventory.json`
- Raw section layer: `data/syllabus/9709/raw_sections_v1.json`

## Source lock

- Source document ID: `cambridge-9709-syllabus-2026-2027-v4`
- Syllabus code: `9709`
- Syllabus version: `2026-2027_v4`
- Exam year range: `2026-2027`
- Official PDF SHA-256: `dd0131f3cd8d4e3c270e7936cbb909c15f4cb8053f8337b67c16e8ec0b8bc5e5`
- Accessed date: `2026-04-27`

Existing legacy or candidate files under `data/syllabus` and `data/curriculum` were not used as source truth for this draft. They remain comparison-only inputs for later human reconciliation.

## Coverage summary

- Total nodes: 201
- Node types: `component`: 6, `learning_objective`: 153, `note`: 3, `section`: 38, `syllabus`: 1
- Status counts: `draft`: 127, `needs_human_review`: 74
- Mapped subject-content bullets: 155
- Unmapped subject-content bullets: 0
- Source-ref posture: every generated node has at least one `official_syllabus` source ref resolving to the locked raw section layer.
- Boundary posture: no boundary nodes were generated; issue #290 owns boundary extraction.

## Subject-content bullet coverage

Each official subject-content bullet parsed from `raw_sections_v1.json` is mapped to one generated node through an exact `source_refs[].locator` value. The locator text remains in the JSON source reference; this report keeps the coverage table at section/count level.

| Raw section | Section ref | Bullet count |
| --- | --- | ---: |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.prior_knowledge` | 3 Subject content > Prior knowledge | 2 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p1.1_1_quadratics` | 3 Subject content > 1 Pure Mathematics 1 > 1.1 Quadratics | 5 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p1.1_2_functions` | 3 Subject content > 1 Pure Mathematics 1 > 1.2 Functions | 5 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p1.1_3_coordinate_geometry` | 3 Subject content > 1 Pure Mathematics 1 > 1.3 Coordinate geometry | 5 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p1.1_4_circular_measure` | 3 Subject content > 1 Pure Mathematics 1 > 1.4 Circular measure | 2 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p1.1_5_trigonometry` | 3 Subject content > 1 Pure Mathematics 1 > 1.5 Trigonometry | 5 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p1.1_6_series` | 3 Subject content > 1 Pure Mathematics 1 > 1.6 Series | 4 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p1.1_7_differentiation` | 3 Subject content > 1 Pure Mathematics 1 > 1.7 Differentiation | 4 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p1.1_8_integration` | 3 Subject content > 1 Pure Mathematics 1 > 1.8 Integration | 4 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p2.2_1_algebra` | 3 Subject content > 2 Pure Mathematics 2 > 2.1 Algebra | 3 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p2.2_2_logarithmic_and_exponential_functions` | 3 Subject content > 2 Pure Mathematics 2 > 2.2 Logarithmic and exponential functions | 4 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p2.2_3_trigonometry` | 3 Subject content > 2 Pure Mathematics 2 > 2.3 Trigonometry | 2 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p2.2_4_differentiation` | 3 Subject content > 2 Pure Mathematics 2 > 2.4 Differentiation | 3 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p2.2_5_integration` | 3 Subject content > 2 Pure Mathematics 2 > 2.5 Integration | 3 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p2.2_6_numerical_solution_of_equations` | 3 Subject content > 2 Pure Mathematics 2 > 2.6 Numerical solution of equations | 3 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p3.3_1_algebra` | 3 Subject content > 3 Pure Mathematics 3 > 3.1 Algebra | 5 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p3.3_2_logarithmic_and_exponential_functions` | 3 Subject content > 3 Pure Mathematics 3 > 3.2 Logarithmic and exponential functions | 4 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p3.3_3_trigonometry` | 3 Subject content > 3 Pure Mathematics 3 > 3.3 Trigonometry | 2 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p3.3_4_differentiation` | 3 Subject content > 3 Pure Mathematics 3 > 3.4 Differentiation | 3 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p3.3_5_integration` | 3 Subject content > 3 Pure Mathematics 3 > 3.5 Integration | 6 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p3.3_6_numerical_solution_of_equations` | 3 Subject content > 3 Pure Mathematics 3 > 3.6 Numerical solution of equations | 3 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p3.3_7_vectors` | 3 Subject content > 3 Pure Mathematics 3 > 3.7 Vectors | 6 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p3.3_8_differential_equations` | 3 Subject content > 3 Pure Mathematics 3 > 3.8 Differential equations | 4 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p3.3_9_complex_numbers` | 3 Subject content > 3 Pure Mathematics 3 > 3.9 Complex numbers | 8 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p4.4_1_forces_and_equilibrium` | 3 Subject content > 4 Mechanics > 4.1 Forces and equilibrium | 7 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p4.4_2_kinematics_of_motion_in_a_straight_line` | 3 Subject content > 4 Mechanics > 4.2 Kinematics of motion in a straight line | 4 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p4.4_3_momentum` | 3 Subject content > 4 Mechanics > 4.3 Momentum | 2 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p4.4_4_newtons_laws_of_motion` | 3 Subject content > 4 Mechanics > 4.4 Newton's laws of motion | 4 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p4.4_5_energy_work_and_power` | 3 Subject content > 4 Mechanics > 4.5 Energy, work and power | 5 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p5.5_1_representation_of_data` | 3 Subject content > 5 Probability & Statistics 1 > 5.1 Representation of data | 5 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p5.5_2_permutations_and_combinations` | 3 Subject content > 5 Probability & Statistics 1 > 5.2 Permutations and combinations | 2 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p5.5_3_probability` | 3 Subject content > 5 Probability & Statistics 1 > 5.3 Probability | 4 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p5.5_4_discrete_random_variables` | 3 Subject content > 5 Probability & Statistics 1 > 5.4 Discrete random variables | 3 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p5.5_5_the_normal_distribution` | 3 Subject content > 5 Probability & Statistics 1 > 5.5 The normal distribution | 3 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p6.6_1_the_poisson_distribution` | 3 Subject content > 6 Probability & Statistics 2 > 6.1 The Poisson distribution | 5 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p6.6_2_linear_combinations_of_random_variables` | 3 Subject content > 6 Probability & Statistics 2 > 6.2 Linear combinations of random variables | 1 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p6.6_3_continuous_random_variables` | 3 Subject content > 6 Probability & Statistics 2 > 6.3 Continuous random variables | 2 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p6.6_4_sampling_and_estimation` | 3 Subject content > 6 Probability & Statistics 2 > 6.4 Sampling and estimation | 8 |
| `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p6.6_5_hypothesis_tests` | 3 Subject content > 6 Probability & Statistics 2 > 6.5 Hypothesis tests | 5 |

## Unmapped records

- None. All 155 official subject-content bullet blocks are mapped to generated nodes.

## Merge candidates

Repeated official section titles were retained as component-scoped nodes and marked for human review instead of being silently merged.

- `9709:2026-2027_v4:section:p1.trigonometry` (3 Subject content > 1 Pure Mathematics 1 > 1.5 Trigonometry): Repeated official section title appears in more than one component.
- `9709:2026-2027_v4:section:p1.differentiation` (3 Subject content > 1 Pure Mathematics 1 > 1.7 Differentiation): Repeated official section title appears in more than one component.
- `9709:2026-2027_v4:section:p1.integration` (3 Subject content > 1 Pure Mathematics 1 > 1.8 Integration): Repeated official section title appears in more than one component.
- `9709:2026-2027_v4:section:p2.algebra` (3 Subject content > 2 Pure Mathematics 2 > 2.1 Algebra): Repeated official section title appears in more than one component.
- `9709:2026-2027_v4:section:p2.logarithmic_and_exponential_functions` (3 Subject content > 2 Pure Mathematics 2 > 2.2 Logarithmic and exponential functions): Repeated official section title appears in more than one component.
- `9709:2026-2027_v4:section:p2.trigonometry` (3 Subject content > 2 Pure Mathematics 2 > 2.3 Trigonometry): Repeated official section title appears in more than one component.
- `9709:2026-2027_v4:section:p2.differentiation` (3 Subject content > 2 Pure Mathematics 2 > 2.4 Differentiation): Repeated official section title appears in more than one component.
- `9709:2026-2027_v4:section:p2.integration` (3 Subject content > 2 Pure Mathematics 2 > 2.5 Integration): Repeated official section title appears in more than one component.
- `9709:2026-2027_v4:section:p2.numerical_solution_of_equations` (3 Subject content > 2 Pure Mathematics 2 > 2.6 Numerical solution of equations): Repeated official section title appears in more than one component.
- `9709:2026-2027_v4:section:p3.algebra` (3 Subject content > 3 Pure Mathematics 3 > 3.1 Algebra): Repeated official section title appears in more than one component.
- `9709:2026-2027_v4:section:p3.logarithmic_and_exponential_functions` (3 Subject content > 3 Pure Mathematics 3 > 3.2 Logarithmic and exponential functions): Repeated official section title appears in more than one component.
- `9709:2026-2027_v4:section:p3.trigonometry` (3 Subject content > 3 Pure Mathematics 3 > 3.3 Trigonometry): Repeated official section title appears in more than one component.
- `9709:2026-2027_v4:section:p3.differentiation` (3 Subject content > 3 Pure Mathematics 3 > 3.4 Differentiation): Repeated official section title appears in more than one component.
- `9709:2026-2027_v4:section:p3.integration` (3 Subject content > 3 Pure Mathematics 3 > 3.5 Integration): Repeated official section title appears in more than one component.
- `9709:2026-2027_v4:section:p3.numerical_solution_of_equations` (3 Subject content > 3 Pure Mathematics 3 > 3.6 Numerical solution of equations): Repeated official section title appears in more than one component.


## Split candidates

Compound or notation-heavy official bullet blocks were retained as one learning-objective or note node and marked `needs_human_review` instead of being split without official granularity.

- `9709:2026-2027_v4:learning_objective:p1.functions.lo02_identify_the_range_of_a_given_function_in` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p1.1_2_functions`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p1.functions.lo05_understand_and_use_the_transformations_of_the_graph` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p1.1_2_functions`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p1.coordinate_geometry.lo02_interpret_and_use_any_of_the_forms_y` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p1.1_3_coordinate_geometry`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p1.coordinate_geometry.lo05_understand_the_relationship_between_a_graph_and_its` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p1.1_3_coordinate_geometry`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p1.trigonometry.lo01_sketch_and_use_graphs_of_the_sine_cosine` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p1.1_5_trigonometry`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p1.series.lo03_use_the_formulae_for_the_nth_term_and` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p1.1_6_series`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p1.differentiation.lo01_understand_the_gradient_of_a_curve_at_a` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p1.1_7_differentiation`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p1.differentiation.lo02_use_the_derivative_of_xn_for_any_rational` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p1.1_7_differentiation`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p1.differentiation.lo03_apply_differentiation_to_gradients_tangents_and_normals_increasing` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p1.1_7_differentiation`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p1.differentiation.lo04_locate_stationary_points_and_determine_their_nature_and` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p1.1_7_differentiation`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p1.integration.lo01_u_o_n_f_d_d_i_e` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p1.1_8_integration`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p1.integration.lo04_use_definite_integration_to_find_the_area_of` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p1.1_8_integration`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p2.algebra.lo01_understand_the_meaning_of_x_sketch_the_graph` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p2.2_1_algebra`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p2.algebra.lo03_use_the_factor_theorem_and_the_remainder_theorem` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p2.2_1_algebra`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p2.logarithmic_and_exponential_functions.lo02_understand_the_definition_and_properties_of_ex_and` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p2.2_2_logarithmic_and_exponential_functions`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p2.logarithmic_and_exponential_functions.lo04_use_logarithms_to_transform_a_given_relationship_to` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p2.2_2_logarithmic_and_exponential_functions`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p2.trigonometry.lo01_understand_the_relationship_of_the_secant_cosecant_and` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p2.2_3_trigonometry`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p2.trigonometry.lo02_use_trigonometrical_identities_for_the_simplification_and_exact` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p2.2_3_trigonometry`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p2.integration.lo01_extend_the_idea_of_reverse_differentiation_to_1` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p2.2_5_integration`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p2.numerical_solution_of_equations.lo03_understand_how_a_given_simple_iterative_formula_of` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p2.2_6_numerical_solution_of_equations`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p3.algebra.lo01_understand_the_meaning_of_x_sketch_the_graph` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p3.3_1_algebra`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p3.algebra.lo03_use_the_factor_theorem_and_the_remainder_theorem` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p3.3_1_algebra`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p3.algebra.lo04_recall_an_appropriate_form_for_expressing_rational_functions` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p3.3_1_algebra`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p3.algebra.lo05_use_the_expansion_of_1_x_n_where` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p3.3_1_algebra`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p3.logarithmic_and_exponential_functions.lo02_understand_the_definition_and_properties_of_ex_and` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p3.3_2_logarithmic_and_exponential_functions`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p3.logarithmic_and_exponential_functions.lo04_use_logarithms_to_transform_a_given_relationship_to` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p3.3_2_logarithmic_and_exponential_functions`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p3.trigonometry.lo01_understand_the_relationship_of_the_secant_cosecant_and` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p3.3_3_trigonometry`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p3.trigonometry.lo02_use_trigonometrical_identities_for_the_simplification_and_exact` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p3.3_3_trigonometry`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p3.differentiation.lo01_use_the_derivatives_of_ex_ln_x_sin` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p3.3_4_differentiation`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p3.integration.lo01_extend_the_idea_of_reverse_differentiation_to_2` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p3.3_5_integration`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p3.integration.lo04_recognise_an_integrand_of_the_form_and_f` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p3.3_5_integration`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p3.numerical_solution_of_equations.lo03_understand_how_a_given_simple_iterative_formula_of` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p3.3_6_numerical_solution_of_equations`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p3.vectors.lo02_carry_out_addition_and_subtraction_of_vectors_and` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p3.3_7_vectors`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p3.vectors.lo04_understand_the_significance_of_all_the_symbols_used` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p3.3_7_vectors`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p3.vectors.lo05_determine_whether_two_lines_are_parallel_calculation_of` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p3.3_7_vectors`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p3.vectors.lo06_use_formulae_to_calculate_the_scalar_product_of` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p3.3_7_vectors`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p3.complex_numbers.lo01_understand_the_idea_of_a_complex_number_recall` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p3.3_9_complex_numbers`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p3.complex_numbers.lo05_carry_out_operations_of_multiplication_and_d_p` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p3.3_9_complex_numbers`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p3.complex_numbers.lo07_understand_in_simple_terms_the_geometrical_effects_of` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p3.3_9_complex_numbers`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p4.forces_and_equilibrium.lo03_use_the_principle_that_when_a_particle_is` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p4.4_1_forces_and_equilibrium`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p4.forces_and_equilibrium.lo06_understand_the_concepts_of_limiting_friction_and_limiting` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p4.4_1_forces_and_equilibrium`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p4.kinematics_of_motion_in_a_straight_line.lo01_understand_the_concepts_of_distance_and_speed_as` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p4.4_2_kinematics_of_motion_in_a_straight_line`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p4.kinematics_of_motion_in_a_straight_line.lo02_sketch_and_interpret_displacement_time_graphs_and_velocity` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p4.4_2_kinematics_of_motion_in_a_straight_line`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p4.newton_s_laws_of_motion.lo01_apply_newton_s_laws_of_motion_to_the` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p4.4_4_newtons_laws_of_motion`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p4.energy_work_and_power.lo01_understand_the_concept_of_the_work_done_by` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p4.4_5_energy_work_and_power`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p4.energy_work_and_power.lo03_understand_and_use_the_relationship_between_the_change` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p4.4_5_energy_work_and_power`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p4.energy_work_and_power.lo04_use_the_definition_of_power_as_the_rate` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p4.4_5_energy_work_and_power`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p5.representation_of_data.lo05_calculate_and_use_the_mean_and_standard_deviation` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p5.5_1_representation_of_data`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p5.permutations_and_combinations.lo02_solve_problems_about_arrangements_of_objects_in_a` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p5.5_2_permutations_and_combinations`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p5.probability.lo01_evaluate_probabilities_in_simple_cases_by_means_of` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p5.5_3_probability`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p5.probability.lo03_understand_the_meaning_of_exclusive_and_independent_events` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p5.5_3_probability`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p5.discrete_random_variables.lo02_use_formulae_for_probabilities_for_the_binomial_and` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p5.5_4_discrete_random_variables`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p5.the_normal_distribution.lo02_solve_problems_concerning_a_variable_x_where_x` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p5.5_5_the_normal_distribution`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p5.the_normal_distribution.lo03_recall_conditions_under_which_the_normal_distribution_can` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p5.5_5_the_normal_distribution`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p6.linear_combinations_of_random_variables.lo01_use_when_solving_problems_the_results_that_proofs` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p6.6_2_linear_combinations_of_random_variables`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p6.continuous_random_variables.lo01_understand_the_concept_of_a_continuous_random_variable` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p6.6_3_continuous_random_variables`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p6.sampling_and_estimation.lo02_explain_in_simple_terms_why_a_given_sampling` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p6.6_4_sampling_and_estimation`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p6.hypothesis_tests.lo01_understand_the_nature_of_a_hypothesis_test_the` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p6.6_5_hypothesis_tests`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.
- `9709:2026-2027_v4:learning_objective:p6.hypothesis_tests.lo02_formulate_hypotheses_and_carry_out_a_hypothesis_test` from `cambridge-9709-syllabus-2026-2027-v4.3.subject_content.p6.6_5_hypothesis_tests`: Compound, notation-heavy, or OCR-damaged official bullet kept unsplit for draft v1.


## Legacy comparison inputs

The following repository files are explicitly non-authoritative for this issue and were not used to generate canonical nodes:

- `data/syllabus/9709syllabus.txt` - deprecated; allowed use: historical_audit_or_manual_comparison_only_after_official_raw_sections_are_locked.
- `data/syllabus/9709_p1_p3_nodes_v1.json` - legacy_non_authoritative; allowed use: candidate_comparison_input_for_p1_p3_only.
- `data/curriculum/9709_question_search_recovery_nodes_v1.json` - candidate_comparison_input; allowed use: compare_existing_runtime_seed_against_locked_official_raw_sections.
- `data/curriculum/9709_authority_ready_batch_300_nodes_v2.json` - candidate_comparison_input; allowed use: compare_batch_seed_coverage_against_locked_official_raw_sections.
