import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, BookOpen, Calculator, Zap, BarChart3, Brain, Grid, List } from "lucide-react";

// Import all Further Mathematics paper data
import fp1Data from "../data/9231FP1.json";
import fp2Data from "../data/9231FP2.json";
import fmData from "../data/9231FM.json";
import fsData from "../data/9231FS.json";

const FurtherMathTopics = () => {
  const [expandedTopics, setExpandedTopics] = useState(new Set());
  const [selectedPaper, setSelectedPaper] = useState('all');

  // Paper data mapping for Further Mathematics (9231)
  const paperData = {
    'fp1': {
      name: 'Further Pure Mathematics 1',
      data: fp1Data["9231_Paper_1_Further_Pure_Mathematics_1"],
      icon: Calculator,
      color: 'from-emerald-500 to-teal-600',
      bgColor: 'from-emerald-50 to-teal-50'
    },
    'fp2': {
      name: 'Further Pure Mathematics 2',
      data: fp2Data["9231_Paper_2_Further_Pure_Mathematics_2"],
      icon: Brain,
      color: 'from-purple-500 to-violet-600',
      bgColor: 'from-purple-50 to-violet-50'
    },
    'fm': {
      name: 'Further Mechanics',
      data: fmData["9231_Paper_3_Further_Mechanics"],
      icon: Zap,
      color: 'from-orange-500 to-red-600',
      bgColor: 'from-orange-50 to-red-50'
    },
    'fs': {
      name: 'Further Probability and Statistics',
      data: fsData["9231_Paper_4_Further_Probability_and_Statistics"],
      icon: BarChart3,
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'from-blue-50 to-indigo-50'
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/20 pt-20">
      <div className="max-w-7xl mx-auto px-6 py-12">
        
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
            Further Mathematics Topics
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Explore advanced mathematical concepts for CIE A Level Further Mathematics (9231) across all four papers
          </p>
          
          {/* Paper Filter Tabs */}
          <div className="inline-flex bg-white/70 backdrop-blur-sm rounded-2xl p-2 border border-white/20 shadow-sm">
            {[
              { id: 'all', label: 'All Papers' },
              { id: 'fp1', label: 'Further Pure 1' },
              { id: 'fp2', label: 'Further Pure 2' },
              { id: 'fm', label: 'Further Mechanics' },
              { id: 'fs', label: 'Further Statistics' }
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setSelectedPaper(id)}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  selectedPaper === id
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50'
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
                <div className={`bg-gradient-to-r ${paper.bgColor} rounded-2xl p-8 border border-white/20 shadow-sm`}>
                  <div className="flex items-center space-x-4">
                    <div className={`flex items-center justify-center w-16 h-16 bg-gradient-to-br ${paper.color} rounded-2xl shadow-lg`}>
                      <PaperIcon size={32} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                        {paper.name}
                      </h2>
                      <div className="flex items-center space-x-6 text-gray-600">
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
                      className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                    >
                      {/* Topic Header */}
                      <button
                        onClick={() => toggleTopic(paperId, topicIndex)}
                        className="w-full p-6 text-left hover:bg-gray-50/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-inset"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl">
                              <BookOpen size={24} className="text-gray-600" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-900 mb-1">
                                {topic.topic}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {topic.cards.length} concept {topic.cards.length === 1 ? 'card' : 'cards'}
                              </p>
                            </div>
                          </div>
                          <motion.div
                            animate={{ rotate: isTopicExpanded(paperId, topicIndex) ? 90 : 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                          >
                            <ChevronRight size={20} className="text-gray-400" />
                          </motion.div>
                        </div>
                      </button>

                      {/* Expandable Content - Cards and Details */}
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
                                  className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-5 border border-gray-100/50 shadow-sm"
                                >
                                  {/* Card Title */}
                                  <h4 className="font-semibold text-gray-900 mb-3 text-base">
                                    {card.title}
                                  </h4>
                                  
                                  {/* Card Details */}
                                  <div className="space-y-2">
                                    {card.details.map((detail, detailIndex) => (
                                      <div 
                                        key={detailIndex}
                                        className="flex items-start space-x-3 text-sm"
                                      >
                                        <div className="flex items-center justify-center w-5 h-5 bg-emerald-100 rounded-full mt-0.5 flex-shrink-0">
                                          <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                                        </div>
                                        <p className="text-gray-700 leading-relaxed">
                                          {detail}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                  
                                  {/* Card Footer */}
                                  <div className="mt-4 pt-3 border-t border-gray-100">
                                    <span className="text-xs text-gray-500 font-medium">
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
          className="mt-16 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-8 text-center text-white shadow-lg"
        >
          <h3 className="text-2xl font-bold mb-4">
            Complete Further Mathematics Coverage
          </h3>
          <p className="text-emerald-100 mb-6 leading-relaxed max-w-2xl mx-auto">
            Advanced mathematical concepts covering sophisticated pure mathematics, complex mechanics, and advanced statistics. 
            Each topic is structured to challenge and extend beyond standard A Level mathematics.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {Object.entries(paperData).map(([id, paper]) => {
              const totalObjectives = paper.data.reduce((total, topic) => 
                total + topic.cards.reduce((cardTotal, card) => cardTotal + card.details.length, 0), 0
              );
              
              return (
                <div key={id} className="text-center">
                  <div className="text-3xl font-bold text-white mb-2">
                    {totalObjectives}
                  </div>
                  <div className="text-emerald-100 text-sm">
                    {paper.name.replace('Further ', '')} Objectives
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

export default FurtherMathTopics; 