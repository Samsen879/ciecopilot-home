import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Calculator, Zap, Atom, ChevronRight, BookOpen, Target, Award } from 'lucide-react';

const SubjectSelection = () => {
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

  const subjects = [
    {
      id: 'mathematics',
      code: '9709',
      title: 'Mathematics',
      description: 'Pure Mathematics, Mechanics, and Probability & Statistics',
      icon: Calculator,
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'from-blue-50 to-indigo-50',
      borderColor: 'border-blue-200',
      hoverColor: 'hover:border-blue-400',
      papers: [
        { name: 'Paper 1 – Pure Maths 1', path: '/paper/9709/p1' },
        { name: 'Paper 3 – Pure Maths 3', path: '/paper/9709/p3' },
        { name: 'Paper 4 – Mechanics', path: '/paper/9709/p4' },
        { name: 'Paper 5 – Stats 1', path: '/paper/9709/p5' }
      ],
      route: '/mathematics-papers', // 指向数学paper选择页面
      stats: { topics: '45+', papers: 4 }
    },
    {
      id: 'further-mathematics',
      code: '9231',
      title: 'Further Mathematics',
      description: 'Further Pure Mathematics, Further Mechanics, and Further Statistics',
      icon: Target,
      color: 'from-purple-500 to-violet-600',
      bgColor: 'from-purple-50 to-violet-50',
      borderColor: 'border-purple-200',
      hoverColor: 'hover:border-purple-400',
      papers: [
        { name: 'Paper 1 – Further Pure 1', path: '/paper/9231/p1' },
        { name: 'Paper 2 – Further Pure 2', path: '/paper/9231/p2' },
        { name: 'Paper 3 – Further Mechanics', path: '/paper/9231/p3' },
        { name: 'Paper 4 – Further Statistics', path: '/paper/9231/p4' }
      ],
      route: '/further-mathematics-papers', // 指向进阶数学paper选择页面
      stats: { topics: '35+', papers: 4 }
    },
    {
      id: 'physics',
      code: '9702',
      title: 'Physics',
      description: 'AS Level and A2 Level Physics covering all major topics',
      icon: Atom,
      color: 'from-emerald-500 to-teal-600',
      bgColor: 'from-emerald-50 to-teal-50',
      borderColor: 'border-emerald-200',
      hoverColor: 'hover:border-emerald-400',
      papers: [
        { name: 'AS Level', path: '/physics/as-level' },
        { name: 'A2 Level', path: '/physics/a2-level' }
      ],
      route: '/physics-papers', // 指向物理paper选择页面
      stats: { topics: '30+', papers: 2 }
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 pt-20">
      <div className="max-w-7xl mx-auto px-6 py-12">
        
        {/* Header Section */}
        <motion.div
          initial="initial"
          animate="animate"
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.h1
            variants={fadeInUp}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 tracking-tight"
          >
            Choose Your Subject
          </motion.h1>
          <motion.p
            variants={fadeInUp}
            className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed"
          >
            Select from our comprehensive CIE A Level subjects. Each subject includes complete syllabus coverage with detailed topic breakdowns.
          </motion.p>
          <motion.div
            variants={fadeInUp}
            className="w-24 h-1 bg-gradient-to-r from-blue-500 to-sky-400 mx-auto rounded-full"
          />
        </motion.div>

        {/* Subjects Grid */}
        <motion.div
          initial="initial"
          animate="animate"
          variants={staggerContainer}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16"
        >
          {subjects.map((subject) => {
            const SubjectIcon = subject.icon;
            
            return (
              <motion.div
                key={subject.id}
                variants={fadeInUp}
                className="group"
              >
                <Link to={subject.route}>
                  <div className={`bg-white/70 backdrop-blur-sm rounded-2xl border-2 ${subject.borderColor} ${subject.hoverColor} shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:scale-105`}>
                    
                    {/* Subject Header */}
                    <div className={`bg-gradient-to-r ${subject.bgColor} p-8 border-b border-gray-100/50`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className={`flex items-center justify-center w-16 h-16 bg-gradient-to-br ${subject.color} rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          <SubjectIcon size={32} className="text-white" />
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-600">CIE Code</div>
                          <div className="text-2xl font-bold text-gray-900">{subject.code}</div>
                        </div>
                      </div>
                      
                      <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors duration-300">
                        {subject.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        {subject.description}
                      </p>
                    </div>

                    {/* Subject Content */}
                    <div className="p-8">
                      {/* Papers List */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <BookOpen size={20} className="mr-2 text-gray-600" />
                          Available Papers
                        </h4>
                        <div className="space-y-2">
                          {subject.papers.map((paper, index) => (
                            <div key={index} className="flex items-center text-gray-700">
                              <div className="w-2 h-2 bg-blue-400 rounded-full mr-3 flex-shrink-0" />
                              <span className="text-sm">{paper.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-xl">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">{subject.stats.topics}</div>
                          <div className="text-sm text-gray-600">Topics</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">{subject.stats.papers}</div>
                          <div className="text-sm text-gray-600">Papers</div>
                        </div>
                      </div>

                      {/* CTA Button */}
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 group-hover:border-blue-200 transition-colors duration-300">
                        <span className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors duration-300">
                          Explore {subject.title}
                        </span>
                        <ChevronRight size={20} className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-300" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Bottom CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-center text-white shadow-lg"
        >
          <div className="flex items-center justify-center mb-4">
            <Award size={32} className="text-blue-200 mr-3" />
            <h3 className="text-2xl font-bold">
              Complete CIE A Level Coverage
            </h3>
          </div>
          <p className="text-blue-100 mb-6 leading-relaxed max-w-2xl mx-auto">
            All subjects follow the latest CIE syllabus with comprehensive topic coverage, 
            detailed learning objectives, and exam-focused content structure.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">110+</div>
              <div className="text-blue-100 text-sm">Total Topics</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">10</div>
              <div className="text-blue-100 text-sm">Papers Covered</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">3</div>
              <div className="text-blue-100 text-sm">Core Subjects</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SubjectSelection;