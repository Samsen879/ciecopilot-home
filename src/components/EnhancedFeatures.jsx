import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, Camera, BookOpen, TrendingUp, Brain, Zap, 
  ChevronDown, ChevronUp, Clock, Target, BarChart3,
  CheckCircle, Users, BookMarked
} from 'lucide-react';

const EnhancedFeatures = () => {
  const [expandedCard, setExpandedCard] = useState(null);

  // 6大核心功能的专业内容
  const coreFeatures = [
    {
      id: 1,
      icon: Bot,
      title: "Intelligent AI Tutor",
      tagline: "Personalized 24/7 AI guidance for A Level",
      color: "from-blue-500 to-blue-600",
      bgColor: "from-blue-50 to-blue-100",
      details: [
        {
          icon: Target,
          title: "Adaptive Learning",
          description: "Automatically identify and target your weak areas (e.g., Integration by parts, Projectile Motion)."
        },
        {
          icon: Clock,
          title: "24/7 Availability", 
          description: "Real-time Q&A with step-by-step explanations for challenging concepts (e.g., Vectors, Mechanics problems)."
        },
        {
          icon: CheckCircle,
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
      color: "from-sky-500 to-sky-600",
      bgColor: "from-sky-50 to-sky-100",
      details: [
        {
          icon: Camera,
          title: "Instant Capture",
          description: "Snap a photo of your problem; instantly identify topics like Complex Numbers, Chemical Equilibrium, or Kinematics."
        },
        {
          icon: Zap,
          title: "Detailed Steps",
          description: "Receive clear, step-by-step solutions, mirroring the official CIE marking scheme."
        },
        {
          icon: Brain,
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
      color: "from-cyan-500 to-cyan-600",
      bgColor: "from-cyan-50 to-cyan-100",
      details: [
        {
          icon: BookMarked,
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
      color: "from-indigo-500 to-indigo-600",
      bgColor: "from-indigo-50 to-indigo-100",
      details: [
        {
          icon: BarChart3,
          title: "Dynamic Tracking",
          description: "Continuously updated graphs showing your improvement trajectory (e.g., C→A*, D→B)."
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
      icon: Brain,
      title: "Personalized Recommendations",
      tagline: "Tailored learning pathways aligned with your mastery levels",
      color: "from-purple-500 to-purple-600",
      bgColor: "from-purple-50 to-purple-100",
      details: [
        {
          icon: Target,
          title: "Customized Study Plans",
          description: "Dynamic revision schedules tailored specifically to your proficiency (weak areas: Electrolysis, Integration techniques, etc.)."
        },
        {
          icon: Brain,
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
      color: "from-pink-500 to-pink-600",
      bgColor: "from-pink-50 to-pink-100",
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
  ];

  const toggleCard = (cardId) => {
    setExpandedCard(expandedCard === cardId ? null : cardId);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  const expandVariants = {
    collapsed: { height: 0, opacity: 0 },
    expanded: { 
      height: "auto", 
      opacity: 1,
      transition: {
        height: { duration: 0.4, ease: "easeOut" },
        opacity: { duration: 0.3, delay: 0.1 }
      }
    }
  };

  return (
    <section className="py-16 lg:py-24 bg-gradient-to-b from-white to-blue-50">
      <div className="max-w-4xl mx-auto px-6">
        {/* 标题区域 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            🔥 Core Features
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Professional A Level learning tools designed for academic excellence
          </p>
          <div className="w-20 h-1 bg-gradient-to-r from-blue-500 to-sky-500 mx-auto rounded-full mt-8" />
        </motion.div>

        {/* 纵向瀑布流布局 */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="space-y-6"
        >
          {coreFeatures.map((feature, index) => {
            const IconComponent = feature.icon;
            const isExpanded = expandedCard === feature.id;

            return (
              <motion.div
                key={feature.id}
                variants={cardVariants}
                className="group"
              >
                <div className={`bg-gradient-to-br ${feature.bgColor} rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-white/50 overflow-hidden`}>
                  
                  {/* 卡片头部 - 始终可见 */}
                  <motion.div
                    className="p-6 cursor-pointer"
                    onClick={() => toggleCard(feature.id)}
                    whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {/* 功能图标 */}
                        <motion.div
                          className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center shadow-lg`}
                          whileHover={{ scale: 1.05, rotate: 5 }}
                          transition={{ duration: 0.3 }}
                        >
                          <IconComponent className="w-8 h-8 text-white" />
                        </motion.div>

                        {/* 功能信息 */}
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors duration-300">
                            {index + 1}️⃣ {feature.title}
                          </h3>
                          <p className="text-gray-600 leading-relaxed">
                            {feature.tagline}
                          </p>
                        </div>
                      </div>

                      {/* 展开/收缩按钮 */}
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex-shrink-0 ml-4"
                      >
                        <div className="w-10 h-10 bg-white/70 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md">
                          <ChevronDown className="w-5 h-5 text-gray-600" />
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>

                  {/* 展开内容区域 */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        variants={expandVariants}
                        initial="collapsed"
                        animate="expanded"
                        exit="collapsed"
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6 space-y-4">
                          <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mb-6" />
                          
                          {feature.details.map((detail, detailIndex) => {
                            const DetailIcon = detail.icon;
                            return (
                              <motion.div
                                key={detailIndex}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: detailIndex * 0.1, duration: 0.4 }}
                                className="flex items-start space-x-4 p-4 bg-white/50 backdrop-blur-sm rounded-xl"
                              >
                                <div className="flex-shrink-0">
                                  <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                                    <DetailIcon className="w-5 h-5 text-gray-600" />
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-1">
                                    📌 {detail.title}
                                  </h4>
                                  <p className="text-gray-700 text-sm leading-relaxed">
                                    {detail.description}
                                  </p>
                                </div>
                              </motion.div>
                            );
                          })}

                          {/* 底部行动按钮 */}
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.4 }}
                            className="pt-4"
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = '/ask-ai';
                              }}
                              className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
                            >
                              Try {feature.title} Now →
                            </button>
                          </motion.div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* 底部提示 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-12"
        >
          <p className="text-gray-500 text-sm">
            💡 Click any feature card to explore detailed capabilities and professional terminology
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default EnhancedFeatures;