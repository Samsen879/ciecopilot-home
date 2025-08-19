import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, BookOpen, FileText, Zap, Calculator, BarChart3, Clock } from 'lucide-react';
import { useSearchHistory } from '../hooks/useLocalStorage';

// Import all data for searching
import paper1Data from '../data/9709paper1.json';
import paper3Data from '../data/9709paper3.json';
import paper4Data from '../data/9709paper4.json';
import paper5Data from '../data/9709paper5.json';
import fp1Data from '../data/9231FP1-syllabus.json';
import fp2Data from '../data/9231FP2-syllabus.json';
import fmData from '../data/9231FM-syllabus.json';
import fsData from '../data/9231FS-syllabus.json';
import physicsData from '../data/9702AS+A2.json';

const SearchBox = ({ className = '', placeholder = "Search topics, subjects..." }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  
  // Search history hook
  const { addToHistory } = useSearchHistory();

  // 安全的数据获取函数
  const safeGetData = useCallback((dataObj, key) => {
    try {
      return dataObj && typeof dataObj === 'object' ? (dataObj[key] || []) : [];
    } catch (e) {
      console.warn('Error accessing data:', e);
      return [];
    }
  }, []);

  // 创建搜索索引 - 修复依赖问题
  const searchIndex = useMemo(() => {
    const index = [];
    
    try {
      // Mathematics 9709 Papers
      const mathPapers = [
        { code: 'p1', name: 'Pure Mathematics 1', data: safeGetData(paper1Data, '9709_Paper_1_Pure_Mathematics_1') },
        { code: 'p3', name: 'Pure Mathematics 3', data: safeGetData(paper3Data, '9709_Paper_3_Pure_Mathematics_3') },
        { code: 'p4', name: 'Mechanics', data: safeGetData(paper4Data, '9709_Paper_4_Mechanics') },
        { code: 'p5', name: 'Statistics 1', data: safeGetData(paper5Data, '9709_Paper_5_Probability_and_Statistics_1') }
      ];

      mathPapers.forEach(paper => {
        if (Array.isArray(paper.data)) {
          paper.data.forEach(topic => {
            if (topic && topic.topic) {
              index.push({
                id: `math-${paper.code}-${topic.topic.toLowerCase().replace(/\s+/g, '-')}`,
                title: topic.topic,
                description: topic.cards?.[0]?.details?.[0] || 'Mathematics topic',
                subject: 'Mathematics',
                subjectCode: '9709',
                paper: paper.name,
                path: `/topic/mathematics/${paper.code}/${topic.topic.toLowerCase().replace(/\s+/g, '-')}`,
                type: 'topic',
                icon: Calculator,
                searchableText: `${topic.topic} ${paper.name} mathematics 9709`.toLowerCase()
              });
            }
          });
        }
      });

      // Further Mathematics 9231 Papers
      const fmPapers = [
        { code: 'fp1', name: 'Further Pure 1', data: safeGetData(fp1Data, 'Further_Pure_Mathematics_1') },
        { code: 'fp2', name: 'Further Pure 2', data: safeGetData(fp2Data, 'Further_Pure_Mathematics_2') },
        { code: 'fm', name: 'Further Mechanics', data: safeGetData(fmData, 'Further_Mechanics') },
        { code: 'fs', name: 'Further Statistics', data: safeGetData(fsData, 'Further_Statistics') }
      ];

      fmPapers.forEach(paper => {
        if (Array.isArray(paper.data)) {
          paper.data.forEach(topic => {
            if (topic && topic.topic) {
              index.push({
                id: `fm-${paper.code}-${topic.topic.toLowerCase().replace(/\s+/g, '-')}`,
                title: topic.topic,
                description: topic.cards?.[0]?.details?.[0] || 'Further Mathematics topic',
                subject: 'Further Mathematics',
                subjectCode: '9231',
                paper: paper.name,
                path: `/topic/further-mathematics/${paper.code}/${topic.topic.toLowerCase().replace(/\s+/g, '-')}`,
                type: 'topic',
                icon: BarChart3,
                searchableText: `${topic.topic} ${paper.name} further mathematics 9231`.toLowerCase()
              });
            }
          });
        }
      });

      // Physics 9702
      const physicsTopics = safeGetData(physicsData, 'Physics_AS_A2');
      if (Array.isArray(physicsTopics)) {
        physicsTopics.forEach(topic => {
          if (topic && topic.topic) {
            index.push({
              id: `physics-${topic.topic.toLowerCase().replace(/\s+/g, '-')}`,
              title: topic.topic,
              description: topic.cards?.[0]?.details?.[0] || 'Physics topic',
              subject: 'Physics',
              subjectCode: '9702',
              paper: 'AS & A2 Level',
              path: `/topic/physics/all/${topic.topic.toLowerCase().replace(/\s+/g, '-')}`,
              type: 'topic',
              icon: Zap,
              searchableText: `${topic.topic} physics 9702 as a2 level`.toLowerCase()
            });
          }
        });
      }

      // Quick access items
      const quickAccess = [
        {
          id: 'math-papers',
          title: 'Mathematics Papers',
          description: 'Browse all A Level Mathematics papers',
          subject: 'Mathematics',
          paper: 'All Papers',
          path: '/mathematics-papers',
          type: 'subject',
          icon: BookOpen,
          searchableText: 'mathematics papers 9709 pure mechanics statistics'.toLowerCase()
        },
        {
          id: 'fm-papers',
          title: 'Further Mathematics Papers',
          description: 'Browse all Further Mathematics papers',
          subject: 'Further Mathematics',
          paper: 'All Papers',
          path: '/further-mathematics-papers',
          type: 'subject',
          icon: FileText,
          searchableText: 'further mathematics papers 9231 fp1 fp2 mechanics statistics'.toLowerCase()
        },
        {
          id: 'physics-papers',
          title: 'Physics Papers',
          description: 'Browse all Physics papers',
          subject: 'Physics',
          paper: 'All Papers',
          path: '/physics-papers',
          type: 'subject',
          icon: BookOpen,
          searchableText: 'physics papers 9702 as a2 level'.toLowerCase()
        }
      ];

      return [...index, ...quickAccess];
    } catch (error) {
      console.error('Error building search index:', error);
      return [];
    }
  }, [safeGetData]); // 只依赖于safeGetData函数

  // 搜索函数 - 移除searchIndex依赖，避免循环
  const performSearch = useCallback((searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const lowerQuery = searchQuery.toLowerCase();

    try {
      const searchResults = searchIndex.filter(item => {
        try {
          return item.searchableText?.includes(lowerQuery) ||
                 item.title?.toLowerCase().includes(lowerQuery) ||
                 item.description?.toLowerCase().includes(lowerQuery);
        } catch (e) {
          return false;
        }
      });

      setResults(searchResults.slice(0, 10));
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchIndex]);

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Handle result click
  const handleResultClick = (result) => {
    addToHistory(query);
    setIsOpen(false);
    setQuery('');
    navigate(result.path);
  };

  // Handle input change
  const handleInputChange = (e) => {
    setQuery(e.target.value);
  };

  // Submit to /search on Enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      addToHistory(query);
      setIsOpen(false);
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  // Clear search
  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full pl-10 pr-10 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Results */}
      <AnimatePresence>
        {isOpen && (query || results.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto z-50"
          >
            {isLoading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">搜索中...</p>
              </div>
            ) : results.length > 0 ? (
              <div className="py-2">
                {results.map((result) => {
                  const IconComponent = result.icon;
                  return (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        <IconComponent className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {result.title}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {result.subject} • {result.paper}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                            {result.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : query ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>未找到 "{query}" 的相关结果</p>
                <p className="text-xs mt-1">试试其他关键词</p>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchBox;