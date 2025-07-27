import React from 'react';
import { motion } from 'framer-motion';
import { Calculator, Atom, TrendingUp, ChevronRight, BookOpen, Users, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

const SubjectSelection = () => {
  const subjects = [
    {
      id: 'mathematics',
      name: 'Mathematics',
      code: '9709',
      description: 'Pure Mathematics, Mechanics, and Statistics covering advanced mathematical concepts and applications.',
      icon: Calculator,
      path: '/mathematics-topics',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'from-blue-50 via-blue-50 to-blue-100 dark:from-blue-900/30 dark:via-blue-800/30 dark:to-blue-700/30',
      borderColor: 'border-blue-200 dark:border-blue-600',
      hoverColor: 'hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50/80 dark:hover:bg-blue-900/50',
      stats: {
        topics: 12,
        papers: 3
      },
      papers: [
        'Paper 1: Pure Mathematics 1',
        'Paper 3: Pure Mathematics 3',
        'Paper 4: Mechanics',
        'Paper 5: Probability & Statistics 1'
      ]
    },
    {
      id: 'further-mathematics',
      name: 'Further Mathematics',
      code: '9231',
      description: 'Advanced mathematical concepts including Further Pure Mathematics, Further Mechanics, and Further Probability & Statistics.',
      icon: Calculator,
      path: '/further-mathematics-topics',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'from-purple-50 via-purple-50 to-purple-100 dark:from-purple-900/30 dark:via-purple-800/30 dark:to-purple-700/30',
      borderColor: 'border-purple-200 dark:border-purple-600',
      hoverColor: 'hover:border-purple-300 dark:hover:border-purple-500 hover:bg-purple-50/80 dark:hover:bg-purple-900/50',
      stats: {
        topics: 9,
        papers: 4
      },
      papers: [
        'Paper 1: Further Pure Mathematics 1',
        'Paper 2: Further Pure Mathematics 2',
        'Paper 3: Further Mechanics',
        'Paper 4: Further Probability & Statistics'
      ]
    },
    {
      id: 'physics',
      name: 'Physics',
      code: '9702',
      description: 'Comprehensive physics curriculum covering mechanics, waves, electricity, magnetism, atomic and nuclear physics.',
      icon: Atom,
      path: '/physics-topics',
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'from-emerald-50 via-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:via-emerald-800/30 dark:to-emerald-700/30',
      borderColor: 'border-emerald-200 dark:border-emerald-600',
      hoverColor: 'hover:border-emerald-300 dark:hover:border-emerald-500 hover:bg-emerald-50/80 dark:hover:bg-emerald-900/50',
      stats: {
        topics: 18,
        papers: 5
      },
      papers: [
        'Paper 1: Multiple Choice',
        'Paper 2: AS Level Theory',
        'Paper 3: Advanced Practical Skills',
        'Paper 4: A2 Level Theory',
        'Paper 5: Planning, Analysis and Evaluation'
      ]
    }
  ];

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-900 dark:via-gray-800/30 dark:to-gray-700/20 pt-20 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-6 py-16">
        
        {/* Header Section */}
        <motion.div
          initial="initial"
          animate="animate"
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.h1
            variants={fadeInUp}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-6 tracking-tight transition-colors duration-200"
          >
            Choose Your Subject
          </motion.h1>
          
          <motion.p
            variants={fadeInUp}
            className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed transition-colors duration-200"
          >
            Select from our comprehensive collection of CIE A Level subjects. Each subject includes detailed topic breakdowns, practice materials, and exam resources.
          </motion.p>
        </motion.div>

        {/* Subject Cards Grid */}
        <motion.div
          initial="initial"
          animate="animate"
          variants={staggerContainer}
          className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 mb-16"
        >
          {subjects.map((subject, index) => {
            const SubjectIcon = subject.icon;
            
            return (
              <motion.div
                key={subject.id}
                variants={fadeInUp}
                className="group"
              >
                <Link to={subject.path}>
                  <div className={`bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl border-2 ${subject.borderColor} ${subject.hoverColor} shadow-sm hover:shadow-xl dark:hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:scale-105`}>
                    
                    {/* Card Header */}
                    <div className={`bg-gradient-to-br ${subject.bgColor} p-6 border-b border-gray-100/50 dark:border-gray-700/50 transition-colors duration-200`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className={`flex items-center justify-center w-16 h-16 bg-gradient-to-br ${subject.color} rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          <SubjectIcon size={32} className="text-white" />
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors duration-200">CIE Code</div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 transition-colors duration-200">{subject.code}</div>
                        </div>
                      </div>
                      
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors duration-300">
                        {subject.name}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed transition-colors duration-200">
                        {subject.description}
                      </p>
                    </div>

                    {/* Papers List */}
                    <div className="p-6">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center transition-colors duration-200">
                        <BookOpen size={20} className="mr-2 text-gray-600 dark:text-gray-300" />
                        Available Papers
                      </h4>
                      
                      <div className="space-y-2 mb-6">
                        {subject.papers.map((paper, index) => (
                          <div key={index} className="flex items-center text-gray-700 dark:text-gray-300 transition-colors duration-200">
                            <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full mr-3 flex-shrink-0"></div>
                            <span className="text-sm">{paper}</span>
                          </div>
                        ))}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 transition-colors duration-200">{subject.stats.topics}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300 transition-colors duration-200">Topics</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 transition-colors duration-200">{subject.stats.papers}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300 transition-colors duration-200">Papers</div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors duration-300">
                          Explore Topics
                        </span>
                        <ChevronRight 
                          size={20} 
                          className="text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all duration-300" 
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 rounded-2xl p-8 text-center text-white shadow-lg transition-colors duration-200"
        >
          <h3 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to Start Learning?
          </h3>
          <p className="text-blue-100 dark:text-blue-200 mb-6 max-w-2xl mx-auto transition-colors duration-200">
            Choose your subject and dive deep into comprehensive A Level content designed specifically for CIE exam success.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center text-blue-100 dark:text-blue-200 transition-colors duration-200">
              <Users size={20} className="mr-2" />
              <span>Expert-crafted content</span>
            </div>
            <div className="flex items-center text-blue-100 dark:text-blue-200 transition-colors duration-200">
              <Award size={20} className="mr-2" />
              <span>Exam-focused approach</span>
            </div>
            <div className="flex items-center text-blue-100 dark:text-blue-200 transition-colors duration-200">
              <TrendingUp size={20} className="mr-2" />
              <span>Track your progress</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SubjectSelection;