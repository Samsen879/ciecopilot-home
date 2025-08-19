import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, BookOpen, Atom, Grid, List, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

// Import physics data
import physicsData from "../data/9702AS_A2.json";

const PhysicsTopics = () => {
  const [expandedTopics, setExpandedTopics] = useState(new Set());
  const [selectedLevel, setSelectedLevel] = useState('all');

  // Physics data mapping for 9702
  const physicsLevels = {
    'as': {
      name: 'AS Level Physics',
      data: physicsData.Physics_9702?.AS_Level || [],
      color: 'from-emerald-500 to-teal-600',
      bgColor: 'from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30'
    },
    'a2': {
      name: 'A2 Level Physics',
      data: physicsData.Physics_9702?.A2_Level || [],
      color: 'from-teal-500 to-cyan-600',
      bgColor: 'from-teal-50 to-cyan-50 dark:from-teal-900/30 dark:to-cyan-900/30'
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/20 dark:from-gray-900 dark:via-emerald-900/20 dark:to-teal-900/20 pt-20 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-6 py-12">
        
        {/* Navigation */}
        <div className="mb-8">
          <Link
            to="/topics"
            className="inline-flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors duration-200 group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="font-medium">Back to Subjects</span>
          </Link>
        </div>

        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg mr-4">
              <Atom size={48} className="text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 tracking-tight transition-colors duration-200">
                Physics Topics
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mt-2 transition-colors duration-200">
                CIE A Level Physics (9702)
              </p>
            </div>
          </div>
          
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed transition-colors duration-200">
            Comprehensive coverage of AS and A2 Level Physics topics including mechanics, waves, electricity, atomic physics and more
          </p>
          
          {/* Level Filter Tabs */}
          <div className="inline-flex bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-2 border border-white/20 dark:border-gray-700/50 shadow-sm transition-colors duration-200">
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
                    : 'text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
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
                <div className={`bg-gradient-to-r ${level.bgColor} rounded-2xl p-8 border border-white/20 dark:border-gray-700/50 shadow-sm transition-colors duration-200`}>
                  <div className="flex items-center space-x-4">
                    <div className={`flex items-center justify-center w-16 h-16 bg-gradient-to-br ${level.color} rounded-2xl shadow-lg`}>
                      <Atom size={32} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 transition-colors duration-200">
                        {level.name}
                      </h2>
                      <div className="flex items-center space-x-6 text-gray-600 dark:text-gray-300 transition-colors duration-200">
                        <div className="flex items-center space-x-2">
                          <Grid size={18} />
                          <span>{level.data.length} topics</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <List size={18} />
                          <span>
                            {level.data.length} learning objectives
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Topics Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {level.data.map((topicName, topicIndex) => {
                    const topicId = topicName.toLowerCase().replace(/\s+/g, '-').replace(/[.,]/g, '');
                    const topicPath = `/topic/physics/${levelId === 'as' ? 'as-level' : 'a2-level'}/${topicId}`;
                    
                    return (
                      <motion.div
                        key={topicIndex}
                        variants={cardVariants}
                        className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-sm hover:shadow-lg dark:hover:shadow-2xl transition-all duration-300 overflow-hidden"
                      >
                        {/* Topic Card */}
                        <Link
                          to={topicPath}
                          className="block p-6 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-inset"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-800 dark:to-teal-800 rounded-xl transition-colors duration-200">
                                <BookOpen size={24} className="text-emerald-600 dark:text-emerald-400" />
                              </div>
                              <div className="flex-1">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 transition-colors duration-200">
                                  {topicName}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300 transition-colors duration-200">
                                  CIE 9702 {level.name} Topic
                                </p>
                              </div>
                            </div>
                            <ChevronRight size={20} className="text-gray-400 dark:text-gray-500 group-hover:text-emerald-500 transition-colors duration-200" />
                          </div>
                          
                          {/* Topic Preview */}
                          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-600 transition-colors duration-200">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">
                                Click to explore topic details
                              </span>
                              <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
                                <BookOpen size={16} />
                                <span>Study Now</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
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
          className="mt-16 bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-700 dark:to-teal-700 rounded-2xl p-8 text-center text-white shadow-lg transition-colors duration-200"
        >
          <h3 className="text-2xl font-bold mb-4">
            Complete A Level Physics Coverage
          </h3>
          <p className="text-emerald-100 dark:text-emerald-200 mb-6 leading-relaxed max-w-2xl mx-auto transition-colors duration-200">
            Comprehensive topic breakdown covering all aspects of AS and A2 Level Physics. 
            Each learning objective is structured to match the CIE 9702 syllabus requirements.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-lg mx-auto">
            {Object.entries(physicsLevels).map(([id, level]) => {
              const totalTopics = level.data.length;
              
              return (
                <div key={id} className="text-center">
                  <div className="text-3xl font-bold text-white mb-2">
                    {totalTopics}
                  </div>
                  <div className="text-emerald-100 dark:text-emerald-200 text-sm transition-colors duration-200">
                    {level.name} Topics
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