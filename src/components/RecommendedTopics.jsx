import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Search, BookOpen, Clock } from 'lucide-react';
import { useSearchHistory } from '../hooks/useLocalStorage';
import { Link } from 'react-router-dom';

const RecommendedTopics = ({ className = '' }) => {
  const { getRecentSearches, getPopularSearches } = useSearchHistory();
  
  // Sample topic data - in real app this would come from API/database
  const allTopics = useMemo(() => [
    { id: 'quadratic-equations', name: 'Quadratic Equations', subject: '9709', paper: 'p1', difficulty: 'Medium', estimatedTime: '45 min' },
    { id: 'calculus-derivatives', name: 'Calculus Derivatives', subject: '9709', paper: 'p1', difficulty: 'Hard', estimatedTime: '60 min' },
    { id: 'trigonometry', name: 'Trigonometry', subject: '9709', paper: 'p1', difficulty: 'Easy', estimatedTime: '30 min' },
    { id: 'mechanics-forces', name: 'Forces and Motion', subject: '9702', paper: 'p1', difficulty: 'Medium', estimatedTime: '50 min' },
    { id: 'waves-oscillations', name: 'Waves & Oscillations', subject: '9702', paper: 'p2', difficulty: 'Hard', estimatedTime: '55 min' },
  ], []);

  const recentSearches = getRecentSearches(5);
  const popularSearches = getPopularSearches(3);

  // Generate recommendations based on search history
  const recommendations = useMemo(() => {
    const searchTerms = [...recentSearches, ...popularSearches].map(s => s.query.toLowerCase());
    
    return allTopics.filter(topic => 
      searchTerms.some(term => 
        topic.name.toLowerCase().includes(term) ||
        topic.subject.includes(term) ||
        topic.id.includes(term.replace(/\s+/g, '-'))
      )
    ).slice(0, 4);
  }, [recentSearches, popularSearches, allTopics]);

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 
                 rounded-xl p-6 border border-blue-100 dark:border-blue-800 ${className}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Recommended for You
        </h3>
        <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
          Based on your searches
        </span>
      </div>

      <div className="grid gap-3">
        {recommendations.map((topic, index) => (
          <motion.div
            key={topic.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link
              to={`/topic/${topic.subject}/p1/${topic.id}`}
              className="block p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 
                       hover:shadow-md hover:border-blue-200 dark:hover:border-blue-600 transition-all duration-200
                       group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {topic.name}
                  </h4>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {topic.subject}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {topic.estimatedTime}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      topic.difficulty === 'Easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      topic.difficulty === 'Hard' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {topic.difficulty}
                    </span>
                  </div>
                </div>
                <Search className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {recentSearches.length > 0 && (
        <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Recent searches:</p>
          <div className="flex flex-wrap gap-2">
            {recentSearches.slice(0, 3).map((search, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 
                         text-xs rounded-full"
              >
                {search.query}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default RecommendedTopics; 