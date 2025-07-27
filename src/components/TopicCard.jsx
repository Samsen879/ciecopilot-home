import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, Target, ChevronRight, CheckCircle } from 'lucide-react';
import { useTopicProgress } from '../hooks/useLocalStorage';
import ProgressBar from './ProgressBar';

const TopicCard = memo(({
  // Support both topic object and individual props
  topic,
  id,
  name,
  description,
  cardCount = 0,
  totalPoints = 0,
  subject,
  paper,
  difficulty = 'Medium',
  estimatedTime = '30 min',
  className = ''
}) => {
  // If topic object is provided, use its properties
  const topicId = topic?.id || id;
  const topicName = topic?.name || name;
  const topicDescription = topic?.description || description;
  const topicCardCount = topic?.cardCount || cardCount;
  const topicTotalPoints = topic?.totalPoints || totalPoints;
  // Progress tracking
  const { progress } = useTopicProgress(`${subject}-${paper}-${topicId}`);
  
  // Memoized calculation
  const cardPath = React.useMemo(() => 
    `/topic/${subject}/${paper}/${topicId}`, 
    [subject, paper, topicId]
  );

  // Animation variants - memoized to prevent recreation
  const cardVariants = React.useMemo(() => ({
    initial: {
      opacity: 0,
      y: 20,
      scale: 0.95
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    },
    hover: {
      y: -4,
      scale: 1.02,
      transition: {
        duration: 0.2,
        ease: "easeInOut"
      }
    }
  }), []);

  // Difficulty color mapping - memoized
  const difficultyColor = React.useMemo(() => {
    switch (difficulty) {
      case 'Easy': return 'from-green-100 to-green-200 text-green-800';
      case 'Hard': return 'from-red-100 to-red-200 text-red-800';
      default: return 'from-yellow-100 to-yellow-200 text-yellow-800';
    }
  }, [difficulty]);

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      className={`group ${className}`}
    >
      <Link to={cardPath}>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm 
                       hover:shadow-md transition-all duration-300 h-full flex flex-col">
          
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400
                           transition-colors duration-200 line-clamp-2">
                {topicName}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed">
                {topicDescription}
              </p>
            </div>
            <ChevronRight 
              className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400
                       group-hover:translate-x-1 transition-all duration-200 flex-shrink-0 ml-2" 
            />
          </div>

          {/* Progress Section - New Addition */}
          {(progress.mastery > 0 || progress.completed) && (
            <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                {progress.completed && (
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                )}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {progress.completed ? 'Completed' : 'In Progress'}
                </span>
                {progress.attempts > 0 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    • {progress.attempts} attempt{progress.attempts !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <ProgressBar 
                value={progress.mastery} 
                size="small" 
                color={progress.completed ? 'green' : 'blue'}
                showPercentage={false}
              />
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  Mastery: {Math.round(progress.mastery)}%
                </span>
                {progress.lastStudied && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(progress.lastStudied).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
            <div className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              <span>{topicCardCount} cards</span>
            </div>
            <div className="flex items-center gap-1">
              <Target className="w-4 h-4" />
              <span>{topicTotalPoints} points</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{estimatedTime}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
            <span className={`px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${difficultyColor}`}>
              {difficulty}
            </span>
            <div className="text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300
                          transition-colors duration-200">
              Learn more →
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
});

TopicCard.displayName = 'TopicCard';

export default TopicCard;
