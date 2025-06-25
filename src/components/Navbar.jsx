import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  // State management for dropdowns and mobile menu
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Animation variants for smooth dropdown transitions
  const dropdownVariants = {
    hidden: {
      opacity: 0,
      y: -8,
      scale: 0.96,
      transition: {
        duration: 0.15,
        ease: "easeInOut"
      }
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    },
    exit: {
      opacity: 0,
      y: -6,
      scale: 0.96,
      transition: {
        duration: 0.15,
        ease: "easeIn"
      }
    }
  };

  // Mobile menu animation variants
  const mobileMenuVariants = {
    hidden: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.2,
        ease: "easeInOut"
      }
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.25,
        ease: "easeOut"
      }
    },
    exit: {
      opacity: 0,
      y: -15,
      transition: {
        duration: 0.2,
        ease: "easeIn"
      }
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Navigation data structure - 恢复原有的科目和paper结构
  const startLearningItems = [
    {
      subject: "Mathematics (9709)",
      subjectCode: "9709",
      papers: [
        { name: "Paper 1 – Pure Maths 1", paperCode: "p1", path: "/paper/9709/p1" },
        { name: "Paper 3 – Pure Maths 3", paperCode: "p3", path: "/paper/9709/p3" },
        { name: "Paper 4 – Mechanics", paperCode: "p4", path: "/paper/9709/p4" },
        { name: "Paper 5 – Stats 1", paperCode: "p5", path: "/paper/9709/p5" },
      ]
    },
    {
      subject: "Further Mathematics (9231)",
      subjectCode: "9231",
      papers: [
        { name: "Paper 1 – Further Pure 1", paperCode: "p1", path: "/paper/9231/p1" },
        { name: "Paper 2 – Further Pure 2", paperCode: "p2", path: "/paper/9231/p2" },
        { name: "Paper 3 – Further Mechanics", paperCode: "p3", path: "/paper/9231/p3" },
        { name: "Paper 4 – Further Statistics", paperCode: "p4", path: "/paper/9231/p4" }
      ]
    },
    {
      subject: "Physics (9702)",
      subjectCode: "9702",
      levels: [
        { name: "AS Level", path: "/physics/as-level" },
        { name: "A2 Level", path: "/physics/a2-level" }
      ]
    }
  ];

  const smartFunctionItems = [
    { name: "AI Q&A", path: "/tools/ai-qa" },
    { name: "Image Problem Solving", path: "/tools/image-solver" },
    { name: "Progress Tracking", path: "/tools/progress-tracking" },
    { name: "Smart Recommendations", path: "/tools/smart-recommendations" },
    { name: "Study Suggestions", path: "/tools/study-suggestions" }
  ];

  // Toggle dropdown visibility
  const toggleDropdown = (dropdownName) => {
    setActiveDropdown(activeDropdown === dropdownName ? null : dropdownName);
  };

  // Close mobile menu when link is clicked
  const handleMobileLinkClick = () => {
    setIsMobileMenuOpen(false);
    setActiveDropdown(null);
  };

  return (
    <>
      {/* Dropdown Overlay - subtle background when dropdowns are open */}
      <AnimatePresence>
        {activeDropdown && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/5 z-40"
            onClick={() => setActiveDropdown(null)}
          />
        )}
      </AnimatePresence>

      {/* Main Navigation Bar - SaveMyExams style */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Left Section: Logo + Brand */}
            <div className="flex items-center space-x-3 flex-shrink-0">
              <img src="/nav-icon.png" alt="CIE Copilot" className="h-8 w-8 object-contain" />
              <Link 
                to="/" 
                className="text-xl font-bold text-blue-600 hover:text-blue-700 transition-colors duration-200"
              >
                CIE Copilot
              </Link>
            </div>

            {/* Center Section: Search Bar - SaveMyExams style */}
            <div className="hidden md:flex flex-1 justify-center max-w-lg mx-8">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Search topics, subjects..."
                  className="w-full h-10 pl-4 pr-10 text-sm text-gray-700 placeholder-gray-400 
                            bg-gray-50 border border-gray-200 rounded-lg 
                            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                            transition-all duration-200"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <svg 
                    className="h-4 w-4 text-gray-400" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Right Section: Navigation Links - SaveMyExams layout */}
            <div className="hidden md:flex items-center space-x-1" ref={dropdownRef}>
              
              {/* Start Learning Dropdown */}
              <div className="relative">
                <button
                  onClick={() => toggleDropdown('startLearning')}
                  onMouseEnter={() => setActiveDropdown('startLearning')}
                  className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 
                            hover:text-blue-600 hover:bg-gray-50 rounded-md transition-all duration-200"
                >
                  <span>Start Learning</span>
                  <svg 
                    className={`w-4 h-4 transition-transform duration-200 ${
                      activeDropdown === 'startLearning' ? 'rotate-180' : ''
                    }`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                                 {/* Start Learning Dropdown Menu */}
                 <AnimatePresence>
                   {activeDropdown === 'startLearning' && (
                     <motion.div
                       initial="hidden"
                       animate="visible"
                       exit="exit"
                       variants={dropdownVariants}
                       onMouseLeave={() => setActiveDropdown(null)}
                       className="absolute top-full left-0 mt-1 w-80 bg-white rounded-lg shadow-lg 
                                 border border-gray-100 py-3 z-50"
                     >
                       {startLearningItems.map((item, index) => (
                         <div key={index} className="px-4 py-3 border-b border-gray-50 last:border-b-0">
                           <div className="text-sm font-bold text-gray-900 mb-3">{item.subject}</div>
                           
                           {/* Mathematics and Further Mathematics - Paper-based structure */}
                           {item.papers && (
                             <div className="grid grid-cols-1 gap-1">
                               {item.papers.map((paper, paperIndex) => (
                                 <Link
                                   key={paperIndex}
                                   to={paper.path}
                                   className="block px-3 py-2 text-sm text-gray-600 hover:text-blue-600 
                                             hover:bg-blue-50 rounded-lg transition-all duration-200 
                                             border-l-2 border-transparent hover:border-blue-300"
                                   onClick={() => setActiveDropdown(null)}
                                 >
                                   {paper.name}
                                 </Link>
                               ))}
                             </div>
                           )}
                           
                           {/* Physics - Simplified Level Structure (AS/A2 only) */}
                           {item.levels && (
                             <div className="grid grid-cols-1 gap-1">
                               {item.levels.map((level, levelIndex) => (
                                 <Link
                                   key={levelIndex}
                                   to={level.path}
                                   className="block px-3 py-2 text-sm text-gray-600 hover:text-blue-600 
                                             hover:bg-blue-50 rounded-lg transition-all duration-200 
                                             border-l-2 border-transparent hover:border-blue-300"
                                   onClick={() => setActiveDropdown(null)}
                                 >
                                   {level.name}
                                 </Link>
                               ))}
                             </div>
                           )}
                         </div>
                       ))}
                     </motion.div>
                   )}
                 </AnimatePresence>
              </div>

              {/* Smart Function Dropdown */}
              <div className="relative">
                <button
                  onClick={() => toggleDropdown('smartFunction')}
                  onMouseEnter={() => setActiveDropdown('smartFunction')}
                  className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 
                            hover:text-blue-600 hover:bg-gray-50 rounded-md transition-all duration-200"
                >
                  <span>Smart Function</span>
                  <svg 
                    className={`w-4 h-4 transition-transform duration-200 ${
                      activeDropdown === 'smartFunction' ? 'rotate-180' : ''
                    }`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Smart Function Dropdown Menu */}
                <AnimatePresence>
                  {activeDropdown === 'smartFunction' && (
                    <motion.div
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      variants={dropdownVariants}
                      onMouseLeave={() => setActiveDropdown(null)}
                      className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg 
                                border border-gray-100 py-2 z-50"
                    >
                      {smartFunctionItems.map((item, index) => (
                        <Link
                          key={index}
                          to={item.path}
                          className="block px-4 py-2 text-sm text-gray-700 hover:text-blue-600 
                                    hover:bg-blue-50 transition-all duration-200"
                          onClick={() => setActiveDropdown(null)}
                        >
                          {item.name}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Pricing Link */}
              <Link 
                to="/pricing" 
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 
                          hover:bg-gray-50 rounded-md transition-all duration-200"
              >
                Pricing
              </Link>

              {/* Authentication Links */}
              <div className="flex items-center space-x-2 ml-4 pl-4 border-l border-gray-200">
                <Link 
                  to="/login" 
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 
                            hover:bg-gray-50 rounded-md transition-all duration-200"
                >
                  Login
                </Link>
                
                <Link 
                  to="/signup" 
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 
                            rounded-md transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Start for Free
                </Link>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 
                        rounded-md transition-all duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/20" 
              onClick={() => setIsMobileMenuOpen(false)} 
            />
            
            {/* Mobile Menu Panel */}
            <motion.div
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={mobileMenuVariants}
              className="fixed top-16 left-0 right-0 bg-white shadow-lg border-b border-gray-100 py-4"
            >
              {/* Mobile Search Bar */}
              <div className="px-4 mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search topics, subjects..."
                    className="w-full h-10 pl-4 pr-10 text-sm text-gray-700 placeholder-gray-400 
                              bg-gray-50 border border-gray-200 rounded-lg 
                              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Mobile Navigation Links */}
              <div className="px-4 space-y-4">
                
                                 {/* Start Learning Section */}
                 <div className="border-b border-gray-100 pb-4 mb-4">
                   <div className="text-sm font-semibold text-gray-800 mb-3 px-2">Start Learning</div>
                   {startLearningItems.map((item, index) => (
                     <div key={index} className="ml-2 mb-4">
                       <div className="text-sm font-bold text-gray-900 mb-3 px-2">{item.subject}</div>
                       <div className="space-y-1 ml-2">
                         {item.papers.map((paper, paperIndex) => (
                           <Link
                             key={paperIndex}
                             to={paper.path}
                             className="block px-3 py-2 text-sm text-gray-600 hover:text-blue-600 
                                       hover:bg-blue-50 rounded-lg transition-all duration-200
                                       border-l-2 border-transparent hover:border-blue-300"
                             onClick={handleMobileLinkClick}
                           >
                             {paper.name}
                           </Link>
                         ))}
                       </div>
                     </div>
                   ))}
                 </div>

                {/* Smart Function Section */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="text-sm font-semibold text-gray-900 mb-3">Smart Function</div>
                  <div className="space-y-1 ml-4">
                    {smartFunctionItems.map((item, index) => (
                      <Link
                        key={index}
                        to={item.path}
                        className="block py-2 text-sm text-gray-700 hover:text-blue-600 transition-colors"
                        onClick={handleMobileLinkClick}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Other Links */}
                <div className="border-t border-gray-100 pt-4 space-y-2">
                  <Link 
                    to="/pricing" 
                    className="block py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                    onClick={handleMobileLinkClick}
                  >
                    Pricing
                  </Link>
                  
                  <Link 
                    to="/login" 
                    className="block py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                    onClick={handleMobileLinkClick}
                  >
                    Login
                  </Link>

                  {/* Mobile CTA Button */}
                  <div className="pt-2">
                    <Link 
                      to="/signup" 
                      className="block w-full text-center py-3 text-sm font-semibold text-white 
                                bg-blue-600 hover:bg-blue-700 rounded-md transition-all duration-200"
                      onClick={handleMobileLinkClick}
                    >
                      Start for Free
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
