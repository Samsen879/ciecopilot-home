import { useState, useEffect } from 'react';

export const useLocalStorage = (key, initialValue) => {
  // Get from local storage then parse stored json or return initialValue
  const [storedValue, setStoredValue] = useState(() => {
    try {
      // 添加安全检查
      if (typeof window === 'undefined') {
        return initialValue;
      }
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error loading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      // 添加安全检查
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
};

// Progress tracking specific hooks
export const useTopicProgress = (topicId) => {
  const [progress, setProgress] = useLocalStorage(`topic-progress-${topicId}`, {
    completed: false,
    score: 0,
    timeSpent: 0,
    lastStudied: null,
    attempts: 0,
    mastery: 0,
    errors: []
  });

  const updateProgress = (updates) => {
    setProgress(prev => ({
      ...prev,
      ...updates,
      lastStudied: new Date().toISOString(),
      attempts: prev.attempts + (updates.score !== undefined ? 1 : 0)
    }));
  };

  const markCompleted = (score = 100) => {
    updateProgress({
      completed: true,
      score,
      mastery: Math.min(100, (progress.mastery + score) / 2)
    });
  };

  const addError = (question, userAnswer, correctAnswer, errorType) => {
    updateProgress({
      errors: [...progress.errors, {
        id: Date.now(),
        question,
        userAnswer,
        correctAnswer,
        errorType,
        timestamp: new Date().toISOString()
      }]
    });
  };

  return {
    progress,
    updateProgress,
    markCompleted,
    addError
  };
};

// Error book management
export const useErrorBook = () => {
  const [errors, setErrors] = useLocalStorage('global-error-book', []);

  const addToErrorBook = (question, userAnswer, correctAnswer, topicId, errorType = 'unknown') => {
    const newError = {
      id: Date.now(),
      question,
      userAnswer,
      correctAnswer,
      topicId,
      errorType,
      timestamp: new Date().toISOString(),
      reviewed: false
    };
    
    setErrors(prev => [newError, ...prev]);
    return newError;
  };

  const markAsReviewed = (errorId) => {
    setErrors(prev => prev.map(error => 
      error.id === errorId ? { ...error, reviewed: true } : error
    ));
  };

  const removeError = (errorId) => {
    setErrors(prev => prev.filter(error => error.id !== errorId));
  };

  return {
    errors,
    addToErrorBook,
    markAsReviewed,
    removeError
  };
};

// Search history tracking
export const useSearchHistory = () => {
  const [searchHistory, setSearchHistory] = useLocalStorage('search-history', []);

  const addToHistory = (query) => {
    if (!query.trim()) return;
    
    setSearchHistory(prev => {
      const filtered = prev.filter(item => item.query !== query);
      return [
        { query, timestamp: new Date().toISOString(), count: 1 },
        ...filtered
      ].slice(0, 50); // Keep only last 50 searches
    });
  };

  const getRecentSearches = (limit = 10) => {
    return searchHistory.slice(0, limit);
  };

  const getPopularSearches = (limit = 5) => {
    return searchHistory
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  };

  return {
    searchHistory,
    addToHistory,
    getRecentSearches,
    getPopularSearches
  };
}; 