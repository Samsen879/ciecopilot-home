import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Calculator, ArrowLeft, BookOpen, ChevronRight } from 'lucide-react';

const MathematicsPapers = () => {
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

  // 数学papers - 与导航栏完全一致
  const papers = [
    { 
      name: "Paper 1 – Pure Maths 1", 
      path: "/paper/9709/p1",
      description: "Algebra, functions, coordinate geometry, and trigonometry",
      color: "from-blue-500 to-indigo-600",
      bgColor: "from-blue-50 to-indigo-50"
    },
    { 
      name: "Paper 3 – Pure Maths 3", 
      path: "/paper/9709/p3",
      description: "Advanced algebra, calculus, and mathematical methods",
      color: "from-blue-500 to-indigo-600",
      bgColor: "from-blue-50 to-indigo-50"
    },
    { 
      name: "Paper 4 – Mechanics", 
      path: "/paper/9709/p4",
      description: "Forces, motion, momentum, and energy",
      color: "from-purple-500 to-violet-600",
      bgColor: "from-purple-50 to-violet-50"
    },
    { 
      name: "Paper 5 – Stats 1", 
      path: "/paper/9709/p5",
      description: "Probability, statistics, and data analysis",
      color: "from-emerald-500 to-teal-600",
      bgColor: "from-emerald-50 to-teal-50"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 pt-20">
      <div className="max-w-6xl mx-auto px-6 py-12">
        
        {/* Back Navigation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Link 
            to="/topics" 
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Subject Selection
          </Link>
        </motion.div>

        {/* Header Section */}
        <motion.div
          initial="initial"
          animate="animate"
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg mr-4">
              <Calculator size={40} className="text-white" />
            </div>
            <div className="text-left">
              <motion.h1
                variants={fadeInUp}
                className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight"
              >
                Mathematics (9709)
              </motion.h1>
              <motion.p
                variants={fadeInUp}
                className="text-xl text-gray-600 mt-2"
              >
                Choose a Paper to Study
              </motion.p>
            </div>
          </div>
          
          <motion.p
            variants={fadeInUp}
            className="text-lg text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed"
          >
            Select from the available Mathematics papers. Each paper covers specific areas of the CIE A Level Mathematics syllabus.
          </motion.p>
        </motion.div>

        {/* Papers Grid */}
        <motion.div
          initial="initial"
          animate="animate"
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16"
        >
          {papers.map((paper, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              className="group"
            >
              <Link to={paper.path}>
                <div className={`bg-gradient-to-r ${paper.bgColor} rounded-2xl border-2 border-transparent hover:border-blue-300 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:scale-105`}>
                  
                  {/* Paper Header */}
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`flex items-center justify-center w-16 h-16 bg-gradient-to-br ${paper.color} rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <BookOpen size={32} className="text-white" />
                      </div>
                      <ChevronRight size={24} className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-700 transition-colors duration-300">
                      {paper.name}
                    </h3>
                    <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                      {paper.description}
                    </p>
                  </div>

                  {/* Paper Footer */}
                  <div className="px-8 pb-8">
                    <div className="flex items-center justify-between p-4 bg-white/50 rounded-xl border border-gray-100 group-hover:border-blue-200 transition-colors duration-300">
                      <span className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors duration-300">
                        Start Learning
                      </span>
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-300">
                        <ChevronRight size={16} className="text-blue-600" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-center text-white shadow-lg"
        >
          <h3 className="text-2xl font-bold mb-4">
            Complete Mathematics (9709) Coverage
          </h3>
          <p className="text-blue-100 mb-6 leading-relaxed max-w-2xl mx-auto">
            All papers follow the latest CIE syllabus with comprehensive topic coverage, 
            detailed learning objectives, and exam-focused content structure.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {papers.map((paper, index) => (
              <div key={index} className="text-center">
                <div className="text-2xl font-bold text-white mb-2">
                  Paper {paper.name.includes('Paper 1') ? '1' : paper.name.includes('Paper 3') ? '3' : paper.name.includes('Paper 4') ? '4' : '5'}
                </div>
                <div className="text-blue-100 text-sm">
                  {paper.name.split(' – ')[1]}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MathematicsPapers;