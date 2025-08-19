import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, BookOpen, FileText, AlertCircle, Grid, List } from 'lucide-react';
import TopicCard from '../components/TopicCard';
import { db } from '../utils/supabase';
import normalizeTopicId from '../utils/normalizeTopicId';

// JSON数据作为后备 - 当数据库为空时使用
// 确保路径正确
import paper1Data from '../data/9709paper1.json';
import paper3Data from '../data/9709paper3.json';
import paper4Data from '../data/9709paper4.json';
import paper5Data from '../data/9709paper5.json';
import fp1Data from '../data/9231FP1-syllabus.json';
import fp2Data from '../data/9231FP2-syllabus.json';
import fmData from '../data/9231FM-syllabus.json';
import fsData from '../data/9231FS-syllabus.json';

const PaperPage = () => {
  const { subject, paper } = useParams();
  const navigate = useNavigate();
  const [paperData, setPaperData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [dataSource, setDataSource] = useState('unknown'); // 'database' | 'json' | 'unknown'

  // Subject name mapping
  const subjectNames = {
    '9709': 'Mathematics',
    '9231': 'Further Mathematics',
    '9702': 'Physics',
    '9698': 'Psychology',
    '9708': 'Economics'
  };

  // Paper name mapping for JSON fallback
  const paperNames = {
    'p1': 'Pure Mathematics 1',
    'p2': 'Pure Mathematics 2', 
    'p3': 'Pure Mathematics 3',
    'p4': 'Mechanics',
    'p5': 'Statistics 1',
    // Further Mathematics papers
    'fp1': 'Further Pure Mathematics 1',
    'fp2': 'Further Pure Mathematics 2',
    'fm': 'Further Mechanics',
    'fs': 'Further Statistics',
    // Generic paper names
    'paper1': 'Paper 1',
    'paper2': 'Paper 2',
    'paper3': 'Paper 3',
    'paper4': 'Paper 4',
    'paper5': 'Paper 5',
    'paper6': 'Paper 6'
  };

  // Animation variants
  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: "easeOut" }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  // Load data from database first, fallback to JSON if needed
  useEffect(() => {
    const loadPaperData = async () => {
      setLoading(true);
      
      try {
        // 尝试从数据库获取数据
        const databaseResult = await loadFromDatabase();
        if (databaseResult.success && databaseResult.data.topics.length > 0) {
          setPaperData(databaseResult.data);
          setDataSource('database');
          setNotFound(false);
        } else {
          // 回退到JSON数据
          console.log('Database empty or failed, falling back to JSON data...');
          const jsonResult = loadFromJSON();
          if (jsonResult.success) {
            setPaperData(jsonResult.data);
            setDataSource('json');
            setNotFound(false);
          } else {
            setNotFound(true);
          }
        }
      } catch (error) {
        console.error('Error loading paper data:', error);
        // 尝试JSON回退
        const jsonResult = loadFromJSON();
        if (jsonResult.success) {
          setPaperData(jsonResult.data);
          setDataSource('json');
          setNotFound(false);
        } else {
          setNotFound(true);
        }
      }
      
      setLoading(false);
    };

    loadPaperData();
  }, [subject, paper]);

  // 从数据库加载数据
  const loadFromDatabase = async () => {
    try {
      // 1. 获取学科信息（使用 subject_code 与路由参数 subject 对应）
      const { data: subjects, error: subjectsError } = await db
        .from('subjects')
        .select('*')
        .eq('subject_code', subject)
        .single();

      if (subjectsError || !subjects) {
        throw new Error(`Subject ${subject} not found in database`);
      }

      // 2. 获取试卷信息（应用内以 name 作为路由标识，例如 paper1/paper3）
      let paperRecord = null;
      {
        const { data, error } = await db
          .from('papers')
          .select('*')
          .eq('subject_id', subjects.id)
          .eq('name', paper)
          .single();
        if (!error && data) {
          paperRecord = data;
        }
      }
      if (!paperRecord) {
        // 兼容性：有些数据脚本可能使用 code 字段
        const { data: fallbackPaper, error: fallbackError } = await db
          .from('papers')
          .select('*')
          .eq('subject_id', subjects.id)
          .eq('code', paper)
          .single();
        if (fallbackError || !fallbackPaper) {
          throw new Error(`Paper ${paper} not found for subject ${subject}`);
        }
        paperRecord = fallbackPaper;
      }

      // 3. 获取主题数据（topics 表字段：title、topic_id、content 等）
      const { data: topics, error: topicsError } = await db
        .from('topics')
        .select('*')
        .eq('paper_id', paperRecord.id)
        .order('title', { ascending: true });

      if (topicsError) {
        throw new Error(`Error fetching topics: ${topicsError.message}`);
      }

      // 转换主题数据格式
      const transformedTopics = (topics || []).map(topic => {
        const topicTitle = topic.title || topic.topic_id || 'Untitled Topic';
        const content = topic.content || {};
        const keyPoints = Array.isArray(content.keyPoints) ? content.keyPoints : [];
        return {
          id: normalizeTopicId(String(topicTitle)),
          name: String(topicTitle),
          description: content.description || `Master ${topicTitle} with comprehensive learning materials.`,
          cardCount: keyPoints.length || 0,
          totalPoints: keyPoints.length || 0
        };
      });

      return {
        success: true,
        data: {
          name: paperRecord.name || paperRecord.description || paperNames[paper] || `Paper ${paper}`,
          description: paperRecord.description || `Learn ${subjects.name} ${paperRecord.name} with comprehensive study materials.`,
          topics: transformedTopics,
          totalCards: transformedTopics.reduce((total, topic) => total + topic.cardCount, 0),
          totalPoints: transformedTopics.reduce((total, topic) => total + topic.totalPoints, 0)
        }
      };
    } catch (error) {
      console.error('Database loading failed:', error);
      return { success: false, error: error.message };
    }
  };

  // 从JSON文件加载数据（原有逻辑）
  const loadFromJSON = () => {
    try {
      // Handle different papers for 9709 Mathematics and 9231 Further Mathematics
      if (subject === '9709') {
        let topicsArray = null;
        let description = '';
        
        switch (paper) {
          case 'p1':
          case 'paper1':
            topicsArray = paper1Data["9709_Paper_1_Pure_Mathematics_1"];
            description = 'Foundational pure mathematics covering algebraic and basic calculus concepts essential for A Level mathematics.';
            break;
          case 'p3':
          case 'paper3':
            topicsArray = paper3Data["9709_Paper_3_Pure_Mathematics_3"];
            description = 'Advanced pure mathematics including complex numbers, vectors, differential equations, and advanced calculus techniques.';
            break;
          case 'p4':
          case 'paper4':
            topicsArray = paper4Data["9709_Paper_4_Mechanics"];
            description = 'Applied mathematics focusing on forces, motion, energy, and mechanical systems in the physical world.';
            break;
          case 'p5':
          case 'paper5':
            topicsArray = paper5Data["9709_Paper_5_Probability_and_Statistics_1"];
            description = 'Introduction to statistical methods, probability theory, and data analysis techniques.';
            break;
          default:
            return { success: false, error: `Paper ${paper} not supported for subject ${subject}` };
        }
        
        if (topicsArray) {
          const transformedTopics = topicsArray.map(topicData => ({
            id: normalizeTopicId(topicData.topic),
            name: topicData.topic,
            description: `Master ${topicData.topic} through ${topicData.cards?.length || 0} concept cards with detailed syllabus coverage.`,
            cardCount: topicData.cards?.length || 0,
            totalPoints: topicData.cards?.reduce((total, card) => total + (card.details?.length || 0), 0) || 0
          }));

          return {
            success: true,
            data: {
              name: paperNames[paper] || paperNames[paper.replace('paper', 'p')] || `Paper ${paper}`,
              description: description,
              topics: transformedTopics,
              totalCards: transformedTopics.reduce((total, topic) => total + topic.cardCount, 0),
              totalPoints: transformedTopics.reduce((total, topic) => total + topic.totalPoints, 0)
            }
          };
        }
      } else if (subject === '9231') {
        let topicsArray = null;
        let description = '';
        
        switch (paper) {
          case 'p1':
          case 'paper1':
            topicsArray = fp1Data["9231_Paper_1_Further_Pure_Mathematics_1"];
            description = 'Advanced pure mathematics building on A Level foundations with sophisticated algebraic and analytical techniques.';
            break;
          case 'p2':
          case 'paper2':
            topicsArray = fp2Data["9231_Paper_2_Further_Pure_Mathematics_2"];
            description = 'Complex mathematical concepts including hyperbolic functions, advanced matrices, and differential equations.';
            break;
          case 'p3':
          case 'paper3':
            topicsArray = fmData["9231_Paper_3_Further_Mechanics"];
            description = 'Advanced mechanics covering projectile motion, rigid body equilibrium, and complex force systems.';
            break;
          case 'p4':
          case 'paper4':
            topicsArray = fsData["9231_Paper_4_Further_Probability_and_Statistics"];
            description = 'Advanced statistical methods, hypothesis testing, and probability generating functions.';
            break;
          default:
            return { success: false, error: `Paper ${paper} not supported for subject ${subject}` };
        }
        
        if (topicsArray) {
          const transformedTopics = topicsArray.map(topicData => ({
            id: normalizeTopicId(topicData.topic),
            name: topicData.topic,
            description: `Master ${topicData.topic} through ${topicData.cards?.length || 0} concept cards with detailed syllabus coverage.`,
            cardCount: topicData.cards?.length || 0,
            totalPoints: topicData.cards?.reduce((total, card) => total + (card.details?.length || 0), 0) || 0
          }));

          return {
            success: true,
            data: {
              name: paperNames[paper] || paperNames[paper.replace('paper', 'p')] || `Paper ${paper}`,
              description: description,
              topics: transformedTopics,
              totalCards: transformedTopics.reduce((total, topic) => total + topic.cardCount, 0),
              totalPoints: transformedTopics.reduce((total, topic) => total + topic.totalPoints, 0)
            }
          };
        }
      }
      
      return { success: false, error: `Subject ${subject} not supported in JSON fallback` };
    } catch (error) {
      console.error('JSON loading failed:', error);
      return { success: false, error: error.message };
    }
  };

  // Handle back navigation
  const handleBack = () => {
    navigate(`/study-hub/${subject}`);
  };

  // Handle syllabus download (placeholder)
  const handleSyllabusDownload = () => {
    console.log(`Downloading syllabus for ${subject}`);
    alert('Syllabus download will be implemented in future updates');
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading paper content...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <motion.div
          initial="initial"
          animate="animate"
          variants={fadeInUp}
          className="text-center max-w-md mx-auto px-6"
        >
          <div className="flex items-center justify-center w-20 h-20 bg-red-50 dark:bg-red-900/30 rounded-full mb-6 mx-auto">
            <AlertCircle size={40} className="text-red-500 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Paper Not Found</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            Sorry, we couldn't find the paper you're looking for. The subject code "{subject}" or paper "{paper}" might not be available yet.
          </p>
          <button
            onClick={handleBack}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300 font-semibold"
          >
            <ArrowLeft size={20} />
            <span>Go Back</span>
          </button>
        </motion.div>
      </div>
    );
  }

  const subjectName = subjectNames[subject] || `Subject ${subject}`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header Section */}
      <section className="bg-gradient-to-r from-blue-50 to-sky-50 dark:from-slate-800 dark:to-slate-700 pt-24 pb-12">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="space-y-8"
          >
            {/* Back Button */}
            <motion.button
              variants={fadeInUp}
              onClick={handleBack}
              className="inline-flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">Back to {subjectName}</span>
            </motion.button>

            {/* Subject and Paper Title */}
            <motion.div variants={fadeInUp} className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl">
                  <BookOpen size={32} className="text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                    {subjectName} ({subject})
                  </h1>
                  <h2 className="text-xl md:text-2xl text-blue-600 dark:text-blue-400 font-semibold">
                    {paperData.name}
                  </h2>
                </div>
              </div>
            </motion.div>

            {/* Paper Description */}
            <motion.div variants={fadeInUp} className="max-w-4xl">
              <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                {paperData.description}
              </p>
              {/* Data source indicator */}
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {dataSource === 'database' && '📊 Content from database'}
                {dataSource === 'json' && '📁 Content from local files'}
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleSyllabusDownload}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-2 border-blue-500 dark:border-blue-400 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-700 hover:border-blue-600 dark:hover:border-blue-300 transition-all duration-300 font-semibold shadow-sm"
              >
                <Download size={20} />
                <span>Download Syllabus</span>
              </button>
              
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-2">
                  <FileText size={20} />
                  <span>{paperData.topics.length} topics</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Grid size={20} />
                  <span>{paperData.totalCards || 0} concept cards</span>
                </div>
                <div className="flex items-center space-x-2">
                  <List size={20} />
                  <span>{paperData.totalPoints || 0} syllabus points</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Topics Section */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="space-y-12"
          >
            {/* Section Title */}
            <motion.div variants={fadeInUp} className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Available Topics
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-sky-400 mx-auto rounded-full" />
            </motion.div>

            {/* Topics Grid */}
            {paperData.topics.length > 0 ? (
              <motion.div
                variants={staggerContainer}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {paperData.topics.map((topic, index) => (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    subject={subject}
                    paper={paper}
                    difficulty="Medium"
                    estimatedTime="30 min"
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                variants={fadeInUp}
                className="text-center p-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg"
              >
                <h3 className="text-2xl font-semibold text-gray-700 dark:text-gray-300">No Topics Available</h3>
                <p className="mt-2 text-gray-500 dark:text-gray-400">
                  Content for this paper is being prepared. Please check back later.
                </p>
              </motion.div>
            )}

            {/* Additional Info */}
            <motion.div
              variants={fadeInUp}
              className="bg-gradient-to-r from-blue-50 to-sky-50 dark:from-slate-800 dark:to-slate-700 rounded-2xl p-8 text-center border border-blue-100 dark:border-slate-600"
            >
              <h3 className="text-xl font-bold text-blue-800 dark:text-blue-300 mb-4">
                Ready to start your learning journey?
              </h3>
              <p className="text-blue-700 dark:text-blue-400 leading-relaxed mb-6">
                Choose any topic above to begin studying with our AI-powered learning system, 
                specifically designed for CIE {subjectName} {paperData.name}.
              </p>
              <div className="flex items-center justify-center space-x-8 text-sm text-blue-600 dark:text-blue-400">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Official CIE Syllabus</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>Past Paper Questions</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span>AI Explanations</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default PaperPage;
