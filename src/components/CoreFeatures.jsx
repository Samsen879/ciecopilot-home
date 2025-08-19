import React, { memo, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  Camera, 
  BookOpen, 
  TrendingUp, 
  Target, 
  Zap,
  ChevronDown,
  ChevronUp,
  Users,
  Award,
  CheckCircle
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const CoreFeatures = memo(() => {
  const { text } = useTheme();
  const [expandedCard, setExpandedCard] = useState(null);
  
  // Animation variants
  const fadeInUp = useMemo(() => ({
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: "easeOut" }
  }), []);

  const staggerContainer = useMemo(() => ({
    animate: {
      transition: {
        staggerChildren: 0.15
      }
    }
  }), []);

  const expandAnimation = {
    initial: { height: 0, opacity: 0 },
    animate: { height: "auto", opacity: 1 },
    exit: { height: 0, opacity: 0 },
    transition: { duration: 0.3, ease: "easeInOut" }
  };

  // Enhanced features array with detailed content
  const features = useMemo(() => [
    {
      id: 1,
      icon: Bot,
      title: "Intelligent AI Tutor",
      tagline: "Personalized 24/7 AI guidance for A Level",
      details: [
        {
          icon: Target,
          title: "Adaptive Learning",
          description: "Automatically identify and target your weak areas (e.g., Integration by parts, Projectile Motion)."
        },
        {
          icon: Zap,
          title: "24/7 Availability", 
          description: "Real-time Q&A with step-by-step explanations for challenging concepts (e.g., Vectors, Mechanics problems)."
        },
        {
          icon: Award,
          title: "Exam Expert",
          description: "Answers strictly aligned with official CIE syllabus and mark schemes."
        }
      ]
    },
    {
      id: 2,
      icon: Camera,
      title: "Photo Question Recognition",
      tagline: "Instant OCR & AI-powered detailed solutions",
      details: [
        {
          icon: Camera,
          title: "Instant Capture",
          description: "Snap a photo of your problem; instantly identify topics like Complex Numbers, Chemical Equilibrium, or Kinematics."
        },
        {
          icon: CheckCircle,
          title: "Detailed Steps",
          description: "Receive clear, step-by-step solutions, mirroring the official CIE marking scheme."
        },
        {
          icon: Bot,
          title: "AI Insights",
          description: "Additional AI tips help you master tricky exam patterns and common pitfalls."
        }
      ]
    },
    {
      id: 3,
      icon: BookOpen,
      title: "CIE Question Bank",
      tagline: "Thousands of practice questions rigorously aligned with official CIE standards",
      details: [
        {
          icon: BookOpen,
          title: "Syllabus Coverage",
          description: "Complete and structured questions on core topics such as Partial fractions, Binomial Distribution, and Electric Fields."
        },
        {
          icon: CheckCircle,
          title: "Accurate Mark Schemes",
          description: "Each question includes exact marking scheme guidance, maximizing your exam readiness."
        },
        {
          icon: Target,
          title: "Topic-specific Practice",
          description: "Quickly drill down into specific areas like Reaction kinetics or Mechanics to target weaknesses."
        }
      ]
    },
    {
      id: 4,
      icon: TrendingUp,
      title: "Progress Tracking",
      tagline: "Real-time performance analytics and grade forecasting",
      details: [
        {
          icon: TrendingUp,
          title: "Dynamic Tracking",
          description: "Continuously updated graphs showing your improvement trajectory (e.g., C→A, D→B)."
        },
        {
          icon: BookOpen,
          title: "Weekly Reports",
          description: "Automatic reports highlighting areas of strength and weakness, such as differentiation techniques or electromagnetism."
        },
        {
          icon: Target,
          title: "Grade Predictions",
          description: "Predict your grades accurately based on AI analytics, adjusting your revision strategy in real-time."
        }
      ]
    },
    {
      id: 5,
      icon: Target,
      title: "Personalized Recommendations",
      tagline: "Tailored learning pathways aligned with your mastery levels",
      details: [
        {
          icon: Target,
          title: "Customized Study Plans",
          description: "Dynamic revision schedules tailored specifically to your proficiency (weak areas: Electrolysis, Integration techniques, etc.)."
        },
        {
          icon: Zap,
          title: "Focused Topic Reviews",
          description: "AI suggests targeted practice on topics such as Vectors, Probability distributions, or Organic reactions to enhance efficiency."
        },
        {
          icon: TrendingUp,
          title: "Continuous Adaptation",
          description: "Learning plans continuously adapt as your mastery level evolves, maximizing study effectiveness."
        }
      ]
    },
    {
      id: 6,
      icon: Zap,
      title: "Instant Feedback",
      tagline: "Immediate validation and detailed explanations for your answers",
      details: [
        {
          icon: Zap,
          title: "Instant Validation",
          description: "Receive immediate confirmation if your solutions to questions (e.g., Equilibrium problems, Electric circuits, Calculus) are correct."
        },
        {
          icon: Target,
          title: "Error Analysis",
          description: "Instant pinpointing of errors with detailed AI-generated feedback, preventing repeated mistakes."
        },
        {
          icon: BookOpen,
          title: "Step-by-Step Explanations",
          description: "Clear and precise explanations guide you to correct methods aligned with official CIE standards."
        }
      ]
    }
  ], []);

  const toggleCard = (cardId) => {
    setExpandedCard(expandedCard === cardId ? null : cardId);
  };

  return (
    <section id="features" className="py-16 lg:py-24 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6 transition-colors duration-200"
          >
            🔥 Core Features
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="text-xl lg:text-2xl text-gray-700 dark:text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed transition-colors duration-200"
          >
            Professional AI-powered learning solutions designed exclusively for CIE A Level excellence
          </motion.p>
          
          {/* Stats bar */}
          <motion.div
            variants={fadeInUp}
            className="flex flex-wrap justify-center gap-8 mt-8 mb-12"
          >
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Users className="w-5 h-5 text-blue-500" />
              <span className="font-semibold">50K+ Students</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="font-semibold">95% Improvement Rate</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <BookOpen className="w-5 h-5 text-purple-500" />
              <span className="font-semibold">100K+ Questions Solved</span>
            </div>
          </motion.div>
          
          {/* Clean divider */}
          <div className="w-20 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full" />
        </motion.div>

        {/* Enhanced Features Grid */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-50px" }}
          className="grid md:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {features.map((feature) => {
            const IconComponent = feature.icon;
            const isExpanded = expandedCard === feature.id;
            
            return (
              <motion.div
                key={feature.id}
                variants={fadeInUp}
                className="group"
              >
                <div className="bg-white/10 dark:bg-gray-800/20 backdrop-blur-sm border border-white/20 dark:border-gray-700/50 rounded-2xl overflow-hidden
                              shadow-lg hover:shadow-2xl transition-all duration-300 
                              hover:border-blue-200/50 dark:hover:border-blue-600/50
                              hover:-translate-y-1">
                  
                  {/* Card Header - Always Visible */}
                  <div 
                    className="p-6 cursor-pointer"
                    onClick={() => toggleCard(feature.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        {/* Icon */}
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 
                                      rounded-xl flex items-center justify-center flex-shrink-0
                                      group-hover:from-blue-500/30 group-hover:to-purple-500/30
                                      transition-all duration-300">
                          <IconComponent 
                            className="w-6 h-6 text-blue-600 dark:text-blue-400 
                                     group-hover:text-blue-700 dark:group-hover:text-blue-300
                                     group-hover:scale-110 transition-all duration-300" 
                          />
                        </div>
                        
                        {/* Title and Tagline */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1
                                       group-hover:text-blue-700 dark:group-hover:text-blue-300 
                                       transition-colors duration-300">
                            {feature.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                            {feature.tagline}
                          </p>
                        </div>
                      </div>
                      
                      {/* Expand/Collapse Button */}
                      <div className="flex-shrink-0 ml-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 dark:bg-blue-400/10 
                                      flex items-center justify-center
                                      group-hover:bg-blue-500/20 dark:group-hover:bg-blue-400/20
                                      transition-all duration-300">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        {...expandAnimation}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6 pt-0 border-t border-white/10 dark:border-gray-700/50">
                          <div className="space-y-4 mt-4">
                            {feature.details.map((detail, index) => {
                              const DetailIcon = detail.icon;
                              return (
                                <div key={index} className="flex items-start gap-3">
                                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500/10 to-purple-500/10 
                                                rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <DetailIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                      {detail.title}
                                    </h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                      {detail.description}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Hover indicator */}
                  <div className="h-1 bg-gradient-to-r from-blue-500 to-purple-500 
                                transform scale-x-0 group-hover:scale-x-100 
                                transition-transform duration-300 origin-left" />
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Enhanced CTA Section */}
        <motion.div
          variants={fadeInUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.href = '/topics'}
            className="inline-flex items-center gap-3 px-8 py-4 text-lg font-semibold 
                     text-white bg-gradient-to-r from-blue-500 to-purple-600
                     rounded-xl hover:from-blue-600 hover:to-purple-700 
                     shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Zap className="w-5 h-5" />
            🚀 Start Your A* Journey
          </motion.button>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
            Join thousands of students achieving their A Level goals
          </p>
        </motion.div>
      </div>
    </section>
  );
});

CoreFeatures.displayName = 'CoreFeatures';

export default CoreFeatures; 