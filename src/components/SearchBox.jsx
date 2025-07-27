import React, { useState, useEffect, useRef, useMemo } from 'react';
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

  // Memoized search index for performance
  const searchIndex = useMemo(() => {
    const index = [];
    
    // Mathematics 9709 Papers
    const mathPapers = [
      { code: 'p1', name: 'Pure Mathematics 1', data: paper1Data['9709_Paper_1_Pure_Mathematics_1'] || [] },
      { code: 'p3', name: 'Pure Mathematics 3', data: paper3Data['9709_Paper_3_Pure_Mathematics_3'] || [] },
      { code: 'p4', name: 'Mechanics', data: paper4Data['9709_Paper_4_Mechanics'] || [] },
      { code: 'p5', name: 'Statistics 1', data: paper5Data['9709_Paper_5_Probability_and_Statistics_1'] || [] }
    ];

    mathPapers.forEach(paper => {
      if (Array.isArray(paper.data)) {
        paper.data.forEach(topic => {
          index.push({
            id: `math-${paper.code}-${topic.topic?.toLowerCase().replace(/\s+/g, '-')}`,
            title: topic.topic || 'Unknown Topic',
            description: topic.cards?.[0]?.details?.[0] || 'Mathematics topic',
            subject: 'Mathematics',
            subjectCode: '9709',
            paper: paper.name,
            paperCode: paper.code,
            path: `/topic/9709/${paper.code}/${topic.topic?.toLowerCase().replace(/\s+/g, '-')}`,
            type: 'topic',
            icon: Calculator,
            searchableText: `${topic.topic} ${paper.name} mathematics ${topic.cards?.map(card => card.details?.join(' ')).join(' ')}`.toLowerCase()
          });
        });
      }
    });

    // Further Mathematics 9231 Papers
    const furtherMathPapers = [
      { code: 'fp1', name: 'Further Pure 1', data: fp1Data['9231_Paper_1_Further_Pure_Mathematics_1'] || [] },
      { code: 'fp2', name: 'Further Pure 2', data: fp2Data['9231_Paper_2_Further_Pure_Mathematics_2'] || [] },
      { code: 'fm', name: 'Further Mechanics', data: fmData['9231_Paper_3_Further_Mechanics'] || [] },
      { code: 'fs', name: 'Further Statistics', data: fsData['9231_Paper_4_Further_Statistics'] || [] }
    ];

    furtherMathPapers.forEach(paper => {
      if (Array.isArray(paper.data)) {
        paper.data.forEach(topic => {
          index.push({
            id: `fmath-${paper.code}-${topic.topic?.toLowerCase().replace(/\s+/g, '-')}`,
            title: topic.topic || 'Unknown Topic',
            description: topic.cards?.[0]?.details?.[0] || 'Further Mathematics topic',
            subject: 'Further Mathematics',
            subjectCode: '9231',
            paper: paper.name,
            paperCode: paper.code,
            path: `/topic/9231/${paper.code}/${topic.topic?.toLowerCase().replace(/\s+/g, '-')}`,
            type: 'topic',
            icon: Zap,
            searchableText: `${topic.topic} ${paper.name} further mathematics ${topic.cards?.map(card => card.details?.join(' ')).join(' ')}`.toLowerCase()
          });
        });
      }
    });

    // Physics 9702
    if (physicsData.Physics_9702) {
      const { AS_Level = [], A2_Level = [] } = physicsData.Physics_9702;
      
      [...AS_Level, ...A2_Level].forEach((topic, idx) => {
        const level = AS_Level.includes(topic) ? 'AS' : 'A2';
        index.push({
          id: `physics-${level.toLowerCase()}-${topic.toLowerCase().replace(/\s+/g, '-')}`,
          title: topic,
          description: `Physics ${level} Level topic`,
          subject: 'Physics',
          subjectCode: '9702',
          paper: `${level} Level`,
          paperCode: level.toLowerCase(),
          path: `/physics/${level.toLowerCase()}-level`,
          type: 'topic',
          icon: BookOpen,
          searchableText: `${topic} physics ${level} level`.toLowerCase()
        });
      });
    }

    // Add quick access items
    const quickAccess = [
      {
        id: 'ask-ai',
        title: 'Ask AI Assistant',
        description: 'Get instant help with any CIE question',
        subject: 'AI Tools',
        paper: 'Chat',
        path: '/ask-ai',
        type: 'tool',
        icon: Zap,
        searchableText: 'ai assistant chat help question answer tutor'.toLowerCase()
      },
      {
        id: 'math-papers',
        title: 'Mathematics Papers',
        description: 'Browse all Mathematics 9709 papers',
        subject: 'Mathematics',
        paper: 'All Papers',
        path: '/mathematics-papers',
        type: 'subject',
        icon: Calculator,
        searchableText: 'mathematics papers 9709 pure mechanics statistics'.toLowerCase()
      },
      {
        id: 'fmath-papers',
        title: 'Further Mathematics Papers',
        description: 'Browse all Further Mathematics 9231 papers',
        subject: 'Further Mathematics', 
        paper: 'All Papers',
        path: '/further-mathematics-papers',
        type: 'subject',
        icon: BarChart3,
        searchableText: 'further mathematics papers 9231 pure mechanics statistics'.toLowerCase()
      },
      {
        id: 'physics-papers',
        title: 'Physics Papers',
        description: 'Browse all Physics 9702 papers',
        subject: 'Physics',
        paper: 'All Papers', 
        path: '/physics-papers',
        type: 'subject',
        icon: BookOpen,
        searchableText: 'physics papers 9702 as a2 level'.toLowerCase()
      }
    ];

    return [...index, ...quickAccess];
  }, []);

  // Search function with debouncing
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(() => {
      const searchQuery = query.toLowerCase().trim();
      
      // Add search query to history when user types (debounced)
      if (searchQuery.length >= 2) {
        addToHistory(searchQuery);
      }
      
      const filteredResults = searchIndex.filter(item => 
        item.searchableText.includes(searchQuery) ||
        item.title.toLowerCase().includes(searchQuery) ||
        item.description.toLowerCase().includes(searchQuery)
      );

      // Sort results by relevance
      const sortedResults = filteredResults.sort((a, b) => {
        const aTitle = a.title.toLowerCase();
        const bTitle = b.title.toLowerCase();
        
        // Exact title match gets highest priority
        if (aTitle === searchQuery) return -1;
        if (bTitle === searchQuery) return 1;
        
        // Title starts with query gets second priority
        if (aTitle.startsWith(searchQuery) && !bTitle.startsWith(searchQuery)) return -1;
        if (bTitle.startsWith(searchQuery) && !aTitle.startsWith(searchQuery)) return 1;
        
        // Otherwise sort alphabetically
        return aTitle.localeCompare(bTitle);
      });

      setResults(sortedResults.slice(0, 8)); // Limit to 8 results
      setIsLoading(false);
    }, 200); // 200ms debounce

    return () => clearTimeout(timer);
  }, [query, searchIndex, addToHistory]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleResultClick = (result) => {
    // Add to search history
    addToHistory(result.title);
    setQuery('');
    setIsOpen(false);
    navigate(result.path);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full h-10 pl-10 pr-10 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500
                    bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg 
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                    transition-all duration-200"
        />
        
        {/* Search Icon */}
        <div className="absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        </div>
        
        {/* Clear Button */}
        {query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 flex items-center pr-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-r-lg transition-colors"
          >
            <X className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      <AnimatePresence>
        {isOpen && (query.trim() || results.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600
                     rounded-xl shadow-lg dark:shadow-2xl z-50 max-h-96 overflow-y-auto transition-colors duration-200"
          >
            {isLoading ? (
              <div className="p-4 text-center">
                <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-200">Searching...</p>
              </div>
            ) : results.length > 0 ? (
              <div className="py-2">
                {results.map((result) => {
                  const IconComponent = result.icon;
                  return (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors border-b border-gray-50 dark:border-gray-700 last:border-b-0"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors duration-200">
                          <IconComponent className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-gray-100 truncate transition-colors duration-200">
                            {result.title}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate transition-colors duration-200">
                            {result.subject} • {result.paper}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-2 transition-colors duration-200">
                            {result.description}
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 flex-shrink-0 transition-colors duration-200">
                          <Clock className="w-3 h-3" />
                          {result.type}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : query.trim() ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400 transition-colors duration-200">
                <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2 transition-colors duration-200" />
                <p className="text-sm">No results found for "{query}"</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 transition-colors duration-200">Try searching for topics, subjects, or keywords</p>
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400 transition-colors duration-200">
                <div className="text-sm">Start typing to search topics and subjects</div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchBox; 