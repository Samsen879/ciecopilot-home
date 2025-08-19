import React from 'react';
import { motion } from 'framer-motion';
import { Check, Star, Zap, Crown, Users } from 'lucide-react';
import { AuroraBackground } from '../components/ui/aurora-background';
import { useTheme } from '../contexts/ThemeContext';

const Pricing = () => {
  const { theme } = useTheme();

  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: "easeOut" }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const pricingPlans = [
    {
      name: "基础版",
      price: "免费",
      period: "",
      description: "适合初学者体验AI学习",
      icon: <Users className="w-8 h-8" />,
      features: [
        "每日5次AI问答",
        "基础知识卡片访问",
        "标准学习进度追踪",
        "社区讨论参与",
        "基础练习题库"
      ],
      buttonText: "开始免费使用",
      buttonStyle: "bg-gray-600 hover:bg-gray-700 text-white",
      popular: false
    },
    {
      name: "标准版",
      price: "¥99",
      period: "/月",
      description: "适合认真学习的学生",
      icon: <Star className="w-8 h-8" />,
      features: [
        "无限AI问答次数",
        "完整知识卡片库",
        "智能学习路径规划",
        "详细进度分析报告",
        "优先客服支持",
        "历年真题完整访问",
        "AI图像题目解析"
      ],
      buttonText: "选择标准版",
      buttonStyle: "bg-blue-600 hover:bg-blue-700 text-white",
      popular: true
    },
    {
      name: "高级版",
      price: "¥199",
      period: "/月",
      description: "适合冲刺A*的学生",
      icon: <Crown className="w-8 h-8" />,
      features: [
        "标准版所有功能",
        "1对1 AI导师指导",
        "个性化学习计划",
        "考试策略分析",
        "模拟考试评估",
        "学习数据深度分析",
        "专属学习顾问",
        "优先新功能体验"
      ],
      buttonText: "选择高级版",
      buttonStyle: "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white",
      popular: false
    }
  ];

  const features = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: "AI智能问答",
      description: "24/7可用的AI导师，即时解答数学、进阶数学、物理问题"
    },
    {
      icon: <Star className="w-6 h-6" />,
      title: "个性化学习",
      description: "根据学习进度和薄弱环节，智能推荐学习内容"
    },
    {
      icon: <Check className="w-6 h-6" />,
      title: "进度追踪",
      description: "详细的学习数据分析，帮助优化学习策略"
    }
  ];

  return (
    <AuroraBackground>
      <div className="min-h-screen relative z-10 py-20">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header Section */}
          <motion.div
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h1
              variants={fadeInUp}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 transition-colors duration-200"
            >
              选择适合你的学习计划
            </motion.h1>
            <motion.p
              variants={fadeInUp}
              className="text-lg md:text-xl text-gray-700 dark:text-neutral-200 max-w-3xl mx-auto mb-8 transition-colors duration-200"
            >
              针对CIE A Level数学、进阶数学与物理的专业AI学习平台，助你高效提升成绩
            </motion.p>
          </motion.div>

          {/* Pricing Cards */}
          <motion.div
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-8 mb-16"
          >
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={plan.name}
                variants={fadeInUp}
                className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 transition-all duration-300 hover:shadow-2xl hover:scale-105 ${
                  plan.popular ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                      最受欢迎
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <div className="flex justify-center mb-4 text-blue-600 dark:text-blue-400">
                    {plan.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {plan.description}
                  </p>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">
                      {plan.price}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400 ml-1">
                      {plan.period}
                    </span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${plan.buttonStyle}`}
                >
                  {plan.buttonText}
                </button>
              </motion.div>
            ))}
          </motion.div>

          {/* Features Section */}
          <motion.div
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="text-center"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-12 transition-colors duration-200"
            >
              为什么选择我们？
            </motion.h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg transition-all duration-300 hover:shadow-xl"
                >
                  <div className="flex justify-center mb-4 text-blue-600 dark:text-blue-400">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* FAQ Section */}
          <motion.div
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="mt-20 text-center"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-8 transition-colors duration-200"
            >
              常见问题
            </motion.h2>
            
            <motion.div
              variants={fadeInUp}
              className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg"
            >
              <div className="space-y-6 text-left">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    可以随时取消订阅吗？
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    是的，您可以随时取消订阅，无需任何额外费用。取消后您仍可使用至当前计费周期结束。
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    支持哪些支付方式？
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    我们支持微信支付、支付宝、银行卡等多种支付方式，确保您的支付安全便捷。
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    有学生优惠吗？
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    我们为在校学生提供特别优惠，请联系客服获取学生认证和优惠详情。
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </AuroraBackground>
  );
};

export default Pricing;