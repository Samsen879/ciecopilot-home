import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, BookOpen, FileText, Grid, List, Atom } from 'lucide-react';
import TopicCard from '../components/TopicCard';
// import physicsData from '../data/9702AS_A2.json';
const physicsData = {};

const PhysicsASLevel = () => {
  const navigate = useNavigate();
  
  // Extract AS level topics
  const asLevelTopics = physicsData.Physics_9702.AS_Level;
  
  // Transform topics to match TopicCard structure
  const transformedTopics = asLevelTopics.map((topic, index) => ({
    id: topic.toLowerCase().replace(/\s+/g, '-').replace(/[.,]/g, ''),
    name: topic,
    description: `Master ${topic} concepts with comprehensive study materials.`,
    cardCount: 0, // Placeholder for future concept cards
    totalPoints: 0 // Placeholder for future syllabus points
  }));

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

  // Handle back navigation
  const handleBack = () => {
    navigate(-1);
  };

  // Handle syllabus download (placeholder)
  const handleSyllabusDownload = () => {
    console.log('Downloading syllabus for Physics AS Level');
    alert('Syllabus download will be implemented in future updates');
  };

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

            {/* Subject and Level Title */}
            <motion.div variants={fadeInUp} className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl">
                  <Atom size={32} className="text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                    Physics (9702)
                  </h1>
                  <h2 className="text-xl md:text-2xl text-blue-600 font-semibold">
                    AS Level
                  </h2>
                </div>
              </div>
            </motion.div>

            {/* Level Description */}
            <motion.div variants={fadeInUp} className="max-w-4xl">
              <p className="text-lg text-gray-700 leading-relaxed">
                Complete topic coverage for Cambridge International AS Level Physics. 
                Build strong foundations in fundamental physics concepts including mechanics, 
                waves, electricity, and particle physics.
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
                  <span>{asLevelTopics.length} topics</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Grid size={20} />
                  <span>0 concept cards</span>
                </div>
                <div className="flex items-center space-x-2">
                  <List size={20} />
                  <span>0 syllabus points</span>
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
              {transformedTopics.map((topic, index) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  subject="9702"
                  paper="as"
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
                Ready to start your AS Level Physics journey?
              </h3>
              <p className="text-blue-700 leading-relaxed mb-6">
                Choose any topic above to begin studying with our AI-powered learning system, 
                specifically designed for CIE Physics AS Level.
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

export default PhysicsASLevel; 