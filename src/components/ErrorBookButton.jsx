import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookmarkPlus, Check, AlertCircle } from 'lucide-react';
import { useErrorBook } from '../hooks/useLocalStorage';

const ErrorBookButton = ({ 
  question, 
  userAnswer, 
  correctAnswer, 
  topicId,
  errorType = 'unknown',
  className = ''
}) => {
  const { addToErrorBook } = useErrorBook();
  const [isAdded, setIsAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddToErrorBook = async () => {
    if (isAdded || isLoading) return;
    
    setIsLoading(true);
    try {
      await addToErrorBook(question, userAnswer, correctAnswer, topicId, errorType);
      setIsAdded(true);
      
      // Reset after 3 seconds
      setTimeout(() => setIsAdded(false), 3000);
    } catch (error) {
      console.error('Failed to add to error book:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.button
      onClick={handleAddToErrorBook}
      disabled={isAdded || isLoading}
      className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg
                 border transition-all duration-200 ${
                   isAdded 
                     ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/30 dark:text-green-400' 
                     : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-700 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-800/40'
                 } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      whileHover={!isAdded ? { scale: 1.02 } : {}}
      whileTap={!isAdded ? { scale: 0.98 } : {}}
    >
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <AlertCircle className="w-4 h-4" />
          </motion.div>
        ) : isAdded ? (
          <motion.div
            key="added"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="flex items-center gap-1"
          >
            <Check className="w-4 h-4" />
            <span>Added!</span>
          </motion.div>
        ) : (
          <motion.div
            key="add"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1"
          >
            <BookmarkPlus className="w-4 h-4" />
            <span>Add to Error Book</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export default ErrorBookButton; 