import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, BookOpen, Calculator, Zap, BarChart3, Grid, List } from "lucide-react";

// Import all paper data
import paper3Data from "../data/9709paper3.json";
import paper4Data from "../data/9709paper4.json";
import paper5Data from "../data/9709paper5.json";
import paperFMData from "../data/9231FM-syllabus.json";

const Topics = () => {
  const [expandedTopics, setExpandedTopics] = useState(new Set());
  const [selectedPaper, setSelectedPaper] = useState('all');

  // Paper data mapping
  const paperData = {
    'p3': {
      name: 'Pure Mathematics 3',
      data: paper3Data["9709_Paper_3_Pure_Mathematics_3"],
      icon: Calculator,
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30'
    },
    'p4': {
      name: 'Mechanics',
      data: paper4Data["9709_Paper_4_Mechanics"],
      icon: Zap,
      color: 'from-purple-500 to-violet-600',
      bgColor: 'from-purple-50 to-violet-50 dark:from-purple-900/30 dark:to-violet-900/30'
    },
    'p5': {
      name: 'Probability and Statistics 1',
      data: paper5Data["9709_Paper_5_Probability_and_Statistics_1"],
      icon: BarChart3,
      color: 'from-emerald-500 to-teal-600',
      bgColor: 'from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30'
    },
    'fm': {
      name: 'Further Mechanics',
      data: paperFMData["9231_Paper_3_Further_Mechanics"],  // 使用9231试卷数据
      icon: Calculator,  // 可根据需要调整图标
      color: 'from-rose-500 to-pink-600',  // 使用新的配色方案
      bgColor: 'from-rose-50 to-pink-50 dark:from-rose-900/30 dark:to-pink-900/30'
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1]
      }
    }
  };

  const contentVariants = {
    hidden: {
      opacity: 0,
      height: 0,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1]
      }
    },
    visible: {
      opacity: 1,
      height: "auto",
      transition: {
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1]
      }
    }
  };

  const toggleTopic = (paperId, topicIndex) => {
    const topicKey = `${paperId}-${topicIndex}`;
    const newExpanded = new Set(expandedTopics);
    
    if (newExpanded.has(topicKey)) {
      newExpanded.delete(topicKey);
    } else {
      newExpanded.add(topicKey);
    }
    
    setExpandedTopics(newExpanded);
  };

  const isTopicExpanded = (paperId, topicIndex) => {
    return expandedTopics.has(`${paperId}-${topicIndex}`);
  };

  // Filter papers based on selection
  const getFilteredPapers = () => {
    if (selectedPaper === 'all') {
      return Object.entries(paperData);
    }
    return [[selectedPaper, paperData[selectedPaper]]];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-900 dark:via-gray-800/30 dark:to-gray-700/20 pt-20 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-6 py-12">
        
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4 tracking-tight transition-colors duration-200">
            Mathematics Topics
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed transition-colors duration-200">
            Explore comprehensive topic coverage for CIE A Level Mathematics Papers 3, 4, and 5
          </p>
          
          {/* Paper Filter Tabs */}
          <div className="inline-flex bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-2 border border-white/20 dark:border-gray-700/50 shadow-sm transition-colors duration-200">
            {[
              { id: 'all', label: 'All Papers' },
              { id: 'p3', label: 'Pure Math 3' },
              { id: 'p4', label: 'Mechanics' },
              { id: 'p5', label: 'Statistics' },
              { id: 'fm', label: 'Further Mechanics' }  // 新增9231试卷筛选选项
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setSelectedPaper(id)}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  selectedPaper === id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Papers and Topics */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-12"
        >
          {getFilteredPapers().map(([paperId, paper]) => {
            const PaperIcon = paper.icon;
            
            return (
              <motion.div
                key={paperId}
                variants={cardVariants}
                className="space-y-6"
              >
                {/* Paper Header */}
                <div className={`bg-gradient-to-r ${paper.bgColor} rounded-2xl p-8 border border-white/20 dark:border-gray-700/50 shadow-sm transition-colors duration-200`}>
                  <div className="flex items-center space-x-4">
                    <div className={`flex items-center justify-center w-16 h-16 bg-gradient-to-br ${paper.color} rounded-2xl shadow-lg`}>
                      <PaperIcon size={32} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 transition-colors duration-200">
                        Paper {paperId.toUpperCase()}: {paper.name}
                      </h2>
                      <div className="flex items-center space-x-6 text-gray-600 dark:text-gray-300 transition-colors duration-200">
                        <div className="flex items-center space-x-2">
                          <Grid size={18} />
                          <span>{paper.data.length} topics</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <List size={18} />
                          <span>
                            {paper.data.reduce((total, topic) => 
                              total + topic.cards.reduce((cardTotal, card) => cardTotal + card.details.length, 0), 0
                            )} learning objectives
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Topics Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {paper.data.map((topic, topicIndex) => (
                    <motion.div
                      key={topicIndex}
                      variants={cardVariants}
                      className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-sm hover:shadow-lg dark:hover:shadow-2xl transition-all duration-300 overflow-hidden"
                    >
                      {/* Topic Header */}
                      <button
                        onClick={() => toggleTopic(paperId, topicIndex)}
                        className="w-full p-6 text-left hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-600 dark:to-gray-700 rounded-xl transition-colors duration-200">
                              <BookOpen size={24} className="text-gray-600 dark:text-gray-300" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 transition-colors duration-200">
                                {topic.topic}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors duration-200">
                                {topic.cards.length} concept {topic.cards.length === 1 ? 'card' : 'cards'}
                              </p>
                            </div>
                          </div>
                          <motion.div
                            animate={{ rotate: isTopicExpanded(paperId, topicIndex) ? 90 : 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                          >
                            <ChevronRight size={20} className="text-gray-400 dark:text-gray-500" />
                          </motion.div>
                        </div>
                      </button>

                      {/* Expandable Content */}
                      <AnimatePresence>
                        {isTopicExpanded(paperId, topicIndex) && (
                          <motion.div
                            variants={contentVariants}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            className="overflow-hidden"
                          >
                            <div className="px-6 pb-6 space-y-4">
                              {topic.cards.map((card, cardIndex) => (
                                <motion.div
                                  key={cardIndex}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ 
                                    duration: 0.3, 
                                    delay: cardIndex * 0.05,
                                    ease: [0.16, 1, 0.3, 1]
                                  }}
                                  className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-700 dark:to-gray-600 rounded-xl p-5 border border-gray-100/50 dark:border-gray-600/50 shadow-sm transition-colors duration-200"
                                >
                                  {/* Card Title */}
                                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-base transition-colors duration-200">
                                    {card.title}
                                  </h4>
                                  
                                  {/* Card Details */}
                                  <div className="space-y-2">
                                    {card.details.map((detail, detailIndex) => (
                                      <div 
                                        key={detailIndex}
                                        className="flex items-start space-x-3 text-sm"
                                      >
                                        <div className="flex items-center justify-center w-5 h-5 bg-blue-100 dark:bg-blue-800 rounded-full mt-0.5 flex-shrink-0 transition-colors duration-200">
                                          <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full" />
                                        </div>
                                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed transition-colors duration-200">
                                          {detail}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                  
                                  {/* Card Footer */}
                                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-600 transition-colors duration-200">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium transition-colors duration-200">
                                      {card.details.length} learning objective{card.details.length !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Summary Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mt-16 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 rounded-2xl p-8 text-center text-white shadow-lg transition-colors duration-200"
        >
          <h3 className="text-2xl font-bold mb-4">
            Complete A Level Mathematics Coverage
          </h3>
          <p className="text-blue-100 dark:text-blue-200 mb-6 leading-relaxed max-w-2xl mx-auto transition-colors duration-200">
            Comprehensive topic breakdown covering advanced pure mathematics, mechanics, and statistics. 
            Each learning objective is carefully structured to match the CIE syllabus requirements.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {Object.entries(paperData).map(([id, paper]) => {
              const totalObjectives = paper.data.reduce((total, topic) => 
                total + topic.cards.reduce((cardTotal, card) => cardTotal + card.details.length, 0), 0
              );
              
              return (
                <div key={id} className="text-center">
                  <div className="text-3xl font-bold text-white mb-2">
                    {totalObjectives}
                  </div>
                  <div className="text-blue-100 dark:text-blue-200 text-sm transition-colors duration-200">
                    {paper.name} Objectives
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Topics;
