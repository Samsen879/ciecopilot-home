import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Grid, List } from 'lucide-react';

const TopicCard = ({ topic, index }) => {
  const navigate = useNavigate();
  const { subject, paper } = useParams();

  // Animation variants for staggered entrance
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.5,
        delay: index * 0.1,
        ease: "easeOut"
      }
    }
  };

  const handleStartLearning = () => {
    // Navigate to topic detail page
    navigate(`/topic/${subject}/${paper}/${topic.id}`);
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ 
        y: -4,
        transition: { duration: 0.2 }
      }}
      className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all duration-300"
    >
      {/* Topic Icon */}
      <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300">
        <BookOpen size={24} className="text-blue-600" />
      </div>

      {/* Topic Title */}
      <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-700 transition-colors duration-300">
        {topic.name}
      </h3>

      {/* Topic Description */}
      {topic.description && (
        <p className="text-gray-600 text-sm leading-relaxed mb-4 group-hover:text-gray-700 transition-colors duration-300">
          {topic.description}
        </p>
      )}

      {/* Statistics */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Grid size={16} />
          <span>{topic.cardCount || 0} cards</span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <List size={16} />
          <span>{topic.totalPoints || 0} points</span>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleStartLearning}
        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-300 shadow-md hover:shadow-lg group/btn"
      >
        <span className="font-semibold">Start Learning</span>
        <ArrowRight 
          size={18} 
          className="group-hover/btn:translate-x-1 transition-transform duration-300" 
        />
      </button>

      {/* Bottom accent line */}
      <div className="mt-4 w-8 h-0.5 bg-gradient-to-r from-blue-400 to-sky-400 rounded-full group-hover:w-12 transition-all duration-300" />
    </motion.div>
  );
};

export default TopicCard;
