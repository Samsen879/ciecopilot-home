function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeLowerString(value) {
  return normalizeString(value).toLowerCase();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function hasTrigToken(prompt) {
  return /(?:^|[^a-z])(sin|cos|tan|sec|cosec|cot)(?:[^a-z]|$)/u.test(prompt);
}

function hasAny(prompt, patterns = []) {
  return patterns.some((pattern) => pattern.test(prompt));
}

function buildRuleMatch({
  questionTypeId,
  baseConfidence,
  variantTags = [],
  skeletonSteps = [],
  difficultyBand = 'medium',
  signalKeys = [],
  familyId,
}) {
  return {
    questionTypeId,
    familyId,
    baseConfidence,
    variantTags,
    skeletonSteps,
    difficultyBand,
    signalKeys,
  };
}

const TOPIC_PATH_CLASSIFICATIONS = Object.freeze({
  '9709.p1.functions': Object.freeze({
    questionTypeId: '9709.functions.core',
    familyId: '9709.functions',
    skeletonSteps: [
      'identify the function definition and restrictions',
      'apply the requested inverse, composite, graph, domain, or range operation',
      'state the result with any required domain or parameter constraint',
    ],
  }),
  '9709.p1.circular_measure': Object.freeze({
    questionTypeId: '9709.circular_measure.arc_sector',
    familyId: '9709.circular_measure',
    skeletonSteps: [
      'translate the diagram into radii, arcs, sectors, and angles in radians',
      'apply sector, arc length, triangle, or segment formulae',
      'combine lengths or areas and round only at the requested stage',
    ],
  }),
  '9709.p1.differentiation': Object.freeze({
    questionTypeId: '9709.differentiation.application',
    familyId: '9709.differentiation',
    skeletonSteps: [
      'differentiate the relevant expression',
      'use the derivative condition for gradients, tangents, normals, stationary points, or optimisation',
      'interpret the result in the context of the question',
    ],
  }),
  '9709.p3.differentiation': Object.freeze({
    questionTypeId: '9709.differentiation.application',
    familyId: '9709.differentiation',
    skeletonSteps: [
      'differentiate using the appropriate A Level technique',
      'use the derivative condition required by the model or curve',
      'interpret the result and state any requested exact or numerical value',
    ],
  }),
  '9709.p1.series': Object.freeze({
    questionTypeId: '9709.series.sequence_binomial',
    familyId: '9709.series',
    skeletonSteps: [
      'identify whether the structure is a progression, series sum, or binomial expansion',
      'apply the matching formula or coefficient extraction',
      'solve for the requested term, coefficient, constant, or sum',
    ],
  }),
  '9709.p3.series': Object.freeze({
    questionTypeId: '9709.series.sequence_binomial',
    familyId: '9709.series',
    skeletonSteps: [
      'identify the progression, series, or expansion structure',
      'apply the relevant A Level series or binomial method',
      'simplify the requested exact or numerical result',
    ],
  }),
  '9709.p1.coordinate_geometry': Object.freeze({
    questionTypeId: '9709.coordinate_geometry.lines_curves',
    familyId: '9709.coordinate_geometry',
    skeletonSteps: [
      'extract the line, curve, circle, midpoint, distance, or gradient conditions',
      'form the required coordinate geometry equations',
      'solve and state coordinates, equations, or geometric measures',
    ],
  }),
  '9709.p3.coordinate_geometry': Object.freeze({
    questionTypeId: '9709.coordinate_geometry.lines_curves',
    familyId: '9709.coordinate_geometry',
    skeletonSteps: [
      'extract the coordinate geometry constraints',
      'combine line, curve, circle, or tangent conditions algebraically',
      'solve and interpret the requested geometry result',
    ],
  }),
  '9709.p1.quadratics': Object.freeze({
    questionTypeId: '9709.quadratics.equations_inequalities',
    familyId: '9709.quadratics',
    skeletonSteps: [
      'rewrite the expression into a quadratic or reducible quadratic form',
      'apply factorisation, discriminant, completing square, or substitution',
      'state the allowed values or exact solutions',
    ],
  }),
  '9709.p1.trigonometry': Object.freeze({
    questionTypeId: '9709.trigonometry.general',
    familyId: '9709.trigonometry_manipulation_equations',
    skeletonSteps: [
      'identify the trigonometric structure, identity, graph, or equation',
      'apply the relevant transformation, identity, or domain reasoning',
      'state the requested values, graph features, or solutions',
    ],
  }),
  '9709.p3.trigonometry': Object.freeze({
    questionTypeId: '9709.trigonometry.general',
    familyId: '9709.trigonometry_manipulation_equations',
    skeletonSteps: [
      'identify the A Level trigonometric structure',
      'apply identities, transformations, or equation-solving in the required domain',
      'state exact values or all required solutions',
    ],
  }),
  '9709.p1.integration': Object.freeze({
    questionTypeId: '9709.integration.application',
    familyId: '9709.integration_techniques',
    skeletonSteps: [
      'identify the integrand or geometric integration setup',
      'integrate using the appropriate method or area formula',
      'apply bounds or context and simplify the result',
    ],
  }),
  '9709.p3.integration': Object.freeze({
    questionTypeId: '9709.integration.application',
    familyId: '9709.integration_techniques',
    skeletonSteps: [
      'identify the integration technique or application',
      'set up and evaluate the integral, including bounds where required',
      'simplify the exact or numerical result',
    ],
  }),
  '9709.p3.complex_numbers': Object.freeze({
    questionTypeId: '9709.complex_numbers.argand_mod_arg',
    familyId: '9709.complex_numbers',
    skeletonSteps: [
      'translate the complex-number condition into Cartesian, modulus-argument, or Argand form',
      'apply the required algebra or locus geometry',
      'state the requested value, region, argument, modulus, or sketch feature',
    ],
  }),
  '9709.p3.vectors': Object.freeze({
    questionTypeId: '9709.vectors.geometry',
    familyId: '9709.vectors',
    skeletonSteps: [
      'write the points, lines, or planes in vector form',
      'use vector operations such as scalar product, parameter comparison, or geometry formulae',
      'interpret the result as an angle, length, area, volume, intersection, or proof',
    ],
  }),
  '9709.p2.algebra': Object.freeze({
    questionTypeId: '9709.algebra.polynomial_rational',
    familyId: '9709.algebra',
    skeletonSteps: [
      'identify the polynomial, rational expression, inequality, or partial fraction structure',
      'apply the relevant algebraic manipulation or theorem',
      'solve for constants, factors, remainders, coefficients, or inequalities',
    ],
  }),
  '9709.p2.logarithmic_and_exponential_functions': Object.freeze({
    questionTypeId: '9709.log_exp.equations_models',
    familyId: '9709.logarithmic_and_exponential_functions',
    skeletonSteps: [
      'rewrite the logarithmic or exponential relationship using laws of logs or indices',
      'solve the equation or linearised model condition',
      'state the requested value, expression, or straight-line form',
    ],
  }),
  '9709.p2.trigonometry': Object.freeze({
    questionTypeId: '9709.trigonometry.general',
    familyId: '9709.trigonometry_manipulation_equations',
    skeletonSteps: [
      'identify the A Level trigonometric structure',
      'apply identities, transformations, or equation-solving in the required domain',
      'state exact values or all required solutions',
    ],
  }),
  '9709.p2.differentiation': Object.freeze({
    questionTypeId: '9709.differentiation.application',
    familyId: '9709.differentiation',
    skeletonSteps: [
      'differentiate using the appropriate A Level technique',
      'use the derivative condition required by the model or curve',
      'interpret the result and state any requested exact or numerical value',
    ],
  }),
  '9709.p2.integration': Object.freeze({
    questionTypeId: '9709.integration.application',
    familyId: '9709.integration_techniques',
    skeletonSteps: [
      'identify the integration technique or application',
      'set up and evaluate the integral, including bounds where required',
      'simplify the exact or numerical result',
    ],
  }),
  '9709.p2.numerical_solution_of_equations': Object.freeze({
    questionTypeId: '9709.numerical_methods.iteration',
    familyId: '9709.numerical_solution_of_equations',
    skeletonSteps: [
      'identify the numerical method, iteration, or interval argument',
      'apply the formula or sign-change reasoning to the required accuracy',
      'state the root, iteration result, or convergence conclusion',
    ],
  }),
  '9709.p3.algebra': Object.freeze({
    questionTypeId: '9709.algebra.polynomial_rational',
    familyId: '9709.algebra',
    skeletonSteps: [
      'identify the polynomial, rational expression, inequality, or partial fraction structure',
      'apply the relevant algebraic manipulation or theorem',
      'solve for constants, factors, remainders, coefficients, or inequalities',
    ],
  }),
  '9709.p3.logarithmic_and_exponential_functions': Object.freeze({
    questionTypeId: '9709.log_exp.equations_models',
    familyId: '9709.logarithmic_and_exponential_functions',
    skeletonSteps: [
      'rewrite the logarithmic or exponential relationship using laws of logs or indices',
      'solve the equation or linearised model condition',
      'state the requested value, expression, or straight-line form',
    ],
  }),
  '9709.p3.numerical_solution_of_equations': Object.freeze({
    questionTypeId: '9709.numerical_methods.iteration',
    familyId: '9709.numerical_solution_of_equations',
    skeletonSteps: [
      'identify the numerical method, iteration, or interval argument',
      'apply the formula or sign-change reasoning to the required accuracy',
      'state the root, iteration result, or convergence conclusion',
    ],
  }),
  '9709.p4.forces_and_equilibrium': Object.freeze({
    questionTypeId: '9709.mechanics.forces_equilibrium',
    familyId: '9709.mechanics',
    skeletonSteps: [
      'identify the forces acting and choose resolving directions',
      'apply equilibrium, resultant, normal reaction, or limiting-friction relationships',
      'solve for the requested force, coefficient, angle, or direction',
    ],
  }),
  '9709.p4.kinematics_of_motion_in_a_straight_line': Object.freeze({
    questionTypeId: '9709.mechanics.kinematics_straight_line',
    familyId: '9709.mechanics',
    skeletonSteps: [
      'extract the displacement, velocity, acceleration, or graph information',
      'apply constant-acceleration formulae or calculus with respect to time',
      'state the requested time, speed, displacement, distance, or graph feature',
    ],
  }),
  '9709.p4.momentum': Object.freeze({
    questionTypeId: '9709.mechanics.momentum',
    familyId: '9709.mechanics',
    skeletonSteps: [
      'identify the particles, masses, directions, and collision model',
      'apply conservation of linear momentum in one dimension',
      'use the post-collision motion information to find the requested speed, time, or distance',
    ],
  }),
  '9709.p4.newtons_laws_of_motion': Object.freeze({
    questionTypeId: '9709.mechanics.newtons_laws',
    familyId: '9709.mechanics',
    skeletonSteps: [
      'draw or infer the force balance for each particle or body',
      'apply Newton\'s laws along the line of motion, including tension, thrust, friction, or weight components',
      'solve for acceleration, tension, force, speed, or time as required',
    ],
  }),
  '9709.p4.energy_work_and_power': Object.freeze({
    questionTypeId: '9709.mechanics.energy_work_power',
    familyId: '9709.mechanics',
    skeletonSteps: [
      'identify kinetic energy, gravitational potential energy, work done, resistance, or power relationships',
      'apply the work-energy principle or power-force-velocity relationship',
      'solve for the requested speed, work, power, distance, or height',
    ],
  }),
  '9709.p5.representation_of_data': Object.freeze({
    questionTypeId: '9709.statistics.representation_of_data',
    familyId: '9709.statistics',
    skeletonSteps: [
      'identify the statistical representation, grouped data, graph, or summary measure required',
      'read, draw, or calculate using the given table, graph, or coded totals',
      'state the requested estimate, graph feature, mean, variance, or comparison',
    ],
  }),
  '9709.p5.permutations_and_combinations': Object.freeze({
    questionTypeId: '9709.statistics.permutations_combinations',
    familyId: '9709.statistics',
    skeletonSteps: [
      'identify the selection or arrangement restrictions',
      'apply combinations, permutations, repeated-object arrangements, or case splits',
      'combine cases and state the requested number of ways',
    ],
  }),
  '9709.p5.probability': Object.freeze({
    questionTypeId: '9709.statistics.probability',
    familyId: '9709.statistics',
    skeletonSteps: [
      'identify the sample space, tree diagram, event relationship, or conditional structure',
      'apply addition, multiplication, independence, exclusivity, or conditional probability rules',
      'state the requested probability with clear event interpretation',
    ],
  }),
  '9709.p5.discrete_random_variables': Object.freeze({
    questionTypeId: '9709.statistics.discrete_random_variables',
    familyId: '9709.statistics',
    skeletonSteps: [
      'identify the discrete random variable or binomial/geometric distribution',
      'apply the probability, expectation, or variance formula required by the model',
      'state the requested probability or distribution parameter',
    ],
  }),
  '9709.p5.the_normal_distribution': Object.freeze({
    questionTypeId: '9709.statistics.normal_distribution',
    familyId: '9709.statistics',
    skeletonSteps: [
      'identify the normal model or normal approximation and its parameters',
      'standardise using the normal distribution table, applying continuity correction when relevant',
      'state the requested probability, parameter, or approximation result',
    ],
  }),
  '9709.p6.the_poisson_distribution': Object.freeze({
    questionTypeId: '9709.statistics.poisson_distribution',
    familyId: '9709.statistics',
    skeletonSteps: [
      'identify the Poisson model, mean rate, interval scaling, or approximation condition',
      'apply the Poisson probability formula or a valid binomial or normal approximation',
      'state the requested probability, parameter, or approximation result in context',
    ],
  }),
  '9709.p6.linear_combinations_of_random_variables': Object.freeze({
    questionTypeId: '9709.statistics.linear_combinations_random_variables',
    familyId: '9709.statistics',
    skeletonSteps: [
      'identify the independent random variables and the required linear combination',
      'apply expectation, variance, normal-combination, or Poisson-combination results',
      'state the requested distribution, mean, variance, or probability',
    ],
  }),
  '9709.p6.continuous_random_variables': Object.freeze({
    questionTypeId: '9709.statistics.continuous_random_variables',
    familyId: '9709.statistics',
    skeletonSteps: [
      'identify the continuous random variable and probability density function',
      'integrate over the required interval or use density properties to find constants or moments',
      'state the requested probability, median, mean, variance, or distribution condition',
    ],
  }),
  '9709.p6.sampling_and_estimation': Object.freeze({
    questionTypeId: '9709.statistics.sampling_estimation',
    familyId: '9709.statistics',
    skeletonSteps: [
      'identify the sample statistic, population parameter, or sampling distribution',
      'apply unbiased-estimator, central-limit-theorem, or confidence-interval reasoning',
      'state the requested estimate, interval, probability, or interpretation',
    ],
  }),
  '9709.p6.hypothesis_tests': Object.freeze({
    questionTypeId: '9709.statistics.hypothesis_tests',
    familyId: '9709.statistics',
    skeletonSteps: [
      'state the null and alternative hypotheses and choose the appropriate test statistic',
      'calculate the critical region, p-value, or comparison probability at the significance level',
      'draw and interpret the conclusion in the context of the question',
    ],
  }),
  '9709.p3.differential_equations': Object.freeze({
    questionTypeId: '9709.differential_equations.separable',
    familyId: '9709.differential_equations',
    skeletonSteps: [
      'form or identify the separable differential equation',
      'separate variables and integrate',
      'apply conditions and interpret the model result',
    ],
  }),
});

function buildRuleMatchFromTopicClassification({
  topicPath,
  classification,
  baseConfidence = 0.86,
  signalKeys = [],
  difficultyBand = 'medium',
}) {
  return buildRuleMatch({
    questionTypeId: classification.questionTypeId,
    familyId: classification.familyId,
    baseConfidence,
    variantTags: unique([
      topicPath?.includes('.p1.') ? 'paper:p1' : null,
      topicPath?.includes('.p2.') ? 'paper:p2' : null,
      topicPath?.includes('.p3.') ? 'paper:p3' : null,
      topicPath?.includes('.p4.') ? 'paper:p4' : null,
      topicPath?.includes('.p5.') ? 'paper:p5' : null,
      `topic_path:${topicPath}`,
    ]),
    skeletonSteps: classification.skeletonSteps,
    difficultyBand,
    signalKeys: unique(signalKeys),
  });
}

const QUESTION_TYPE_RULES = Object.freeze([
  {
    questionTypeId: '9709.differential_equations.separable',
    familyId: '9709.differential_equations',
    matches(prompt) {
      const signals = [];
      const hasDifferentialNotation = /dy\s*\/\s*dx/u.test(prompt);
      const explicitDifferentialEquation = /differential equation/u.test(prompt);
      const solveDifferentialNotation = (
        /\b(?:solve|solution|satisfies)\b.{0,80}dy\s*\/\s*dx/u.test(prompt)
        || /dy\s*\/\s*dx.{0,80}\b(?:solve|solution)\b/u.test(prompt)
      );
      const rateModel = /(?:rate .* proportional|varies .* with|is proportional to)/u.test(prompt);

      if (explicitDifferentialEquation || solveDifferentialNotation || rateModel) {
        signals.push('differential_equation');
      }
      if (/given that\s+y\s*=|when\s+x\s*=/u.test(prompt)) {
        signals.push('initial_condition');
      }
      if (/separable/u.test(prompt)) {
        signals.push('explicit_separable');
      }

      if (!signals.includes('differential_equation') && !(hasDifferentialNotation && signals.includes('explicit_separable'))) {
        return null;
      }

      return buildRuleMatch({
        questionTypeId: '9709.differential_equations.separable',
        familyId: '9709.differential_equations',
        baseConfidence: signals.includes('differential_equation') ? 0.91 : 0.84,
        variantTags: unique([
          'paper:p3',
          'answer_form:exact',
          'structure:separable',
          signals.includes('initial_condition') ? 'condition:initial_value' : null,
        ]),
        skeletonSteps: unique([
          'separate the variables',
          'integrate both sides',
          signals.includes('initial_condition') ? 'apply the initial condition' : null,
          'state the exact solution',
        ]),
        difficultyBand: signals.includes('initial_condition') ? 'medium' : 'low',
        signalKeys: signals,
      });
    },
  },
  {
    topicPath: '9709.p3.complex_numbers',
    matches(prompt) {
      if (!hasAny(prompt, [
        /complex number/u,
        /argand/u,
        /\barg\s*z\b/u,
        /\barg\s*[a-z]/u,
        /\bmodulus\b/u,
        /\blocus\b/u,
        /\|z\s*[-+]/u,
      ])) {
        return null;
      }

      return buildRuleMatchFromTopicClassification({
        topicPath: this.topicPath,
        classification: TOPIC_PATH_CLASSIFICATIONS[this.topicPath],
        baseConfidence: 0.91,
        signalKeys: ['complex_number'],
      });
    },
  },
  {
    topicPath: '9709.p3.vectors',
    matches(prompt) {
      if (!hasAny(prompt, [
        /position vectors?/u,
        /vectors?/u,
        /scalar product/u,
        /dot product/u,
        /\b(?:i|j|k)\s*[+-]\s*(?:i|j|k)\b/u,
        /pyramid/u,
        /volume of (?:the )?(?:tetrahedron|pyramid)/u,
      ])) {
        return null;
      }

      return buildRuleMatchFromTopicClassification({
        topicPath: this.topicPath,
        classification: TOPIC_PATH_CLASSIFICATIONS[this.topicPath],
        baseConfidence: 0.9,
        signalKeys: ['vector_geometry'],
      });
    },
  },
  {
    topicPath: '9709.p1.circular_measure',
    matches(prompt) {
      if (!hasAny(prompt, [
        /radians?/u,
        /sector/u,
        /arc/u,
        /segment of a circle/u,
        /semicircle/u,
        /radius/u,
      ])) {
        return null;
      }

      return buildRuleMatchFromTopicClassification({
        topicPath: this.topicPath,
        classification: TOPIC_PATH_CLASSIFICATIONS[this.topicPath],
        baseConfidence: 0.89,
        signalKeys: ['circular_measure'],
      });
    },
  },
  {
    topicPath: '9709.p1.series',
    matches(prompt) {
      if (!hasAny(prompt, [
        /arithmetic progression/u,
        /geometric progression/u,
        /sum to infinity/u,
        /sum of the first/u,
        /binomial expansion/u,
        /coefficient of x/u,
        /\bterm\b.*\bprogression\b/u,
      ])) {
        return null;
      }

      return buildRuleMatchFromTopicClassification({
        topicPath: this.topicPath,
        classification: TOPIC_PATH_CLASSIFICATIONS[this.topicPath],
        baseConfidence: 0.89,
        signalKeys: ['series_or_binomial'],
      });
    },
  },
  {
    topicPath: '9709.p1.functions',
    matches(prompt) {
      if (!hasAny(prompt, [
        /function f/u,
        /functions? f and g/u,
        /one-one function/u,
        /composite function/u,
        /\bf-?1\b/u,
        /inverse function/u,
        /domain of/u,
        /range of/u,
        /transformations?/u,
      ])) {
        return null;
      }

      return buildRuleMatchFromTopicClassification({
        topicPath: this.topicPath,
        classification: TOPIC_PATH_CLASSIFICATIONS[this.topicPath],
        baseConfidence: 0.88,
        signalKeys: ['functions'],
      });
    },
  },
  {
    topicPath: '9709.p1.coordinate_geometry',
    matches(prompt) {
      if (!hasAny(prompt, [
        /line has equation/u,
        /curve has equation/u,
        /coordinates? of/u,
        /gradient/u,
        /mid-?point/u,
        /perpendicular/u,
        /intersects? the .*axes/u,
        /circle has equation/u,
      ])) {
        return null;
      }

      return buildRuleMatchFromTopicClassification({
        topicPath: this.topicPath,
        classification: TOPIC_PATH_CLASSIFICATIONS[this.topicPath],
        baseConfidence: 0.88,
        signalKeys: ['coordinate_geometry'],
      });
    },
  },
  {
    topicPath: '9709.p3.logarithmic_and_exponential_functions',
    matches(prompt) {
      if (!hasAny(prompt, [
        /\bln\s*\(/u,
        /\blog/u,
        /\be\^/u,
        /exponential/u,
        /a\^\{/u,
        /straight line/u,
      ])) {
        return null;
      }

      return buildRuleMatchFromTopicClassification({
        topicPath: this.topicPath,
        classification: TOPIC_PATH_CLASSIFICATIONS[this.topicPath],
        baseConfidence: 0.88,
        signalKeys: ['log_exp'],
      });
    },
  },
  {
    topicPath: '9709.p1.differentiation',
    matches(prompt) {
      if (!hasAny(prompt, [
        /differentiat/u,
        /stationary point/u,
        /maximum|minimum/u,
        /increasing function|decreasing function/u,
        /rate of change/u,
        /tangent|normal/u,
        /\bf'\s*\(/u,
      ])) {
        return null;
      }

      return buildRuleMatchFromTopicClassification({
        topicPath: this.topicPath,
        classification: TOPIC_PATH_CLASSIFICATIONS[this.topicPath],
        baseConfidence: 0.87,
        signalKeys: ['differentiation_application'],
      });
    },
  },
  {
    topicPath: '9709.p3.algebra',
    matches(prompt) {
      if (!hasAny(prompt, [
        /partial fractions?/u,
        /polynomial/u,
        /quotient and remainder/u,
        /factor theorem/u,
        /divisible by/u,
        /inequalit/u,
        /rational expression/u,
      ])) {
        return null;
      }

      return buildRuleMatchFromTopicClassification({
        topicPath: this.topicPath,
        classification: TOPIC_PATH_CLASSIFICATIONS[this.topicPath],
        baseConfidence: 0.87,
        signalKeys: ['algebra_structure'],
      });
    },
  },
  {
    topicPath: '9709.p1.quadratics',
    matches(prompt) {
      if (!hasAny(prompt, [
        /quadratic/u,
        /discriminant/u,
        /completing the square/u,
        /for all values of x/u,
        /set of possible values/u,
        /x\^2/u,
        /x²/u,
      ])) {
        return null;
      }

      return buildRuleMatchFromTopicClassification({
        topicPath: this.topicPath,
        classification: TOPIC_PATH_CLASSIFICATIONS[this.topicPath],
        baseConfidence: 0.86,
        signalKeys: ['quadratic_structure'],
      });
    },
  },
  {
    topicPath: '9709.p3.numerical_solution_of_equations',
    matches(prompt) {
      if (!hasAny(prompt, [
        /iterative formula/u,
        /newton-?raphson/u,
        /change of sign/u,
        /root .* interval/u,
        /correct to .* decimal places/u,
      ])) {
        return null;
      }

      return buildRuleMatchFromTopicClassification({
        topicPath: this.topicPath,
        classification: TOPIC_PATH_CLASSIFICATIONS[this.topicPath],
        baseConfidence: 0.86,
        signalKeys: ['numerical_method'],
      });
    },
  },
  {
    questionTypeId: '9709.trigonometry.identities',
    familyId: '9709.trigonometry_manipulation_equations',
    matches(prompt) {
      const hasTrig = hasTrigToken(prompt);
      const isIdentity = /(prove|show that|hence show|identity)/u.test(prompt);
      if (!hasTrig || !isIdentity) {
        return null;
      }

      return buildRuleMatch({
        questionTypeId: '9709.trigonometry.identities',
        familyId: '9709.trigonometry_manipulation_equations',
        baseConfidence: 0.93,
        variantTags: ['paper:p1', 'answer_form:exact', 'structure:identity_rewrite'],
        skeletonSteps: [
          'rewrite the trigonometric expression into a common form',
          'apply a standard identity consistently',
          'simplify to the target identity',
        ],
        difficultyBand: 'medium',
        signalKeys: ['trigonometric_identity'],
      });
    },
  },
  {
    questionTypeId: '9709.trigonometry.equations',
    familyId: '9709.trigonometry_manipulation_equations',
    matches(prompt) {
      const hasTrig = hasTrigToken(prompt);
      const isEquation = /(solve|find all values of x|0\s*[<≤]=?\s*x|x\s*[<≤]=?\s*360)/u.test(prompt);
      if (!hasTrig || !isEquation) {
        return null;
      }

      return buildRuleMatch({
        questionTypeId: '9709.trigonometry.equations',
        familyId: '9709.trigonometry_manipulation_equations',
        baseConfidence: 0.9,
        variantTags: ['paper:p1', 'answer_form:interval', 'structure:solve_in_domain'],
        skeletonSteps: [
          'isolate the trigonometric term',
          'solve the base trigonometric equation',
          'enumerate solutions in the required domain',
        ],
        difficultyBand: 'medium',
        signalKeys: ['trigonometric_equation'],
      });
    },
  },
  {
    questionTypeId: '9709.integration.application',
    familyId: '9709.integration_techniques',
    matches(prompt) {
      const hasIntegral = /(integral|∫|dx\b)/u.test(prompt);
      if (!hasIntegral) {
        return null;
      }

      const applicationSignals = [];
      if (/(find the value of|find .*exact value|exact value|evaluate|hence|area|volume|curve)/u.test(prompt)) {
        applicationSignals.push('application_language');
      }
      if (/\(.*\)\^/u.test(prompt) || /\bsubstitut/u.test(prompt)) {
        applicationSignals.push('structured_substitution');
      }

      return buildRuleMatch({
        questionTypeId: '9709.integration.application',
        familyId: '9709.integration_techniques',
        baseConfidence: applicationSignals.length >= 2 ? 0.9 : 0.77,
        variantTags: ['paper:p3', 'answer_form:exact'],
        skeletonSteps: [
          'identify the integration structure',
          'apply the matching substitution or application setup',
          'integrate and simplify the exact result',
        ],
        difficultyBand: applicationSignals.length >= 2 ? 'medium' : 'high',
        signalKeys: ['integral_expression', ...applicationSignals],
      });
    },
  },
]);

function normalizeAnalysisHints(hints = {}) {
  const normalizedHints = hints && typeof hints === 'object' && !Array.isArray(hints)
    ? hints
    : {};

  return {
    runtime_context_id: normalizeString(normalizedHints.runtime_context_id),
    question_type_hint_id: normalizeString(normalizedHints.question_type_hint_id),
    topic_path_hint: normalizeString(normalizedHints.topic_path_hint),
  };
}

function toConfidenceBand(classificationConfidence) {
  if (classificationConfidence === null || classificationConfidence === undefined) {
    return null;
  }

  if (classificationConfidence < 0.8) {
    return 'low';
  }

  if (classificationConfidence < 0.85) {
    return 'medium';
  }

  return 'high';
}

function buildClassificationFromMatch(match, {
  normalizedHints,
  envelope,
  hintMatched,
  hintConflict,
} = {}) {
  const classificationConfidence = hintMatched
    ? Math.min(0.95, Number((match.baseConfidence + 0.05).toFixed(2)))
    : match.baseConfidence;
  const confidenceBand = toConfidenceBand(classificationConfidence);

  return {
    primary_topic_id: null,
    secondary_topic_ids: [],
    prerequisite_topic_ids: [],
    family_id: match.familyId,
    primary_question_type_id: match.questionTypeId,
    secondary_question_type_ids: [],
    variant_tags: match.variantTags,
    classification_source: 'question_intelligence',
    classification_confidence: classificationConfidence,
    confidence_band: confidenceBand,
    canonical_step_skeleton_summary: {
      summary: match.skeletonSteps[0] ?? 'classify and solve via the canonical method',
      steps: match.skeletonSteps,
    },
    difficulty_signal: {
      band: match.difficultyBand,
      source: 'heuristic_question_intelligence',
      supporting_signals: match.signalKeys,
    },
    analysis_audit_metadata: {
      analysis_mode: 'question_intelligence',
      analysis_hints: normalizedHints,
      hint_matched: hintMatched,
      hint_conflict: hintConflict,
      detector_signals: match.signalKeys,
      source_kind: envelope?.source_kind ?? null,
    },
    analysis_version: 'phase_a.v2',
    evidence_source_event_ref: null,
    analysis_provenance_kind: null,
    uncertainty_validated: true,
    uncertainty_posture: {
      status: 'validated',
      source: 'question_intelligence',
      rationale: 'phase_a_deterministic_import_classifier',
    },
  };
}

function buildTopicPathHintClassification(normalizedHints, envelope) {
  const topicPath = normalizedHints.topic_path_hint;
  const topicClassification = TOPIC_PATH_CLASSIFICATIONS[topicPath] ?? null;
  if (!topicClassification) {
    return null;
  }

  const topicMatch = buildRuleMatchFromTopicClassification({
    topicPath,
    classification: topicClassification,
    baseConfidence: 0.84,
    signalKeys: ['topic_path_hint'],
  });

  return buildClassificationFromMatch(topicMatch, {
    normalizedHints,
    envelope,
    hintMatched: false,
    hintConflict: false,
  });
}

function buildHintOnlyClassification(normalizedHints, envelope) {
  const questionTypeId = normalizedHints.question_type_hint_id || normalizedHints.runtime_context_id;
  if (!questionTypeId) {
    const topicPathClassification = buildTopicPathHintClassification(normalizedHints, envelope);
    if (topicPathClassification) {
      return topicPathClassification;
    }

    return {
      primary_topic_id: null,
      secondary_topic_ids: [],
      prerequisite_topic_ids: [],
      family_id: null,
      primary_question_type_id: null,
      secondary_question_type_ids: [],
      variant_tags: [],
      classification_source: 'question_intelligence',
      classification_confidence: null,
      confidence_band: null,
      canonical_step_skeleton_summary: null,
      difficulty_signal: {
        band: 'unknown',
        source: 'heuristic_question_intelligence',
        supporting_signals: [],
      },
      analysis_audit_metadata: {
        analysis_mode: 'question_intelligence',
        analysis_hints: normalizedHints,
        detector_signals: [],
        source_kind: envelope?.source_kind ?? null,
      },
      analysis_version: 'phase_a.v2',
      evidence_source_event_ref: null,
      analysis_provenance_kind: null,
      uncertainty_validated: false,
      uncertainty_posture: null,
    };
  }

  const fallbackFamilyByQuestionType = {
    '9709.trigonometry.identities': '9709.trigonometry_manipulation_equations',
    '9709.trigonometry.equations': '9709.trigonometry_manipulation_equations',
    '9709.integration.application': '9709.integration_techniques',
    '9709.differential_equations.separable': '9709.differential_equations',
    '9709.functions.core': '9709.functions',
    '9709.circular_measure.arc_sector': '9709.circular_measure',
    '9709.differentiation.application': '9709.differentiation',
    '9709.series.sequence_binomial': '9709.series',
    '9709.coordinate_geometry.lines_curves': '9709.coordinate_geometry',
    '9709.quadratics.equations_inequalities': '9709.quadratics',
    '9709.complex_numbers.argand_mod_arg': '9709.complex_numbers',
    '9709.vectors.geometry': '9709.vectors',
    '9709.algebra.polynomial_rational': '9709.algebra',
    '9709.log_exp.equations_models': '9709.logarithmic_and_exponential_functions',
    '9709.numerical_methods.iteration': '9709.numerical_solution_of_equations',
    '9709.mechanics.forces_equilibrium': '9709.mechanics',
    '9709.mechanics.kinematics_straight_line': '9709.mechanics',
    '9709.mechanics.momentum': '9709.mechanics',
    '9709.mechanics.newtons_laws': '9709.mechanics',
    '9709.mechanics.energy_work_power': '9709.mechanics',
    '9709.statistics.representation_of_data': '9709.statistics',
    '9709.statistics.permutations_combinations': '9709.statistics',
    '9709.statistics.probability': '9709.statistics',
    '9709.statistics.discrete_random_variables': '9709.statistics',
    '9709.statistics.normal_distribution': '9709.statistics',
    '9709.statistics.poisson_distribution': '9709.statistics',
    '9709.statistics.linear_combinations_random_variables': '9709.statistics',
    '9709.statistics.continuous_random_variables': '9709.statistics',
    '9709.statistics.sampling_estimation': '9709.statistics',
    '9709.statistics.hypothesis_tests': '9709.statistics',
  };

  return {
    primary_topic_id: null,
    secondary_topic_ids: [],
    prerequisite_topic_ids: [],
    family_id: fallbackFamilyByQuestionType[questionTypeId] ?? null,
    primary_question_type_id: questionTypeId,
    secondary_question_type_ids: [],
    variant_tags: [],
    classification_source: 'question_intelligence',
    classification_confidence: 0.76,
    confidence_band: 'low',
    canonical_step_skeleton_summary: null,
    difficulty_signal: {
      band: 'unknown',
      source: 'heuristic_question_intelligence',
      supporting_signals: ['hint_only_low_confidence'],
    },
    analysis_audit_metadata: {
      analysis_mode: 'question_intelligence',
      analysis_hints: normalizedHints,
      detector_signals: ['hint_only_low_confidence'],
      source_kind: envelope?.source_kind ?? null,
    },
    analysis_version: 'phase_a.v2',
    evidence_source_event_ref: null,
    analysis_provenance_kind: null,
    uncertainty_validated: true,
    uncertainty_posture: {
      status: 'validated',
      source: 'question_intelligence',
      rationale: 'low_confidence_hint_only_classification',
    },
  };
}

export function analyzeQuestionEnvelope({
  envelope,
  analysisHints = null,
} = {}) {
  const promptValue = normalizeLowerString(envelope?.prompt_representation?.value);
  const normalizedHints = normalizeAnalysisHints(analysisHints);
  const matches = QUESTION_TYPE_RULES
    .map((rule) => rule.matches(promptValue))
    .filter(Boolean)
    .sort((left, right) => right.baseConfidence - left.baseConfidence);

  if (matches.length === 0) {
    return buildHintOnlyClassification(normalizedHints, envelope);
  }

  const topicClassification = TOPIC_PATH_CLASSIFICATIONS[normalizedHints.topic_path_hint] ?? null;
  const selectedMatch = topicClassification
    ? (
      matches.find((match) => (
        match.questionTypeId === topicClassification.questionTypeId
        || match.familyId === topicClassification.familyId
      ))
      ?? null
    )
    : matches[0];

  if (!selectedMatch) {
    return buildTopicPathHintClassification(normalizedHints, envelope);
  }

  const hintedQuestionTypeId = normalizedHints.question_type_hint_id || normalizedHints.runtime_context_id;
  const hintMatched = Boolean(hintedQuestionTypeId) && hintedQuestionTypeId === selectedMatch.questionTypeId;
  const hintConflict = Boolean(hintedQuestionTypeId) && hintedQuestionTypeId !== selectedMatch.questionTypeId;

  return buildClassificationFromMatch(selectedMatch, {
    normalizedHints,
    envelope,
    hintMatched,
    hintConflict,
  });
}
