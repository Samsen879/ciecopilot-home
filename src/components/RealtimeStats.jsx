import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, BookOpen, TrendingUp, Clock, Target, Award, Zap, Globe } from 'lucide-react';

const RealtimeStats = () => {
  // 动态数据状态
  const [stats, setStats] = useState({
    students: 50000,
    questionsCompleted: 1250000,
    improvementRate: 95,
    avgResponseTime: 2.8,
    countriesServed: 45,
    successRate: 94.7,
    aiAccuracy: 99.2,
    satisfactionRate: 98.1
  });

  // 模拟实时数据更新
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        students: prev.students + Math.floor(Math.random() * 3),
        questionsCompleted: prev.questionsCompleted + Math.floor(Math.random() * 15),
        improvementRate: 95 + Math.random() * 2,
        avgResponseTime: 2.5 + Math.random() * 0.8,
        countriesServed: prev.countriesServed,
        successRate: 94 + Math.random() * 3,
        aiAccuracy: 99 + Math.random() * 0.5,
        satisfactionRate: 97.5 + Math.random() * 1
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // 统计数据配置
  const mainStats = [
    {
      icon: Users,
      value: stats.students,
      label: "Active Students",
      suffix: "+",
      color: "from-blue-500 to-blue-600",
      bgColor: "from-blue-50 to-blue-100",
      description: "Students actively learning",
      format: (val) => (val / 1000).toFixed(0) + "K"
    },
    {
      icon: BookOpen,
      value: stats.questionsCompleted,
      label: "Questions Solved",
      suffix: "+",
      color: "from-green-500 to-green-600",
      bgColor: "from-green-50 to-green-100",
      description: "Total practice completed",
      format: (val) => (val / 1000000).toFixed(1) + "M"
    },
    {
      icon: TrendingUp,
      value: stats.improvementRate,
      label: "Grade Improvement",
      suffix: "%",
      color: "from-purple-500 to-purple-600",
      bgColor: "from-purple-50 to-purple-100",
      description: "Students achieving higher grades",
      format: (val) => val.toFixed(1)
    },
    {
      icon: Zap,
      value: stats.avgResponseTime,
      label: "Avg Response Time",
      suffix: "s",
      color: "from-orange-500 to-orange-600",
      bgColor: "from-orange-50 to-orange-100",
      description: "AI response speed",
      format: (val) => val.toFixed(1)
    }
  ];

  const additionalStats = [
    {
      icon: Globe,
      value: stats.countriesServed,
      label: "Countries",
      description: "Global reach",
      format: (val) => val.toString()
    },
    {
      icon: Target,
      value: stats.aiAccuracy,
      label: "AI Accuracy",
      suffix: "%",
      description: "Solution precision",
      format: (val) => val.toFixed(1)
    },
    {
      icon: Award,
      value: stats.successRate,
      label: "Success Rate",
      suffix: "%",
      description: "Student satisfaction",
      format: (val) => val.toFixed(1)
    },
    {
      icon: Clock,
      value: stats.satisfactionRate,
      label: "Satisfaction",
      suffix: "%",
      description: "User experience rating",
      format: (val) => val.toFixed(1)
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
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

  const CounterAnimation = ({ value, format, duration = 2 }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
      const startValue = displayValue;
      const endValue = value;
      const startTime = Date.now();

      const updateCounter = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / (duration * 1000), 1);
        
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        const currentValue = startValue + (endValue - startValue) * easeOutCubic;
        
        setDisplayValue(currentValue);

        if (progress < 1) {
          requestAnimationFrame(updateCounter);
        }
      };

      updateCounter();
    }, [value, format, duration]);

    return <span>{format(displayValue)}</span>;
  };

  return (
    <section className="py-16 lg:py-24 bg-gradient-to-b from-white via-blue-25 to-blue-50 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0">
        {/* 浮动的数字背景 */}
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-blue-100 font-mono text-4xl font-bold select-none pointer-events-none"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.1, 0.3, 0.1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeInOut"
            }}
          >
            {Math.floor(Math.random() * 100)}
          </motion.div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* 标题区域 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            📊 Live Performance Metrics
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Real-time statistics showing the impact of our AI learning platform
          </p>
          <div className="w-20 h-1 bg-gradient-to-r from-blue-500 to-sky-500 mx-auto rounded-full mt-8" />
          
          {/* 实时指示器 */}
          <motion.div
            className="inline-flex items-center space-x-2 mt-6 bg-green-100 text-green-700 px-4 py-2 rounded-full"
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Live Data • Updated Every 3s</span>
          </motion.div>
        </motion.div>

        {/* 主要统计数据 */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
        >
          {mainStats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                className="group"
                whileHover={{ y: -5 }}
              >
                <div className={`bg-gradient-to-br ${stat.bgColor} rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-white/50 relative overflow-hidden`}>
                  {/* 背景装饰 */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/20 to-transparent rounded-full transform translate-x-8 -translate-y-8" />
                  
                  {/* 图标 */}
                  <motion.div
                    className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center mb-4 shadow-lg relative z-10`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ duration: 0.3 }}
                  >
                    <IconComponent className="w-6 h-6 text-white" />
                  </motion.div>

                  {/* 数值 */}
                  <div className="relative z-10">
                    <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                      <CounterAnimation value={stat.value} format={stat.format} />
                      <span className="text-lg text-gray-600">{stat.suffix}</span>
                    </div>
                    
                    <h3 className="font-semibold text-gray-800 mb-1">
                      {stat.label}
                    </h3>
                    
                    <p className="text-sm text-gray-600">
                      {stat.description}
                    </p>

                    {/* 动态增长指示器 */}
                    <motion.div
                      className="flex items-center space-x-1 mt-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1 }}
                    >
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-green-600 font-medium">Live</span>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* 次要统计数据 */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="bg-white rounded-3xl p-8 shadow-2xl border border-blue-100"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {additionalStats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  className="text-center group"
                  whileHover={{ scale: 1.05 }}
                >
                  <motion.div
                    className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:from-blue-100 group-hover:to-blue-200 transition-all duration-300"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <IconComponent className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors duration-300" />
                  </motion.div>
                  
                  <div className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
                    <CounterAnimation value={stat.value} format={stat.format} />
                    <span className="text-sm text-gray-600">{stat.suffix}</span>
                  </div>
                  
                  <h4 className="text-sm font-medium text-gray-700 mb-1">
                    {stat.label}
                  </h4>
                  
                  <p className="text-xs text-gray-500">
                    {stat.description}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* 底部信息 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-8 pt-6 border-t border-gray-200 text-center"
          >
            <p className="text-gray-500 text-sm">
              📈 Data updated in real-time • Powered by advanced analytics • Trusted by students worldwide
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default RealtimeStats;