import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import SearchBox from "./SearchBox";
import ThemeToggle from "./ThemeToggle";
import AuthModal from "./Auth/AuthModal";

export default function Navbar() {
  // State management for dropdowns and mobile menu
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { theme } = useTheme();
  const { user, signOut } = useAuth();
  const navRef = useRef(null);

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
      if (navRef.current && !navRef.current.contains(event.target)) {
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
    { name: "AI Q&A", path: "/ask-ai" },
    { name: "Aurora Background Demo", path: "/aurora-demo" },
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

  // Handle auth modal
  const openAuthModal = () => {
    setIsAuthModalOpen(true);
    setIsMobileMenuOpen(false);
    setActiveDropdown(null);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut();
      setActiveDropdown(null);
    } catch (error) {
      console.error('登出失败:', error);
    }
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

      {/* Main Navigation Bar - Theme aware */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 shadow-sm border-b border-gray-100 dark:border-gray-800 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Left Section: Logo + Brand */}
            <div className="flex items-center space-x-3 flex-shrink-0">
              <img src="/nav-icon.png" alt="CIE Copilot" className="h-8 w-8 object-contain" />
              <Link 
                to="/" 
                className="text-xl font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200"
              >
                CIE Copilot
              </Link>
            </div>

            {/* Center Section: Search Bar - Enhanced with SearchBox component */}
            <div className="hidden md:flex flex-1 justify-center max-w-lg mx-8">
              <SearchBox className="w-full" />
            </div>

            {/* Right Section: Navigation Links - SaveMyExams layout */}
            <div className="hidden md:flex items-center space-x-1" ref={navRef}>
              
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
                {user ? (
                  <div className="relative">
                    <button
                      onClick={() => toggleDropdown('userMenu')}
                      className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md transition-all duration-200"
                    >
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {user.email?.charAt(0).toUpperCase()}
                      </div>
                      <span>{user.email}</span>
                      <svg className={`w-4 h-4 transition-transform duration-200 ${activeDropdown === 'userMenu' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    <AnimatePresence>
                      {activeDropdown === 'userMenu' && (
                        <motion.div
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          variants={dropdownVariants}
                          className="absolute top-full right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50"
                        >
                          <Link
                            to="/profile"
                            className="block px-4 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                            onClick={() => setActiveDropdown(null)}
                          >
                            个人资料
                          </Link>
                          <Link
                            to="/settings"
                            className="block px-4 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                            onClick={() => setActiveDropdown(null)}
                          >
                            设置
                          </Link>
                          <hr className="my-1 border-gray-100" />
                          <button
                            onClick={handleLogout}
                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200"
                          >
                            登出
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <button 
                    onClick={openAuthModal}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    登录 / 注册
                  </button>
                )}
                
                {/* Theme Toggle */}
                <ThemeToggle />
              </div>
            </div>

            {/* Mobile menu button - Enhanced for better touch interaction */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="relative p-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 
                          rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 
                          focus:ring-blue-500 focus:ring-offset-2 active:scale-95 select-none"
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={isMobileMenuOpen}
              >
                <div className="w-5 h-5 relative">
                  {/* Animated hamburger icon */}
                  <motion.span
                    className="absolute top-0 left-0 w-full h-0.5 bg-current rounded-full"
                    animate={{
                      rotate: isMobileMenuOpen ? 45 : 0,
                      y: isMobileMenuOpen ? 8 : 0,
                    }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  />
                  <motion.span
                    className="absolute top-2 left-0 w-full h-0.5 bg-current rounded-full"
                    animate={{
                      opacity: isMobileMenuOpen ? 0 : 1,
                      x: isMobileMenuOpen ? 20 : 0,
                    }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  />
                  <motion.span
                    className="absolute top-4 left-0 w-full h-0.5 bg-current rounded-full"
                    animate={{
                      rotate: isMobileMenuOpen ? -45 : 0,
                      y: isMobileMenuOpen ? -8 : 0,
                    }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  />
                </div>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu - Enhanced Design and Interactions */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            variants={mobileMenuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-x-0 top-16 z-40 bg-white border-b border-gray-200 shadow-lg 
                      max-h-[calc(100vh-4rem)] overflow-y-auto"
          >
            {/* Backdrop overlay for better focus */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/10 -z-10"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            <div className="max-w-md mx-auto">
              {/* Mobile Search Bar */}
              <div className="px-4 py-4 border-b border-gray-100">
                <SearchBox className="w-full" placeholder="Search topics, subjects..." />
              </div>

              {/* Mobile Navigation Links - Improved spacing and touch targets */}
              <div className="px-4 py-4 space-y-6">
                
                {/* Start Learning Section */}
                <div className="space-y-4">
                  <div className="text-sm font-bold text-gray-900 uppercase tracking-wide px-2">
                    Start Learning
                  </div>
                  {startLearningItems.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.3 }}
                      className="space-y-3"
                    >
                      <div className="text-base font-semibold text-gray-800 px-3 py-2 
                                    bg-gray-50 rounded-lg border-l-4 border-blue-500">
                        {item.subject}
                      </div>
                      <div className="space-y-1 ml-4">
                        {(item.papers || item.levels || []).map((paper, paperIndex) => (
                          <Link
                            key={paperIndex}
                            to={paper.path}
                            className="flex items-center px-4 py-3 text-sm text-gray-600 
                                      hover:text-blue-600 hover:bg-blue-50 rounded-lg 
                                      transition-all duration-200 active:scale-98 
                                      border-l-2 border-transparent hover:border-blue-300"
                            onClick={handleMobileLinkClick}
                          >
                            <span className="w-2 h-2 bg-gray-300 rounded-full mr-3 
                                          group-hover:bg-blue-400 transition-colors" />
                            {paper.name}
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Smart Functions Section - Improved layout */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                  className="space-y-4 border-t border-gray-100 pt-6"
                >
                  <div className="text-sm font-bold text-gray-900 uppercase tracking-wide px-2">
                    Smart Functions
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {smartFunctionItems.map((item, index) => (
                      <Link
                        key={index}
                        to={item.path}
                        className="flex items-center px-4 py-3 text-sm text-gray-600 
                                  hover:text-blue-600 hover:bg-blue-50 rounded-lg 
                                  transition-all duration-200 active:scale-98"
                        onClick={handleMobileLinkClick}
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 
                                      rounded-lg flex items-center justify-center mr-3">
                          <div className="w-3 h-3 bg-blue-500 rounded-full" />
                        </div>
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </motion.div>

                {/* Additional Links - Enhanced touch targets */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                  className="space-y-3 border-t border-gray-100 pt-6"
                >
                  <Link 
                    to="/pricing" 
                    className="flex items-center px-4 py-3 text-base font-medium text-gray-700 
                              hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-all duration-200 
                              active:scale-98"
                    onClick={handleMobileLinkClick}
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-green-200 
                                  rounded-lg flex items-center justify-center mr-3">
                      💰
                    </div>
                    Pricing
                  </Link>
                  
                  {/* Combined Mobile Login/Signup Button */}
                  <div className="pt-4 pb-2">
                    {user ? (
                      <div className="space-y-3">
                        <div className="flex items-center px-4 py-3 bg-blue-50 rounded-lg">
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white text-lg font-bold mr-3">
                            {user.email?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.email}</div>
                            <div className="text-xs text-gray-500">已登录</div>
                          </div>
                        </div>
                        <Link
                          to="/profile"
                          className="flex items-center px-4 py-3 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                          onClick={handleMobileLinkClick}
                        >
                          个人资料
                        </Link>
                        <Link
                          to="/settings"
                          className="flex items-center px-4 py-3 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                          onClick={handleMobileLinkClick}
                        >
                          设置
                        </Link>
                        <button
                          onClick={() => {
                            handleLogout();
                            handleMobileLinkClick();
                          }}
                          className="flex items-center justify-center w-full py-3 text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                        >
                          登出
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={openAuthModal}
                        className="flex items-center justify-center w-full py-4 text-base font-bold text-white 
                                  bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 
                                  rounded-xl transition-all duration-200 active:scale-98 shadow-lg 
                                  hover:shadow-xl"
                      >
                        <span className="mr-2">👤</span>
                        登录 / 注册
                      </button>
                    )}
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={closeAuthModal} 
      />
    </>
  );
}
