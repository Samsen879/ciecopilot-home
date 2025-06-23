import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  BookOpen, 
  CheckCircle, 
  Lightbulb, 
  Target, 
  Brain,
  MessageSquare,
  FileQuestion,
  Sparkles,
  Clock,
  Grid,
  List
} from 'lucide-react';
import paper1Data from '../data/9709paper1.json';
import paper3Data from '../data/9709paper3.json';
import paper4Data from '../data/9709paper4.json';
import paper5Data from '../data/9709paper5.json';
import fp1Data from '../data/9231FP1.json';
import fp2Data from '../data/9231FP2.json';
import fmData from '../data/9231FM.json';
import fsData from '../data/9231FS.json';

const TopicDetail = () => {
  const { subject, paper, topicId } = useParams();
  const navigate = useNavigate();
  const [topicData, setTopicData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('cards');

  // Subject name mapping
  const subjectNames = {
    '9709': 'Mathematics',
    '9231': 'Further Mathematics',
    '9702': 'Physics'
  };

  // Paper name mapping
  const paperNames = {
    'p1': 'Pure Mathematics 1',
    'p2': 'Pure Mathematics 2', 
    'p3': 'Pure Mathematics 3',
    'p4': 'Mechanics',
    'p5': 'Statistics 1',
    // Further Mathematics papers
    'fp1': 'Further Pure Mathematics 1',
    'fp2': 'Further Pure Mathematics 2',
    'fm': 'Further Mechanics',
    'fs': 'Further Statistics'
  };

  // Generate key points based on topic
  const generateKeyPoints = (topicName) => {
    const keyPointsMap = {
      // Paper 1 topics
      'Quadratics': [
        "Discriminant Δ = b² - 4ac determines nature of roots",
        "Three methods: factorization, completing square, quadratic formula", 
        "Sum of roots = -b/a, Product of roots = c/a",
        "Vertex form: a(x - h)² + k gives turning point (h, k)"
      ],
      'Functions': [
        "Domain = input values, Range = output values",
        "One-to-one functions have unique inverses",
        "Composite functions: (f ∘ g)(x) = f(g(x))",
        "Graph transformations: translations, reflections, stretches"
      ],
      'Coordinate Geometry': [
        "Parallel lines have equal gradients: m₁ = m₂", 
        "Perpendicular lines: m₁ × m₂ = -1",
        "Circle equation: (x-a)² + (y-b)² = r²",
        "Distance formula: d = √[(x₂-x₁)² + (y₂-y₁)²]"
      ],
      'Circular Measure': [
        "1 radian = 180°/π ≈ 57.3°",
        "Arc length: s = rθ (θ in radians)",
        "Sector area: A = ½r²θ = ½rs",
        "Convert: degrees × π/180 = radians"
      ],
      'Trigonometry': [
        "SOHCAHTOA: sin = opp/hyp, cos = adj/hyp, tan = opp/adj",
        "Special angles: 30°, 45°, 60° - know exact values",
        "Fundamental identity: sin²θ + cos²θ = 1",
        "Period: sin/cos = 360°, tan = 180°"
      ],
      'Series': [
        "Arithmetic: aₙ = a + (n-1)d, Sₙ = n/2[2a + (n-1)d]",
        "Geometric: aₙ = ar^(n-1), Sₙ = a(r^n - 1)/(r - 1)", 
        "Binomial expansion: (a + b)ⁿ = Σ nCr × aⁿ⁻ʳ × bʳ",
        "Sum to infinity: S∞ = a/(1-r) when |r| < 1"
      ],
      'Differentiation': [
        "Power rule: d/dx(xⁿ) = nxⁿ⁻¹",
        "Product rule: d/dx(uv) = u'v + uv'",
        "Chain rule: d/dx[f(g(x))] = f'(g(x)) × g'(x)",
        "Stationary points: f'(x) = 0"
      ],
      'Integration': [
        "Reverse of differentiation: ∫xⁿ dx = x^(n+1)/(n+1) + C",
        "Definite integral gives area under curve",
        "Fundamental theorem: ∫ᵃᵇ f'(x) dx = f(b) - f(a)", 
        "Area between curves: ∫[f(x) - g(x)] dx"
      ],
      
      // Paper 3 topics
      'Algebra': [
        "Modulus |x| represents absolute value or distance from zero",
        "Factor theorem: (x - a) is a factor of f(x) if f(a) = 0",
        "Partial fractions: decompose rational functions into simpler forms",
        "Binomial series: (1 + x)ⁿ = 1 + nx + n(n-1)x²/2! + ... for |x| < 1"
      ],
      'Logarithmic and Exponential Functions': [
        "log laws: log(ab) = log a + log b, log(a/b) = log a - log b",
        "Change of base: log_a(x) = ln(x)/ln(a)",
        "Exponential growth/decay: N = N₀e^(kt)",
        "Natural logarithm: ln(e^x) = x, e^(ln x) = x"
      ],
      'Trigonometry': [
        "Six trig functions: sin, cos, tan, sec, cosec, cot",
        "Addition formulae: sin(A ± B) = sin A cos B ± cos A sin B",
        "Double angle: sin 2A = 2 sin A cos A, cos 2A = cos²A - sin²A",
        "R-formula: a sin θ + b cos θ = R sin(θ + α) where R = √(a² + b²)"
      ],
      'Vectors': [
        "Vector notation: a⃗ = ⟨x, y, z⟩ or a⃗ = xi⃗ + yj⃗ + zk⃗",
        "Scalar product: a⃗·b⃗ = |a⃗||b⃗|cos θ = x₁x₂ + y₁y₂ + z₁z₂",
        "Vector equations of lines: r⃗ = a⃗ + λb⃗",
        "Magnitude: |a⃗| = √(x² + y² + z²)"
      ],
      'Numerical Solution of Equations': [
        "Change of sign indicates root between two values",
        "Iterative formula: xₙ₊₁ = g(xₙ) for solving f(x) = 0",
        "Newton-Raphson: xₙ₊₁ = xₙ - f(xₙ)/f'(xₙ)",
        "Convergence depends on starting value and function behavior"
      ],
      'Differential Equations': [
        "Separable equations: dy/dx = f(x)g(y)",
        "Separate variables: ∫1/g(y) dy = ∫f(x) dx",
        "General solution contains arbitrary constant",
        "Particular solution uses initial conditions"
      ],
      'Complex Numbers': [
        "Complex form: z = x + iy where i² = -1",
        "Modulus: |z| = √(x² + y²), Argument: arg(z) = arctan(y/x)",
        "Polar form: z = r(cos θ + i sin θ) = re^(iθ)",
        "De Moivre's theorem: (cos θ + i sin θ)ⁿ = cos nθ + i sin nθ"
      ],
      
      // Paper 4 topics (Mechanics)
      'Forces and Equilibrium': [
        "Equilibrium: ΣF = 0 (vector sum of forces is zero)",
        "Components: Fx = F cos θ, Fy = F sin θ",
        "Friction: F ≤ μN (static), F = μN (kinetic)",
        "Newton's third law: action and reaction are equal and opposite"
      ],
      'Kinematics of Linear Motion': [
        "Displacement s, velocity v = ds/dt, acceleration a = dv/dt",
        "SUVAT equations: v = u + at, s = ut + ½at², v² = u² + 2as",
        "Motion graphs: gradient of s-t gives v, gradient of v-t gives a",
        "Area under v-t graph gives displacement"
      ],
      'Momentum': [
        "Momentum p = mv (vector quantity)",
        "Conservation: total momentum before = total momentum after",
        "Impulse J = FΔt = Δp (change in momentum)",
        "Coefficient of restitution e = (v₂ - v₁)/(u₁ - u₂)"
      ],
      'Newton\'s Laws of Motion': [
        "First law: object at rest/constant velocity unless acted on by force",
        "Second law: F = ma (net force equals mass times acceleration)",
        "Third law: for every action there is equal and opposite reaction",
        "Weight W = mg, Normal force N acts perpendicular to surface"
      ],
      'Energy, Work, and Power': [
        "Work done W = F·s = Fs cos θ",
        "Kinetic energy KE = ½mv²",
        "Gravitational PE = mgh",
        "Power P = W/t = Fv, Efficiency = useful energy out/total energy in"
      ],
      
      // Paper 5 topics (Statistics)
      'Representation of Data': [
        "Mean = Σx/n, Median = middle value, Mode = most frequent",
        "Standard deviation σ = √[Σ(x - x̄)²/n]",
        "Box plots show quartiles, median, and outliers",
        "Histograms: frequency density = frequency/class width"
      ],
      'Permutations and Combinations': [
        "Permutations ⁿPᵣ = n!/(n-r)! (order matters)",
        "Combinations ⁿCᵣ = n!/[r!(n-r)!] (order doesn't matter)",
        "With restrictions: subtract arrangements that violate conditions",
        "Circular arrangements: (n-1)! ways"
      ],
      'Probability': [
        "P(A) = favorable outcomes/total outcomes, 0 ≤ P(A) ≤ 1",
        "Addition rule: P(A ∪ B) = P(A) + P(B) - P(A ∩ B)",
        "Multiplication rule: P(A ∩ B) = P(A) × P(B|A)",
        "Independence: P(A ∩ B) = P(A) × P(B)"
      ],
      'Discrete Random Variables': [
        "Probability function: P(X = x), Σ P(X = x) = 1",
        "Expectation E(X) = Σ x·P(X = x)",
        "Variance Var(X) = E(X²) - [E(X)]²",
        "Binomial: X ~ B(n,p), Geometric: X ~ Geo(p)"
      ],
      'The Normal Distribution': [
        "Normal distribution X ~ N(μ, σ²) is symmetric about mean μ",
        "Standard normal Z ~ N(0,1), Z = (X - μ)/σ",
        "68-95-99.7 rule: ±1σ, ±2σ, ±3σ from mean",
        "Central limit theorem: sample means approach normal distribution"
      ],
      
      // 9231 Further Mathematics topics
      'Roots of Polynomial Equations': [
        "Sum of roots: α + β + γ = -b/a for cubic ax³ + bx² + cx + d = 0",
        "Product of roots: αβγ = -d/a for cubic equations",
        "Symmetric functions: α² + β² + γ² = (α + β + γ)² - 2(αβ + βγ + γα)",
        "Substitution transformations: y = x + k shifts all roots by -k"
      ],
      'Rational Functions and Graphs': [
        "Vertical asymptotes occur where denominator = 0",
        "Horizontal asymptotes: y = an/bm when degrees equal",
        "Oblique asymptotes: when numerator degree = denominator degree + 1",
        "Graph transformations: y = |f(x)| reflects negative parts upward"
      ],
      'Summation of Series': [
        "Standard results: Σr = n(n+1)/2, Σr² = n(n+1)(2n+1)/6",
        "Method of differences: Σ[f(r+1) - f(r)] = f(n+1) - f(1)",
        "Partial fractions can simplify summation problems",
        "Convergence test: series converges if terms approach zero"
      ],
      'Matrices': [
        "Matrix multiplication: (AB)ij = Σ aik × bkj",
        "Determinant of 2×2: |A| = ad - bc",
        "Inverse exists when determinant ≠ 0 (non-singular)",
        "Geometric transformations: reflection, rotation, enlargement, shear"
      ],
      'Polar Coordinates': [
        "Conversion: x = r cos θ, y = r sin θ",
        "r² = x² + y², θ = arctan(y/x)",
        "Area in polar: A = ½∫r² dθ",
        "Common curves: r = a (circle), r = a cos θ (circle through origin)"
      ],
      'Vectors': [
        "Vector product: a × b = |a||b|sin θ n̂",
        "Scalar triple product: a·(b × c) gives volume of parallelepiped",
        "Plane equation: r·n = d where n is normal vector",
        "Distance from point to plane: |r₀·n - d|/|n|"
      ],
      'Proof by Induction': [
        "Base case: prove P(1) is true",
        "Inductive step: assume P(k) true, prove P(k+1) true",
        "Conclusion: P(n) true for all n ≥ 1",
        "Strong induction: assume P(1), P(2), ..., P(k) all true"
      ],
      'Hyperbolic Functions': [
        "Definitions: sinh x = (eˣ - e⁻ˣ)/2, cosh x = (eˣ + e⁻ˣ)/2",
        "Identity: cosh²x - sinh²x = 1",
        "Derivatives: d/dx(sinh x) = cosh x, d/dx(cosh x) = sinh x",
        "Inverse: sinh⁻¹x = ln(x + √(x² + 1))"
      ],
      'Eigenvalues and Eigenvectors': [
        "Eigenvalue equation: Av = λv where v ≠ 0",
        "Characteristic equation: det(A - λI) = 0",
        "Eigenvectors are non-zero solutions to (A - λI)v = 0",
        "Diagonalization: A = PDP⁻¹ where D contains eigenvalues"
      ],
      'Differential Equations': [
        "First order linear: dy/dx + P(x)y = Q(x)",
        "Integrating factor: μ(x) = e^∫P(x)dx",
        "Second order: ay'' + by' + cy = f(x)",
        "Characteristic equation: am² + bm + c = 0 gives complementary function"
      ],
      'Complex Numbers': [
        "De Moivre's theorem: (cos θ + i sin θ)ⁿ = cos nθ + i sin nθ",
        "nth roots of unity: e^(2πik/n) for k = 0, 1, ..., n-1",
        "Sum of nth roots of unity = 0 (except for n = 1)",
        "Applications: solving polynomial equations, series summation"
      ],
      'Motion of a Projectile': [
        "Horizontal motion: x = u cos α × t (constant velocity)",
        "Vertical motion: y = u sin α × t - ½gt² (constant acceleration)",
        "Range: R = u² sin 2α / g (maximum when α = 45°)",
        "Trajectory equation: y = x tan α - gx²/(2u² cos²α)"
      ],
      'Equilibrium of a Rigid Body': [
        "Equilibrium conditions: ΣF = 0 and ΣM = 0",
        "Moment = force × perpendicular distance from pivot",
        "Centre of mass: point where weight acts",
        "Stability: stable if centre of mass above base of support"
      ],
      'Circular Motion': [
        "Angular velocity: ω = v/r = θ/t",
        "Centripetal acceleration: a = v²/r = ω²r",
        "Centripetal force: F = mv²/r = mω²r",
        "Vertical circles: minimum speed at top = √(gr)"
      ],
      'Hooke\'s Law': [
        "Force law: F = kx (extension proportional to force)",
        "Elastic potential energy: PE = ½kx²",
        "Work done stretching: W = ½Fx = ½kx²",
        "Springs in series: 1/k = 1/k₁ + 1/k₂ + ..."
      ],
      'Linear Motion under a Variable Force': [
        "Newton's second law: F = ma = m(dv/dt) = m(v dv/dx)",
        "Separation of variables for solving F(x) = m(v dv/dx)",
        "Energy methods: work-energy theorem ∫F dx = ΔKE",
        "Oscillatory motion: F = -kx gives simple harmonic motion"
      ],
      'Continuous Random Variables': [
        "Probability density function: P(a < X < b) = ∫ᵃᵇ f(x) dx",
        "Cumulative distribution: F(x) = P(X ≤ x) = ∫₋∞ˣ f(t) dt",
        "Expectation: E(X) = ∫ x f(x) dx",
        "Variance: Var(X) = E(X²) - [E(X)]²"
      ],
      'Inference using Normal and t-Distributions': [
        "t-distribution: used when σ unknown and n small",
        "Degrees of freedom: ν = n - 1 for single sample",
        "Confidence interval: x̄ ± t(α/2) × s/√n",
        "Hypothesis testing: t = (x̄ - μ₀)/(s/√n)"
      ],
      'Chi-Squared Tests': [
        "Test statistic: χ² = Σ(O - E)²/E",
        "Goodness of fit: compare observed vs expected frequencies",
        "Independence test: H₀: variables are independent",
        "Degrees of freedom: (rows - 1)(columns - 1) for contingency tables"
      ],
      'Non-Parametric Tests': [
        "No assumptions about population distribution",
        "Sign test: median testing using binomial distribution",
        "Wilcoxon tests: rank-based alternatives to t-tests",
        "Mann-Whitney U test: comparing two independent samples"
      ],
      'Probability Generating Functions': [
        "Definition: G(t) = E(t^X) = Σ P(X = k) t^k",
        "Mean: E(X) = G'(1)",
        "Variance: Var(X) = G''(1) + G'(1) - [G'(1)]²",
        "Sum of independent variables: G_{X+Y}(t) = G_X(t) × G_Y(t)"
      ]
    };
    
    return keyPointsMap[topicName] || [
      "Study the official syllabus points carefully",
      "Practice with past paper questions", 
      "Understand the underlying concepts",
      "Apply knowledge to solve problems"
    ];
  };

  // Load topic data
  useEffect(() => {
    const loadTopicData = async () => {
      setLoading(true);
      
      // Simulate loading delay for smooth animation
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Handle different papers for 9709 Mathematics and 9231 Further Mathematics
      if (subject === '9709') {
        let topicsArray = null;
        let dataSource = '';
        
        switch (paper) {
          case 'p1':
            topicsArray = paper1Data["9709_Paper_1_Pure_Mathematics_1"];
            dataSource = 'Paper 1 Pure Mathematics 1';
            break;
          case 'p3':
            topicsArray = paper3Data["9709_Paper_3_Pure_Mathematics_3"];
            dataSource = 'Paper 3 Pure Mathematics 3';
            break;
          case 'p4':
            topicsArray = paper4Data["9709_Paper_4_Mechanics"];
            dataSource = 'Paper 4 Mechanics';
            break;
          case 'p5':
            topicsArray = paper5Data["9709_Paper_5_Probability_and_Statistics_1"];
            dataSource = 'Paper 5 Probability and Statistics 1';
            break;
          default:
            setLoading(false);
            return;
        }
        
        if (topicsArray) {
          // Convert topic name to match URL format (lowercase, replace spaces with hyphens)
          const topicToFind = topicsArray.find(t => {
            const normalizedTopicName = t.topic.toLowerCase().replace(/\s+/g, '-');
            return normalizedTopicName === topicId;
          });
          
          if (topicToFind) {
            setTopicData({
              name: topicToFind.topic,
              description: `Master the fundamentals of ${topicToFind.topic} with detailed concept cards and comprehensive syllabus coverage from CIE A Level ${dataSource}.`,
              cards: topicToFind.cards, // 使用新的cards结构
              keyPoints: generateKeyPoints(topicToFind.topic),
              paperName: paperNames[paper] || `Paper ${paper.toUpperCase()}`,
              subjectName: subjectNames[subject] || `Subject ${subject}`,
              subjectCode: subject
            });
          }
        }
      } else if (subject === '9231') {
        let topicsArray = null;
        let dataSource = '';
        
        switch (paper) {
          case 'p1':
            topicsArray = fp1Data["9231_Paper_1_Further_Pure_Mathematics_1"];
            dataSource = 'Paper 1 Further Pure Mathematics 1';
            break;
          case 'p2':
            topicsArray = fp2Data["9231_Paper_2_Further_Pure_Mathematics_2"];
            dataSource = 'Paper 2 Further Pure Mathematics 2';
            break;
          case 'p3':
            topicsArray = fmData["9231_Paper_3_Further_Mechanics"];
            dataSource = 'Paper 3 Further Mechanics';
            break;
          case 'p4':
            topicsArray = fsData["9231_Paper_4_Further_Probability_and_Statistics"];
            dataSource = 'Paper 4 Further Probability and Statistics';
            break;
          default:
            setLoading(false);
            return;
        }
        
        if (topicsArray) {
          // Convert topic name to match URL format (lowercase, replace spaces with hyphens)
          const topicToFind = topicsArray.find(t => {
            const normalizedTopicName = t.topic.toLowerCase().replace(/\s+/g, '-');
            return normalizedTopicName === topicId;
          });
          
          if (topicToFind) {
            setTopicData({
              name: topicToFind.topic,
              description: `Master the fundamentals of ${topicToFind.topic} with detailed concept cards and comprehensive syllabus coverage from CIE A Level ${dataSource}.`,
              cards: topicToFind.cards, // 使用新的cards结构
              keyPoints: generateKeyPoints(topicToFind.topic),
              paperName: paperNames[paper] || `Paper ${paper.toUpperCase()}`,
              subjectName: subjectNames[subject] || `Subject ${subject}`,
              subjectCode: subject
            });
          }
        }
      }
      
      setLoading(false);
    };

    loadTopicData();
  }, [subject, paper, topicId]);

  // Animation variants
  const pageVariants = {
    initial: { 
      opacity: 0, 
      x: 30,
      scale: 0.95
    },
    animate: { 
      opacity: 1, 
      x: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1], // Apple-like easing
        staggerChildren: 0.1
      }
    },
    exit: { 
      opacity: 0, 
      x: -30,
      scale: 0.95,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 1, 1]
      }
    }
  };

  const itemVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1]
      }
    }
  };

  const staggerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  // Navigation handlers
  const handleBack = () => {
    navigate(`/paper/${subject}/${paper}`, {
      state: { from: 'topic-detail' }
    });
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
        <div className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-6 py-4">
            <div className="h-6 bg-gray-200 rounded-lg w-32 animate-pulse"></div>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="space-y-8">
            <div className="h-16 bg-gray-200 rounded-2xl animate-pulse"></div>
            <div className="h-24 bg-gray-200 rounded-2xl animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-40 bg-gray-200 rounded-xl animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!topicData) {
    return (
      <motion.div 
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-center"
      >
        <div className="text-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 mx-auto">
            <BookOpen size={40} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Topic Not Found</h1>
          <p className="text-gray-600 mb-8">The requested topic could not be found.</p>
          <button
            onClick={handleBack}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300"
          >
            <ArrowLeft size={20} />
            <span>Go Back</span>
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20"
      >
        {/* Sticky Header */}
        <motion.div 
          variants={itemVariants}
          className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-gray-100/50"
        >
          <div className="max-w-5xl mx-auto px-6 py-4">
            <button
              onClick={handleBack}
              className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors duration-200 group"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform duration-200" />
              <span className="font-medium">Back to {topicData.paperName}</span>
            </button>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto px-6 py-12">
          <motion.div variants={staggerVariants} className="space-y-12">
            
            {/* Hero Section */}
            <motion.div variants={itemVariants} className="space-y-6">
              {/* Topic Icon and Title */}
              <div className="flex items-start space-x-4">
                <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                  <BookOpen size={32} className="text-white" />
                </div>
                <div className="flex-1">
                  <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2 tracking-tight">
                    {topicData.name}
                  </h1>
                  <p className="text-lg text-blue-600 font-medium">
                    {topicData.subjectName} ({topicData.subjectCode}) · {topicData.paperName}
                  </p>
                </div>
              </div>

              {/* Topic Description */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-sm">
                <p className="text-lg text-gray-700 leading-relaxed">
                  {topicData.description}
                </p>
              </div>
            </motion.div>

            {/* Navigation Tabs */}
            <motion.div variants={itemVariants} className="bg-white/70 backdrop-blur-sm rounded-2xl p-2 border border-white/20">
              <div className="flex space-x-1">
                {[
                  { id: 'cards', label: 'Concept Cards', icon: Grid },
                  { id: 'key-points', label: 'Key Points', icon: Lightbulb },
                  { id: 'practice', label: 'Practice', icon: Target }
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveSection(id)}
                    className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                      activeSection === id
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Content Sections */}
            <AnimatePresence mode="wait">
              {activeSection === 'cards' && (
                <motion.div
                  key="cards"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  variants={staggerVariants}
                  className="space-y-6"
                >
                  <motion.h2 variants={itemVariants} className="text-2xl font-bold text-gray-900 mb-6">
                    Concept Cards ({topicData.cards?.length || 0} cards)
                  </motion.h2>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {topicData.cards?.map((card, cardIndex) => (
                      <motion.div
                        key={cardIndex}
                        variants={itemVariants}
                        className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:shadow-lg transition-all duration-300 group"
                      >
                        {/* Card Header */}
                        <div className="flex items-start space-x-4 mb-4">
                          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl shadow-sm group-hover:scale-110 transition-transform duration-200">
                            <List size={20} className="text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-indigo-700 transition-colors duration-200">
                              {card.title}
                            </h3>
                          </div>
                        </div>

                        {/* Card Details */}
                        <div className="space-y-3">
                          {card.details?.map((detail, detailIndex) => (
                            <div key={detailIndex} className="flex items-start space-x-3">
                              <div className="flex items-center justify-center w-6 h-6 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg shadow-sm mt-0.5 flex-shrink-0">
                                <CheckCircle size={14} className="text-white" />
                              </div>
                              <p className="text-gray-700 leading-relaxed text-sm">
                                {detail}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Card Footer */}
                        <div className="mt-4 pt-4 border-t border-gray-200/50">
                          <span className="text-xs text-gray-500 font-medium">
                            {card.details?.length || 0} syllabus points
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeSection === 'key-points' && (
                <motion.div
                  key="key-points"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  variants={staggerVariants}
                  className="space-y-4"
                >
                  <motion.h2 variants={itemVariants} className="text-2xl font-bold text-gray-900 mb-6">
                    Key Points to Remember
                  </motion.h2>
                  {topicData.keyPoints?.map((point, index) => (
                    <motion.div
                      key={index}
                      variants={itemVariants}
                      className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-6 border border-yellow-200/50 hover:shadow-md transition-all duration-300 group"
                    >
                      <div className="flex items-start space-x-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg shadow-sm group-hover:scale-110 transition-transform duration-200">
                          <Lightbulb size={18} className="text-white" />
                        </div>
                        <p className="text-gray-700 leading-relaxed flex-1">
                          {point}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {activeSection === 'practice' && (
                <motion.div
                  key="practice"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <motion.h2 variants={itemVariants} className="text-2xl font-bold text-gray-900 mb-6">
                    Practice & Learning Tools
                  </motion.h2>
                  
                  {/* Coming Soon Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      {
                        title: 'AI Q&A Assistant',
                        description: 'Ask questions about this topic and get detailed explanations',
                        icon: Brain,
                        color: 'from-purple-400 to-indigo-500',
                        bgColor: 'from-purple-50 to-indigo-50'
                      },
                      {
                        title: 'Practice Questions',
                        description: 'Solve past paper questions with step-by-step solutions',
                        icon: FileQuestion,
                        color: 'from-blue-400 to-cyan-500',
                        bgColor: 'from-blue-50 to-cyan-50'
                      },
                      {
                        title: 'Interactive Examples',
                        description: 'Work through examples with guided assistance',
                        icon: Sparkles,
                        color: 'from-green-400 to-emerald-500',
                        bgColor: 'from-green-50 to-emerald-50'
                      },
                      {
                        title: 'Study Schedule',
                        description: 'Get personalized study recommendations',
                        icon: Clock,
                        color: 'from-orange-400 to-red-500',
                        bgColor: 'from-orange-50 to-red-50'
                      }
                    ].map((tool, index) => (
                      <motion.div
                        key={index}
                        variants={itemVariants}
                        className={`bg-gradient-to-br ${tool.bgColor} rounded-xl p-6 border border-white/20 hover:shadow-lg transition-all duration-300 group cursor-pointer`}
                      >
                        <div className="flex items-start space-x-4">
                          <div className={`flex items-center justify-center w-12 h-12 bg-gradient-to-br ${tool.color} rounded-xl shadow-md group-hover:scale-110 transition-transform duration-200`}>
                            <tool.icon size={24} className="text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900 mb-2">{tool.title}</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">{tool.description}</p>
                            <div className="mt-3 inline-flex items-center text-sm font-medium text-gray-500">
                              <span>Coming Soon</span>
                              <Sparkles size={14} className="ml-1" />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom CTA */}
            <motion.div
              variants={itemVariants}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-center text-white shadow-lg"
            >
              <h3 className="text-2xl font-bold mb-4">Ready to Master {topicData.name}?</h3>
              <p className="text-blue-100 mb-6 leading-relaxed">
                Start practicing with our AI-powered learning system designed specifically for CIE mathematics.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="inline-flex items-center space-x-2 px-8 py-3 bg-white text-blue-600 rounded-xl hover:bg-blue-50 transition-all duration-300 font-semibold shadow-md hover:shadow-lg transform hover:scale-105">
                  <MessageSquare size={20} />
                  <span>Ask AI a Question</span>
                </button>
                <button className="inline-flex items-center space-x-2 px-8 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-400 transition-all duration-300 font-semibold shadow-md hover:shadow-lg transform hover:scale-105">
                  <FileQuestion size={20} />
                  <span>Practice Questions</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TopicDetail; 