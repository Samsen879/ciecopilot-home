import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Globe, Settings, Check } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    theme, 
    isDark, 
    toggleTheme, 
    language, 
    isZh, 
    toggleLanguage,
    getText,
    colors
  } = useTheme();

  const dropdownVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      y: -10
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.15,
        ease: "easeOut"
      }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: -10,
      transition: {
        duration: 0.1,
        ease: "easeIn"
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Settings Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-lg transition-all duration-200 ${colors.hover} ${colors.text} 
                   hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
        aria-label={getText('settings')}
      >
        <Settings className="w-5 h-5" />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown Content */}
            <motion.div
              variants={dropdownVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={`absolute right-0 top-full mt-2 w-64 ${colors.bg} border ${colors.border} 
                         rounded-xl shadow-lg z-50 overflow-hidden`}
            >
              {/* Header */}
              <div className={`px-4 py-3 border-b ${colors.border}`}>
                <h3 className={`font-semibold ${colors.text}`}>
                  {getText('settings')}
                </h3>
                <p className={`text-sm ${colors.textMuted}`}>
                  Customize your experience
                </p>
              </div>

              {/* Theme Section */}
              <div className="p-4 space-y-3">
                <div className={`text-sm font-medium ${colors.textSecondary}`}>
                  Theme
                </div>
                
                <div className="space-y-2">
                  {/* Light Theme Option */}
                  <button
                    onClick={() => {
                      if (isDark) toggleTheme();
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200
                               ${!isDark 
                                 ? 'bg-blue-50 border-2 border-blue-200 text-blue-700' 
                                 : `${colors.hover} ${colors.text} border-2 border-transparent`
                               }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${!isDark ? 'bg-blue-100' : colors.bgSecondary}`}>
                        <Sun className={`w-4 h-4 ${!isDark ? 'text-blue-600' : colors.textMuted}`} />
                      </div>
                      <div className="text-left">
                        <div className="font-medium">{getText('lightMode')}</div>
                        <div className={`text-xs ${!isDark ? 'text-blue-600' : colors.textMuted}`}>
                          Clean and bright interface
                        </div>
                      </div>
                    </div>
                    {!isDark && (
                      <Check className="w-5 h-5 text-blue-600" />
                    )}
                  </button>

                  {/* Dark Theme Option */}
                  <button
                    onClick={() => {
                      if (!isDark) toggleTheme();
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200
                               ${isDark 
                                 ? 'bg-blue-50 border-2 border-blue-200 text-blue-700' 
                                 : `${colors.hover} ${colors.text} border-2 border-transparent`
                               }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-100' : colors.bgSecondary}`}>
                        <Moon className={`w-4 h-4 ${isDark ? 'text-blue-600' : colors.textMuted}`} />
                      </div>
                      <div className="text-left">
                        <div className="font-medium">{getText('darkMode')}</div>
                        <div className={`text-xs ${isDark ? 'text-blue-600' : colors.textMuted}`}>
                          Easy on the eyes
                        </div>
                      </div>
                    </div>
                    {isDark && (
                      <Check className="w-5 h-5 text-blue-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Language Section */}
              <div className={`p-4 border-t ${colors.border} space-y-3`}>
                <div className={`text-sm font-medium ${colors.textSecondary}`}>
                  {getText('language')}
                </div>
                
                <div className="space-y-2">
                  {/* English Option */}
                  <button
                    onClick={() => {
                      if (isZh) toggleLanguage();
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200
                               ${!isZh 
                                 ? 'bg-green-50 border-2 border-green-200 text-green-700' 
                                 : `${colors.hover} ${colors.text} border-2 border-transparent`
                               }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${!isZh ? 'bg-green-100' : colors.bgSecondary}`}>
                        <Globe className={`w-4 h-4 ${!isZh ? 'text-green-600' : colors.textMuted}`} />
                      </div>
                      <div className="text-left">
                        <div className="font-medium">English</div>
                        <div className={`text-xs ${!isZh ? 'text-green-600' : colors.textMuted}`}>
                          International language
                        </div>
                      </div>
                    </div>
                    {!isZh && (
                      <Check className="w-5 h-5 text-green-600" />
                    )}
                  </button>

                  {/* Chinese Option */}
                  <button
                    onClick={() => {
                      if (!isZh) toggleLanguage();
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200
                               ${isZh 
                                 ? 'bg-green-50 border-2 border-green-200 text-green-700' 
                                 : `${colors.hover} ${colors.text} border-2 border-transparent`
                               }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isZh ? 'bg-green-100' : colors.bgSecondary}`}>
                        <Globe className={`w-4 h-4 ${isZh ? 'text-green-600' : colors.textMuted}`} />
                      </div>
                      <div className="text-left">
                        <div className="font-medium">中文</div>
                        <div className={`text-xs ${isZh ? 'text-green-600' : colors.textMuted}`}>
                          简体中文界面
                        </div>
                      </div>
                    </div>
                    {isZh && (
                      <Check className="w-5 h-5 text-green-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className={`px-4 py-3 border-t ${colors.border} ${colors.bgSecondary}`}>
                <p className={`text-xs ${colors.textMuted} text-center`}>
                  {isZh ? '设置将自动保存' : 'Settings are saved automatically'}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThemeToggle; 