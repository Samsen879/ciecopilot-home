import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, BookOpen, FileText, Grid, List, Waves } from 'lucide-react';
import TopicCard from '../components/TopicCard';
import physicsData from '../data/9702AS+A2.json';

const PhysicsA2Level = () => {
  const navigate = useNavigate();
  
  // Extract A2 level topics
  const a2LevelTopics = physicsData.Physics_9702.A2_Level;
  
  // Transform topics to match TopicCard structure
  const transformedTopics = a2LevelTopics.map((topic, index) => ({
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
    console.log('Downloading syllabus for Physics A2 Level');
    alert('Syllabus download will be implemented in future updates');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Section */}
      <section className="bg-gradient-to-r from-indigo-50 to-purple-50 pt-24 pb-12">
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
              className="inline-flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 transition-colors duration-200"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">Back to subjects</span>
            </motion.button>

            {/* Subject and Level Title */}
            <motion.div variants={fadeInUp} className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl">
                  <Waves size={32} className="text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                    Physics (9702)
                  </h1>
                  <h2 className="text-xl md:text-2xl text-indigo-600 font-semibold">
                    A2 Level
                  </h2>
                </div>
              </div>
            </motion.div>

            {/* Level Description */}
            <motion.div variants={fadeInUp} className="max-w-4xl">
              <p className="text-lg text-gray-700 leading-relaxed">
                Complete topic coverage for Cambridge International A Level Physics. 
                Explore advanced physics concepts including gravitational fields, thermodynamics, 
                electric fields, quantum physics, and cutting-edge topics in modern physics.
              </p>
            </motion.div>

            {/* Action Buttons */}
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleSyllabusDownload}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-white text-indigo-600 border-2 border-indigo-500 rounded-xl hover:bg-indigo-50 hover:border-indigo-600 transition-all duration-300 font-semibold shadow-sm"
              >
                <Download size={20} />
                <span>Download Syllabus</span>
              </button>
              
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 text-gray-600">
                <div className="flex items-center space-x-2">
                  <FileText size={20} />
                  <span>{a2LevelTopics.length} topics</span>
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
              <div className="w-24 h-1 bg-gradient-to-r from-indigo-500 to-purple-400 mx-auto rounded-full" />
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
                  paper="a2"
                  difficulty="Medium"
                  estimatedTime="30 min"
                />
              ))}
            </motion.div>

            {/* Additional Info */}
            <motion.div
              variants={fadeInUp}
              className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8 text-center border border-indigo-100"
            >
              <h3 className="text-xl font-bold text-indigo-800 mb-4">
                Ready to tackle advanced A2 Level Physics?
              </h3>
              <p className="text-indigo-700 leading-relaxed mb-6">
                Choose any topic above to begin studying with our AI-powered learning system, 
                specifically designed for CIE Physics A2 Level.
              </p>
              <div className="flex items-center justify-center space-x-8 text-sm text-indigo-600">
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

export default PhysicsA2Level; 