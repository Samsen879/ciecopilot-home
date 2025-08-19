import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  BookOpen, 
  Lightbulb, 
  Calculator, 
  FileText, 
  CheckCircle, 
  Clock, 
  Target,
  Play,
  Pause,
  RotateCcw,
  Search,
  MessageCircle,
  Loader2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../utils/supabase';
import { ragApi } from '../api/ragApi';
import SearchResultCard from '../components/SearchResultCard';
import physicsData from '../data/9702AS+A2.json';

const PhysicsTopicDetail = () => {
  const { subject, paper, topicId } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [studyTimer, setStudyTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [completedSections, setCompletedSections] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [chatQuery, setChatQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // 从URL参数解析主题信息
  const level = paper === 'as-level' ? 'AS_Level' : 'A2_Level';
  const levelName = paper === 'as-level' ? 'AS Level' : 'A2 Level';
  const paperCode = paper;
  
  // 查找对应的主题
  const topicData = physicsData.Physics_9702?.[level]?.find(topic => 
    topic.toLowerCase().replace(/\s+/g, '-').replace(/[.,]/g, '') === topicId
  );

  // 获取学习进度
  const { data: progressData } = useQuery({
    queryKey: ['study-progress', user?.id, 'physics', paperCode, topicId],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await db
        .from('study_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('subject', 'physics')
        .eq('paper', paperCode)
        .eq('topic_id', topicId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching progress:', error);
        return null;
      }
      return data;
    },
    enabled: !!user?.id && !!paperCode && !!topicId
  });

  // 保存学习进度
  const saveProgressMutation = useMutation({
    mutationFn: async (progressUpdate) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const progressRecord = {
        user_id: user.id,
        subject: 'physics',
        paper: paperCode,
        topic_id: topicId,
        topic_title: topicData || '',
        study_time: progressUpdate.study_time || studyTimer,
        is_completed: progressUpdate.is_completed ?? false,
        last_studied: new Date().toISOString(),
        progress_data: {
          active_tab: activeTab,
          chat_history: chatHistory.slice(-10) // 只保存最近10条聊天记录
        }
      };

      const { data, error } = await db
        .from('study_progress')
        .upsert(progressRecord, {
          onConflict: 'user_id,subject,paper,topic_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['study-progress', user?.id, 'physics', paperCode, topicId]
      });
    },
    onError: (error) => {
      console.error('Error saving progress:', error);
    }
  });

  // 从数据库加载进度数据
  useEffect(() => {
    if (progressData && !progressLoaded) {
      setStudyTimer(progressData.study_time || 0);
      setIsCompleted(progressData.is_completed || false);
      if (progressData.progress_data) {
        setActiveTab(progressData.progress_data.active_tab || 'overview');
        setChatHistory(progressData.progress_data.chat_history || []);
      }
      setProgressLoaded(true);
    }
  }, [progressData, progressLoaded]);

  // 学习计时器
  useEffect(() => {
    let interval;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setStudyTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // 自动保存进度（每30秒或状态变化时）
  useEffect(() => {
    if (!progressLoaded || !user?.id) return;
    
    const saveProgress = () => {
      saveProgressMutation.mutate({
        study_time: studyTimer
      });
    };

    // 状态变化时立即保存
    const timeoutId = setTimeout(saveProgress, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [studyTimer, activeTab, chatHistory, progressLoaded, user?.id]);

  // 定期自动保存（每30秒）
  useEffect(() => {
    if (!progressLoaded || !user?.id || !isTimerRunning) return;
    
    const interval = setInterval(() => {
      saveProgressMutation.mutate({
        study_time: studyTimer
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [isTimerRunning, progressLoaded, user?.id, studyTimer]);

  // 格式化时间
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const toggleCompletion = () => {
    const newCompletedState = !isCompleted;
    setIsCompleted(newCompletedState);
    
    // 立即保存完成状态
    if (user?.id) {
      saveProgressMutation.mutate({
        study_time: studyTimer,
        is_completed: newCompletedState
      });
    }
  };

  const resetProgress = () => {
    setStudyTimer(0);
    setIsCompleted(false);
    setIsTimerRunning(false);
    setChatHistory([]);
    
    // 重置数据库中的进度
    if (user?.id) {
      saveProgressMutation.mutate({
        study_time: 0,
        is_completed: false
      });
    }
  };

  // 切换完成状态
  const toggleSectionComplete = (sectionId) => {
    const newCompleted = new Set(completedSections);
    if (newCompleted.has(sectionId)) {
      newCompleted.delete(sectionId);
    } else {
      newCompleted.add(sectionId);
    }
    setCompletedSections(newCompleted);
  };

  // 模拟主题内容数据
  const topicContent = {
    overview: {
      description: `This topic covers the fundamental concepts of ${topicData || 'Physics'} in ${levelName} Physics.`,
      objectives: [
        `Understand the basic principles of ${topicData || 'this topic'}`,
        'Apply mathematical concepts to solve physics problems',
        'Analyze experimental data and draw conclusions',
        'Relate theoretical knowledge to real-world applications'
      ],
      duration: '2-3 hours',
      difficulty: level === 'AS_Level' ? 'Intermediate' : 'Advanced'
    },
    concepts: [
      {
        id: 'concept-1',
        title: 'Key Definitions',
        content: `Essential definitions and terminology for ${topicData || 'this topic'}.`,
        examples: [
          'Definition 1: Basic concept explanation',
          'Definition 2: Advanced concept explanation'
        ]
      },
      {
        id: 'concept-2', 
        title: 'Mathematical Relationships',
        content: 'Important equations and mathematical relationships.',
        examples: [
          'Equation 1: F = ma (Newton\'s Second Law)',
          'Equation 2: E = mc² (Mass-Energy Equivalence)'
        ]
      },
      {
        id: 'concept-3',
        title: 'Applications',
        content: 'Real-world applications and practical examples.',
        examples: [
          'Application 1: Engineering applications',
          'Application 2: Medical physics applications'
        ]
      }
    ],
    practice: [
      {
        id: 'practice-1',
        type: 'Multiple Choice',
        question: `Which of the following best describes ${topicData || 'this concept'}?`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        answer: 'Option A'
      },
      {
        id: 'practice-2',
        type: 'Calculation',
        question: 'Calculate the value using the given formula.',
        solution: 'Step-by-step solution would be provided here.'
      }
    ]
  };

  if (!topicData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/20 pt-20">
        <div className="max-w-4xl mx-auto px-6 py-12 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Topic Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            The requested physics topic could not be found.
          </p>
          <Link 
            to="/topics/physics" 
            className="inline-flex items-center space-x-2 bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Physics Topics</span>
          </Link>
        </div>
      </div>
    );
  }

  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: "easeOut" }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/20 pt-20">
      <div className="max-w-6xl mx-auto px-6 py-8">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Link 
            to="/topics/physics" 
            className="inline-flex items-center space-x-2 text-emerald-600 hover:text-emerald-700 font-medium mb-6 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Physics Topics</span>
          </Link>
          
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-8 border border-white/20 dark:border-gray-700/50 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-800 dark:to-teal-800 rounded-xl">
                    <BookOpen size={24} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      CIE 9702 {levelName} Physics
                    </span>
                  </div>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  {topicData}
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                  {topicContent.overview.description}
                </p>
                
                {/* Topic Stats */}
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
                    <Clock size={16} />
                    <span>{topicContent.overview.duration}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
                    <Target size={16} />
                    <span>{topicContent.overview.difficulty}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
                    <CheckCircle size={16} />
                    <span>{completedSections.size}/{topicContent.concepts.length} sections completed</span>
                  </div>
                  {isCompleted && (
                    <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle size={16} />
                      <span className="font-medium">Topic Completed!</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Study Timer and Progress */}
              <div className="space-y-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                    {formatTime(studyTimer)}
                  </div>
                  <div className="flex space-x-2 justify-center">
                    <button
                      onClick={toggleTimer}
                      className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      {isTimerRunning ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <button
                      onClick={resetProgress}
                      className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <RotateCcw size={16} />
                    </button>
                  </div>
                </div>
                
                {/* Topic Completion Toggle */}
                 <button
                   onClick={toggleCompletion}
                   className={`w-full p-3 rounded-xl font-medium transition-all duration-200 ${
                     isCompleted
                       ? 'bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-300 dark:border-emerald-600'
                       : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-600 hover:border-emerald-300 dark:hover:border-emerald-600'
                   }`}
                 >
                   <div className="flex items-center justify-center space-x-2">
                     <CheckCircle size={18} className={isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'} />
                     <span>{isCompleted ? 'Completed' : 'Mark Complete'}</span>
                   </div>
                 </button>
                 
                 {/* Progress Statistics */}
                 {progressData && (
                   <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4">
                     <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-3">Learning Statistics</h4>
                     <div className="space-y-2 text-sm">
                       <div className="flex justify-between">
                         <span className="text-gray-600 dark:text-gray-400">Total Study Time:</span>
                         <span className="font-medium text-blue-600 dark:text-blue-400">{formatTime(progressData.study_time || 0)}</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-gray-600 dark:text-gray-400">Last Studied:</span>
                         <span className="font-medium text-blue-600 dark:text-blue-400">
                           {progressData.last_studied ? new Date(progressData.last_studied).toLocaleDateString() : 'Never'}
                         </span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-gray-600 dark:text-gray-400">Status:</span>
                         <span className={`font-medium ${
                           progressData.is_completed 
                             ? 'text-emerald-600 dark:text-emerald-400' 
                             : 'text-orange-600 dark:text-orange-400'
                         }`}>
                           {progressData.is_completed ? 'Completed' : 'In Progress'}
                         </span>
                       </div>
                     </div>
                   </div>
                 )}
                 
                 {/* Save Status Indicator */}
                 {saveProgressMutation.isPending && (
                   <div className="flex items-center justify-center space-x-2 text-sm text-blue-600 dark:text-blue-400">
                     <Loader2 size={14} className="animate-spin" />
                     <span>Saving progress...</span>
                   </div>
                 )}
                 
                 {user && (
                   <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                     Progress auto-saved for {user.email}
                   </div>
                 )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Navigation Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-2 border border-white/20 dark:border-gray-700/50 shadow-sm">
            <div className="flex space-x-2">
              {[
                { id: 'overview', label: 'Overview', icon: BookOpen },
                { id: 'concepts', label: 'Key Concepts', icon: Lightbulb },
                { id: 'practice', label: 'Practice', icon: Calculator },
                { id: 'search', label: 'Smart Search', icon: Search },
                { id: 'chat', label: 'AI Assistant', icon: MessageCircle }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    activeTab === id
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                  }`}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Learning Objectives */}
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-8 border border-white/20 dark:border-gray-700/50 shadow-sm">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                    Learning Objectives
                  </h2>
                  <div className="grid gap-4">
                    {topicContent.overview.objectives.map((objective, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="flex items-center justify-center w-6 h-6 bg-emerald-100 dark:bg-emerald-800 rounded-full mt-0.5">
                          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                            {index + 1}
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          {objective}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'concepts' && (
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="space-y-6"
              >
                {topicContent.concepts.map((concept, index) => (
                  <motion.div
                    key={concept.id}
                    variants={fadeInUp}
                    className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-sm overflow-hidden"
                  >
                    <div className="p-8">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-800 dark:to-teal-800 rounded-xl">
                            <Lightbulb size={20} className="text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            {concept.title}
                          </h3>
                        </div>
                        <button
                          onClick={() => toggleSectionComplete(concept.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            completedSections.has(concept.id)
                              ? 'bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-emerald-100 dark:hover:bg-emerald-800 hover:text-emerald-600 dark:hover:text-emerald-400'
                          }`}
                        >
                          <CheckCircle size={20} />
                        </button>
                      </div>
                      
                      <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                        {concept.content}
                      </p>
                      
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                          Key Points:
                        </h4>
                        {concept.examples.map((example, exampleIndex) => (
                          <div key={exampleIndex} className="flex items-start space-x-3">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
                            <p className="text-gray-600 dark:text-gray-400">
                              {example}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {activeTab === 'practice' && (
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="space-y-6"
              >
                {topicContent.practice.map((question, index) => (
                  <motion.div
                    key={question.id}
                    variants={fadeInUp}
                    className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-8 border border-white/20 dark:border-gray-700/50 shadow-sm"
                  >
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-800 dark:to-indigo-800 rounded-xl">
                        <Calculator size={20} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          Question {index + 1}
                        </h3>
                        <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                          {question.type}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                      {question.question}
                    </p>
                    
                    {question.options && (
                      <div className="space-y-2 mb-4">
                        {question.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <span className="text-gray-700 dark:text-gray-300">{option}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Answer:</strong> {question.answer || question.solution}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {activeTab === 'search' && (
              <SmartSearchTab 
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                topicData={topicData}
                levelName={levelName}
              />
            )}

            {activeTab === 'chat' && (
              <AIAssistantTab 
                chatQuery={chatQuery}
                setChatQuery={setChatQuery}
                chatHistory={chatHistory}
                setChatHistory={setChatHistory}
                topicData={topicData}
                levelName={levelName}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

// Smart Search Tab Component
const SmartSearchTab = ({ searchQuery, setSearchQuery, topicData, levelName }) => {
  const { data: searchResults, isLoading, error } = useQuery({
     queryKey: ['search', searchQuery, topicData],
     queryFn: () => ragApi.search({
       q: searchQuery,
       subject_code: '9702',
       paper_code: levelName === 'AS Level' ? 'AS' : 'A2',
       topic_id: topicData,
       page: 1,
       page_size: 10
     }),
     enabled: searchQuery.length > 2
   });

  const handleSearch = (e) => {
    e.preventDefault();
    // Search is triggered automatically by the query
  };

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 shadow-sm">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search for concepts, formulas, or examples in ${topicData}...`}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
            />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Search for specific concepts, formulas, examples, or ask questions about {topicData}
          </p>
        </form>
      </div>

      {/* Search Results */}
      {searchQuery.length > 2 && (
        <div className="space-y-4">
          {isLoading && (
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-8 border border-white/20 dark:border-gray-700/50 shadow-sm text-center">
              <Loader2 className="animate-spin mx-auto mb-4 text-emerald-600" size={32} />
              <p className="text-gray-600 dark:text-gray-400">Searching for relevant content...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-2xl p-6">
              <p className="text-red-600 dark:text-red-400">Error searching: {error.message}</p>
            </div>
          )}

          {searchResults && searchResults.items && searchResults.items.length > 0 && (
             <div className="space-y-4">
               <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                 Search Results ({searchResults.items.length})
               </h3>
               {searchResults.items.map((result, index) => (
                 <SearchResultCard 
                   key={index} 
                   item={{
                     ...result,
                     snippet: result.content || result.snippet
                   }} 
                   keyword={searchQuery}
                   onJump={() => console.log('Jump to:', result)}
                 />
               ))}
             </div>
           )}

          {searchResults && searchResults.items && searchResults.items.length === 0 && !isLoading && (
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-8 border border-white/20 dark:border-gray-700/50 shadow-sm text-center">
              <Search className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-gray-600 dark:text-gray-400">No results found for "{searchQuery}"</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Try different keywords or check your spelling
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// AI Assistant Tab Component
const AIAssistantTab = ({ chatQuery, setChatQuery, chatHistory, setChatHistory, topicData, levelName }) => {
  const [isAsking, setIsAsking] = useState(false);

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!chatQuery.trim() || isAsking) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: chatQuery,
      timestamp: new Date()
    };

    setChatHistory(prev => [...prev, userMessage]);
    setIsAsking(true);

    try {
       const messages = [
         ...chatHistory.slice(-5).map(msg => ({
           role: msg.type === 'user' ? 'user' : 'assistant',
           content: msg.content
         })),
         { role: 'user', content: chatQuery }
       ];

       const response = await ragApi.chat({
         messages,
         subject_code: '9702',
         paper_code: levelName === 'AS Level' ? 'AS' : 'A2',
         topic_id: topicData,
         lang: 'en'
       });

      const aiMessage = {
         id: Date.now() + 1,
         type: 'assistant',
         content: response.message || response.content || 'I received your question but couldn\'t generate a proper response.',
         sources: response.sources || [],
         timestamp: new Date()
       };

      setChatHistory(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: 'Sorry, I encountered an error while processing your question. Please try again.',
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsAsking(false);
      setChatQuery('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Chat Interface */}
      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-gray-700/50 shadow-sm overflow-hidden">
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <MessageCircle size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold">AI Physics Assistant</h3>
              <p className="text-white/80 text-sm">Ask questions about {topicData}</p>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="h-96 overflow-y-auto p-4 space-y-4">
          {chatHistory.length === 0 && (
            <div className="text-center py-8">
              <MessageCircle className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Ask me anything about {topicData}!
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                I can help explain concepts, solve problems, or clarify doubts.
              </p>
            </div>
          )}

          {chatHistory.map((message) => (
            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-3xl rounded-2xl p-4 ${
                message.type === 'user' 
                  ? 'bg-emerald-500 text-white' 
                  : message.type === 'error'
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
              }`}>
                <p className="leading-relaxed">{message.content}</p>
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Sources:</p>
                    <div className="space-y-1">
                      {message.sources.map((source, index) => (
                        <p key={index} className="text-xs text-gray-500 dark:text-gray-500">
                          • {source.title || source.content?.substring(0, 50) + '...'}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-xs opacity-70 mt-2">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {isAsking && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-4">
                <div className="flex items-center space-x-2">
                  <Loader2 className="animate-spin" size={16} />
                  <span className="text-gray-600 dark:text-gray-400">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="border-t border-gray-200 dark:border-gray-600 p-4">
          <form onSubmit={handleAskQuestion} className="flex space-x-3">
            <input
              type="text"
              value={chatQuery}
              onChange={(e) => setChatQuery(e.target.value)}
              placeholder="Ask a question about this topic..."
              className="flex-1 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
              disabled={isAsking}
            />
            <button
              type="submit"
              disabled={!chatQuery.trim() || isAsking}
              className="px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAsking ? <Loader2 className="animate-spin" size={16} /> : 'Ask'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PhysicsTopicDetail;