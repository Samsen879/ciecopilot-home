import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, BookOpen, Atom, Grid, List, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

// Import physics data
import physicsData from "../data/9702AS+A2.json";

const PhysicsTopics = () => {
  const [expandedTopics, setExpandedTopics] = useState(new Set());
  const [selectedLevel, setSelectedLevel] = useState('all');

  // Physics data mapping for 9702
  const physicsLevels = {
    'as': {
      name: 'AS Level Physics',
      data: physicsData["AS_Level"] || [],
      color: 'from-emerald-500 to-teal-600',
      bgColor: 'from-emerald-50 to-teal-50'
    },
    'a2': {
      name: 'A2 Level Physics',
      data: physicsData["A2_Level"] || [],
      color: 'from-teal-500 to-cyan-600',
      bgColor: 'from-teal-50 to-cyan-50'
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

  const toggleTopic = (levelId, topicIndex) => {
    const topicKey = `${levelId}-${topicIndex}`;
    const newExpanded = new Set(expandedTopics);
    
    if (newExpanded.has(topicKey)) {
      newExpanded.delete(topicKey);
    } else {
      newExpanded.add(topicKey);
    }
    
    setExpandedTopics(newExpanded);
  };

  const isTopicExpanded = (levelId, topicIndex) => {
    return expandedTopics.has(`${levelId}-${topicIndex}`);
  };

  // Filter levels based on selection
  const getFilteredLevels = () => {
    if (selectedLevel === 'all') {
      return Object.entries(physicsLevels);
    }
    return [[selectedLevel, physicsLevels[selectedLevel]]];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/20 pt-20">
      <div className="max-w-7xl mx-auto px-6 py-12">
        
        {/* Back Navigation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Link 
            to="/topics" 
            className="inline-flex items-center text-emerald-600 hover:text-emerald-700 font-medium transition-colors duration-200"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Subject Selection
          </Link>
        </motion.div>

        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg mr-4">
              <Atom size={40} className="text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
                Physics (9702)
              </h1>
              <p className="text-xl text-gray-600 mt-2">
                CIE A Level Physics
              </p>
            </div>
          </div>
          
          <p className="text-lg text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Comprehensive coverage of AS and A2 Level Physics topics covering all major areas of study
          </p>
          
          {/* Level Filter Tabs */}
          <div className="inline-flex bg-white/70 backdrop-blur-sm rounded-2xl p-2 border border-white/20 shadow-sm">
            {[
              { id: 'all', label: 'All Levels' },
              { id: 'as', label: 'AS Level' },
              { id: 'a2', label: 'A2 Level' }
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setSelectedLevel(id)}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  selectedLevel === id
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Levels and Topics */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-12"
        >
          {getFilteredLevels().map(([levelId, level]) => {
            return (
              <motion.div
                key={levelId}
                variants={cardVariants}
                className="space-y-6"
              >
                {/* Level Header */}
                <div className={`bg-gradient-to-r ${level.bgColor} rounded-2xl p-8 border border-white/20 shadow-sm`}>
                  <div className="flex items-center space-x-4">
                    <div className={`flex items-center justify-center w-16 h-16 bg-gradient-to-br ${level.color} rounded-2xl shadow-lg`}>
                      <Atom size={32} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                        {level.name}
                      </h2>
                      <div className="flex items-center space-x-6 text-gray-600">
                        <div className="flex items-center space-x-2">
                          <Grid size={18} />
                          <span>{level.data.length} topics</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <List size={18} />
                          <span>
                            {level.data.reduce((total, topic) => 
                              total + (topic.cards ? topic.cards.reduce((cardTotal, card) => cardTotal + (card.details ? card.details.length : 0), 0) : 0), 0
                            )} learning objectives
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Topics Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {level.data.map((topic, topicIndex) => (
                    <motion.div
                      key={topicIndex}
                      variants={cardVariants}
                      className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                    >
                      {/* Topic Header */}
                      <button
                        onClick={() => toggleTopic(levelId, topicIndex)}
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
                                {topic.cards ? topic.cards.length : 0} concept {(topic.cards ? topic.cards.length : 0) === 1 ? 'card' : 'cards'}
                              </p>
                            </div>
                          </div>
                          <motion.div
                            animate={{ rotate: isTopicExpanded(levelId, topicIndex) ? 90 : 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                          >
                            <ChevronRight size={20} className="text-gray-400" />
                          </motion.div>
                        </div>
                      </button>

                      {/* Expandable Content */}
                      <AnimatePresence>
                        {isTopicExpanded(levelId, topicIndex) && topic.cards && (
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
                                  {card.details && (
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
                                  )}
                                  
                                  {/* Card Footer */}
                                  <div className="mt-4 pt-3 border-t border-gray-100">
                                    <span className="text-xs text-gray-500 font-medium">
                                      {card.details ? card.details.length : 0} learning objective{(card.details ? card.details.length : 0) !== 1 ? 's' : ''}
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
            Complete Physics (9702) Coverage
          </h3>
          <p className="text-emerald-100 mb-6 leading-relaxed max-w-2xl mx-auto">
            Comprehensive topic breakdown covering AS and A2 Level Physics. 
            Each learning objective is carefully structured to match the CIE syllabus requirements.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {Object.entries(physicsLevels).map(([id, level]) => {
              const totalObjectives = level.data.reduce((total, topic) => 
                total + (topic.cards ? topic.cards.reduce((cardTotal, card) => cardTotal + (card.details ? card.details.length : 0), 0) : 0), 0
              );
              
              return (
                <div key={id} className="text-center">
                  <div className="text-3xl font-bold text-white mb-2">
                    {totalObjectives}
                  </div>
                  <div className="text-emerald-100 text-sm">
                    {level.name} Objectives
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

export default PhysicsTopics;