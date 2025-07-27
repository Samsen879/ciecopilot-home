import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, BookOpen, FileText, AlertCircle, Grid, List } from 'lucide-react';
import TopicCard from '../components/TopicCard';
import paper1Data from '../data/9709paper1.json';
import paper3Data from '../data/9709paper3.json';
import paper4Data from '../data/9709paper4.json';
import paper5Data from '../data/9709paper5.json';
import fp1Data from '../data/9231FP1-syllabus.json';
import fp2Data from '../data/9231FP2-syllabus.json';
import fmData from '../data/9231FM-syllabus.json';
import fsData from '../data/9231FS-syllabus.json';
import normalizeTopicId from '../utils/normalizeTopicId';

const PaperPage = () => {
  const { subject, paper } = useParams();
  const navigate = useNavigate();
  const [paperData, setPaperData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Subject name mapping
  const subjectNames = {
    '9709': 'Mathematics',
    '9231': 'Further Mathematics',
    '9702': 'Physics',
    '9701': 'Chemistry',
    '9700': 'Biology',
    '9698': 'Psychology',
    '9708': 'Economics'
  };

  // Paper name mapping
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
    'fs': 'Further Statistics'
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

  // Load paper data on component mount
  useEffect(() => {
    const loadPaperData = () => {
      setLoading(true);
      
      // Handle different papers for 9709 Mathematics and 9231 Further Mathematics
      if (subject === '9709') {
        let topicsArray = null;
        let dataKey = '';
        let description = '';
        
        switch (paper) {
          case 'p1':
            topicsArray = paper1Data["9709_Paper_1_Pure_Mathematics_1"];
            description = 'Foundational pure mathematics covering algebraic and basic calculus concepts essential for A Level mathematics.';
            break;
          case 'p3':
            topicsArray = paper3Data["9709_Paper_3_Pure_Mathematics_3"];
            description = 'Advanced pure mathematics including complex numbers, vectors, differential equations, and advanced calculus techniques.';
            break;
          case 'p4':
            topicsArray = paper4Data["9709_Paper_4_Mechanics"];
            description = 'Applied mathematics focusing on forces, motion, energy, and mechanical systems in the physical world.';
            break;
          case 'p5':
            topicsArray = paper5Data["9709_Paper_5_Probability_and_Statistics_1"];
            description = 'Introduction to statistical methods, probability theory, and data analysis techniques.';
            break;
          default:
            setNotFound(true);
            setLoading(false);
            return;
        }
        
        if (topicsArray) {
          // Transform the data to match our component structure
          const transformedTopics = topicsArray.map(topicData => ({
            id: normalizeTopicId(topicData.topic), // 统一 id 生成
            name: topicData.topic,
            description: `Master ${topicData.topic} through ${topicData.cards?.length || 0} concept cards with detailed syllabus coverage.`,
            cardCount: topicData.cards?.length || 0,
            totalPoints: topicData.cards?.reduce((total, card) => total + (card.details?.length || 0), 0) || 0
          }));

          setPaperData({
            name: paperNames[paper],
            description: description,
            topics: transformedTopics,
            totalCards: transformedTopics.reduce((total, topic) => total + topic.cardCount, 0),
            totalPoints: transformedTopics.reduce((total, topic) => total + topic.totalPoints, 0)
          });
          setNotFound(false);
        }
      } else if (subject === '9231') {
        let topicsArray = null;
        let dataKey = '';
        let description = '';
        
        switch (paper) {
          case 'p1':
            topicsArray = fp1Data["9231_Paper_1_Further_Pure_Mathematics_1"];
            description = 'Advanced pure mathematics building on A Level foundations with sophisticated algebraic and analytical techniques.';
            break;
          case 'p2':
            topicsArray = fp2Data["9231_Paper_2_Further_Pure_Mathematics_2"];
            description = 'Complex mathematical concepts including hyperbolic functions, advanced matrices, and differential equations.';
            break;
          case 'p3':
            topicsArray = fmData["9231_Paper_3_Further_Mechanics"];
            description = 'Advanced mechanics covering projectile motion, rigid body equilibrium, and complex force systems.';
            break;
          case 'p4':
            topicsArray = fsData["9231_Paper_4_Further_Probability_and_Statistics"];
            description = 'Advanced statistical methods, hypothesis testing, and probability generating functions.';
            break;
          default:
            setNotFound(true);
            setLoading(false);
            return;
        }
        
        if (topicsArray) {
          // Transform the data to match our component structure
          const transformedTopics = topicsArray.map(topicData => ({
            id: normalizeTopicId(topicData.topic), // 统一 id 生成
            name: topicData.topic,
            description: `Master ${topicData.topic} through ${topicData.cards?.length || 0} concept cards with detailed syllabus coverage.`,
            cardCount: topicData.cards?.length || 0,
            totalPoints: topicData.cards?.reduce((total, card) => total + (card.details?.length || 0), 0) || 0
          }));

          setPaperData({
            name: paperNames[paper],
            description: description,
            topics: transformedTopics,
            totalCards: transformedTopics.reduce((total, topic) => total + topic.cardCount, 0),
            totalPoints: transformedTopics.reduce((total, topic) => total + topic.totalPoints, 0)
          });
          setNotFound(false);
        }
      } else {
        setNotFound(true);
      }
      
      setLoading(false);
    };

    loadPaperData();
  }, [subject, paper]);

  // Handle back navigation
  const handleBack = () => {
    navigate(-1);
  };

  // Handle syllabus download (placeholder)
  const handleSyllabusDownload = () => {
    // Placeholder for syllabus download functionality
    console.log(`Downloading syllabus for ${subject}`);
    // Future implementation: trigger download
    alert('Syllabus download will be implemented in future updates');
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading paper content...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <motion.div
          initial="initial"
          animate="animate"
          variants={fadeInUp}
          className="text-center max-w-md mx-auto px-6"
        >
          <div className="flex items-center justify-center w-20 h-20 bg-red-50 rounded-full mb-6 mx-auto">
            <AlertCircle size={40} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Paper Not Found</h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
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
    <div className="min-h-screen bg-slate-50">
      {/* Header Section */}
      <section className="bg-gradient-to-r from-blue-50 to-sky-50 pt-24 pb-12">
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
              className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors duration-200"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">Back to subjects</span>
            </motion.button>

            {/* Subject and Paper Title */}
            <motion.div variants={fadeInUp} className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl">
                  <BookOpen size={32} className="text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                    {subjectName} ({subject})
                  </h1>
                  <h2 className="text-xl md:text-2xl text-blue-600 font-semibold">
                    {paperData.name}
                  </h2>
                </div>
              </div>
            </motion.div>

            {/* Paper Description */}
            <motion.div variants={fadeInUp} className="max-w-4xl">
              <p className="text-lg text-gray-700 leading-relaxed">
                {paperData.description}
              </p>
            </motion.div>

            {/* Action Buttons */}
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleSyllabusDownload}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-white text-blue-600 border-2 border-blue-500 rounded-xl hover:bg-blue-50 hover:border-blue-600 transition-all duration-300 font-semibold shadow-sm"
              >
                <Download size={20} />
                <span>Download Syllabus</span>
              </button>
              
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 text-gray-600">
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
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Available Topics
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-sky-400 mx-auto rounded-full" />
            </motion.div>

            {/* Topics Grid */}
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

            {/* Additional Info */}
            <motion.div
              variants={fadeInUp}
              className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-2xl p-8 text-center border border-blue-100"
            >
              <h3 className="text-xl font-bold text-blue-800 mb-4">
                Ready to start your learning journey?
              </h3>
              <p className="text-blue-700 leading-relaxed mb-6">
                Choose any topic above to begin studying with our AI-powered learning system, 
                specifically designed for CIE {subjectName} {paperData.name}.
              </p>
              <div className="flex items-center justify-center space-x-8 text-sm text-blue-600">
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