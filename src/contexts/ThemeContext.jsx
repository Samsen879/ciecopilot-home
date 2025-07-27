import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize theme and language from localStorage or system preferences
  useEffect(() => {
    const initializePreferences = () => {
      try {
        // Get saved theme or default to system preference
        const savedTheme = localStorage.getItem('cie-copilot-theme');
        if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
          setTheme(savedTheme);
        } else {
          // Check system preference
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          setTheme(prefersDark ? 'dark' : 'light');
        }

        // Get saved language or default to English
        const savedLanguage = localStorage.getItem('cie-copilot-language');
        if (savedLanguage && ['en', 'zh'].includes(savedLanguage)) {
          setLanguage(savedLanguage);
        } else {
          // Check browser language
          const browserLanguage = navigator.language.toLowerCase();
          if (browserLanguage.startsWith('zh')) {
            setLanguage('zh');
          }
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializePreferences();
  }, []);

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Update meta theme color for mobile browsers
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.content = theme === 'dark' ? '#1f2937' : '#3b82f6';
    }
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e) => {
      // Only auto-update if user hasn't manually set a preference
      const savedTheme = localStorage.getItem('cie-copilot-theme');
      if (!savedTheme) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('cie-copilot-theme', newTheme);
  };

  const setThemeMode = (mode) => {
    if (['light', 'dark'].includes(mode)) {
      setTheme(mode);
      localStorage.setItem('cie-copilot-theme', mode);
    }
  };

  const toggleLanguage = () => {
    const newLanguage = language === 'en' ? 'zh' : 'en';
    setLanguage(newLanguage);
    localStorage.setItem('cie-copilot-language', newLanguage);
  };

  const setLanguageMode = (lang) => {
    if (['en', 'zh'].includes(lang)) {
      setLanguage(lang);
      localStorage.setItem('cie-copilot-language', lang);
    }
  };

  // Theme-aware colors and styles
  const colors = {
    light: {
      bg: 'bg-white',
      bgSecondary: 'bg-gray-50',
      text: 'text-gray-900',
      textSecondary: 'text-gray-600',
      textMuted: 'text-gray-400',
      border: 'border-gray-200',
      hover: 'hover:bg-gray-50',
      accent: 'bg-blue-500',
      accentHover: 'hover:bg-blue-600'
    },
    dark: {
      bg: 'bg-gray-900',
      bgSecondary: 'bg-gray-800', 
      text: 'text-gray-100',
      textSecondary: 'text-gray-300',
      textMuted: 'text-gray-500',
      border: 'border-gray-700',
      hover: 'hover:bg-gray-800',
      accent: 'bg-blue-600',
      accentHover: 'hover:bg-blue-700'
    }
  };

  // Localized text content
  const text = {
    en: {
      // Navigation
      home: 'Home',
      askAI: 'Ask AI',
      topics: 'Topics',
      papers: 'Papers',
      login: 'Login',
      signup: 'Start for Free',
      search: 'Search topics, subjects...',
      darkMode: 'Dark Mode',
      lightMode: 'Light Mode',
      language: 'Language',
      settings: 'Settings',
      mathematics: 'Mathematics',
      furtherMathematics: 'Further Mathematics',
      physics: 'Physics',
      startLearning: 'Start Learning',
      smartFunction: 'Smart Functions',
      
      // Landing Page Hero Section
      heroTitle: 'Personalized A Level Learning Assistant',
      heroSubtitle: 'Exclusively designed for CIE exam board with comprehensive syllabus coverage, AI-powered error analysis and past paper pattern summaries',
      exploreSubjects: 'Explore Subjects',
      viewAllFeatures: 'View All Features',
      
      // Animated Keywords
      aiPowered: 'AI-Powered',
      comprehensiveCoverage: 'Comprehensive Coverage',
      examFocused: 'Exam-Focused',
      personalizedLearning: 'Personalized Learning',
      instantFeedback: 'Instant Feedback',
      
      // Core Features Section
      coreFeatures: 'Core Features',
      coreFeaturesSubtitle: 'Everything you need for CIE A-Level success',
      
      // Features descriptions
      aiTutoringTitle: 'AI Tutoring',
      aiTutoringDesc: '24/7 AI tutor providing personalized explanations for Mathematics, Physics, and Further Mathematics',
      comprehensiveCoverageTitle: 'Comprehensive Coverage',
      comprehensiveCoverageDesc: 'Complete CIE A-Level syllabus coverage with detailed topic breakdowns and exam tips',
      smartAnalysisTitle: 'Smart Analysis',
      smartAnalysisDesc: 'AI-powered analysis of your learning patterns and personalized study recommendations',
      practiceQuestionsTitle: 'Practice Questions',
      practiceQuestionsDesc: 'Thousands of past paper questions with step-by-step solutions and marking schemes',
      progressTrackingTitle: 'Progress Tracking',
      progressTrackingDesc: 'Track your learning progress across all subjects with detailed analytics and insights',
      
      // User Feedback Section
      userFeedbackTitle: 'What Our Students Say',
      userFeedbackSubtitle: 'Real results from CIE A-Level students',
      
      // User feedback content
      feedback1: 'After AI automated error diagnosis, my mathematics grade improved by 2 levels',
      feedback2: 'CIE-specific answers helped me accurately hit marking points in physics exams',
      feedback3: 'Bilingual explanations helped me better understand economics concepts',
      
      // Stats Section
      studentCount: '5,000+',
      studentsText: 'Active Students',
      gradeImprovement: '85%',
      gradeImprovementText: 'Grade Improvement',
      successRate: '92%',
      successRateText: 'Success Rate',
      
      // FAQ Section
      faqTitle: 'Frequently Asked Questions',
      faqSubtitle: 'Everything you need to know about our AI learning platform',
      
      // FAQ Questions and Answers
      faq1Question: 'Why does our AI understand exams better than generic AI?',
      faq1Answer: 'Our AI is specially trained with deep learning on CIE exam board syllabus and mark schemes, accurately identifying marking points and providing answers that meet official standards.',
      
      faq2Question: 'Do you support other exam boards?',
      faq2Answer: 'Currently focused on CIE exam board to ensure depth and professionalism. We will gradually expand to other boards like AQA, Edexcel based on user demand.',
      
      faq3Question: 'Can I ask questions in Chinese?',
      faq3Answer: 'Absolutely! You can ask in Chinese and receive bilingual answers with English-Chinese explanations, helping you understand concepts while mastering standard English expressions.',
      
      faq4Question: 'How do you ensure answer accuracy?',
      faq4Answer: 'All answers are strictly generated according to official mark schemes, with each solution step marked with scoring points, continuously optimized and verified by our professional team.',
      
      // CTA Section
      ctaTitle: 'Ready to Start Your Journey to A*?',
      ctaSubtitle: 'Join thousands of CIE students achieving high scores with AI assistance',
      ctaButton: 'Start Free Today',
      ctaSecondaryButton: 'Book Demo',
      
      // Footer
      aboutUs: 'About Us',
      privacyPolicy: 'Privacy Policy',
      termsOfService: 'Terms of Service',
      contactUs: 'Contact Us',
      
      // Common terms
      loading: 'Loading...',
      error: 'Error',
      retry: 'Retry',
      clearChat: 'Clear chat',
      sendMessage: 'Send message',
      placeholder: 'Enter your question...',
    },
    zh: {
      // Navigation
      home: '首页',
      askAI: 'AI问答',
      topics: '主题',
      papers: '试卷',
      login: '登录',
      signup: '免费开始',
      search: '搜索主题、科目...',
      darkMode: '深色模式',
      lightMode: '浅色模式',
      language: '语言',
      settings: '设置',
      mathematics: '数学',
      furtherMathematics: '进阶数学',
      physics: '物理',
      startLearning: '开始学习',
      smartFunction: '智能功能',
      
      // Landing Page Hero Section
      heroTitle: '个性化A Level学习助手',
      heroSubtitle: '专为CIE考试委员会设计，涵盖全面教学大纲，AI驱动的错误分析和历年试卷模式总结',
      exploreSubjects: '探索科目',
      viewAllFeatures: '查看所有功能',
      
      // Animated Keywords
      aiPowered: 'AI驱动',
      comprehensiveCoverage: '全面覆盖',
      examFocused: '考试导向',
      personalizedLearning: '个性化学习',
      instantFeedback: '即时反馈',
      
      // Core Features Section
      coreFeatures: '核心功能',
      coreFeaturesSubtitle: 'CIE A-Level成功所需的一切',
      
      // Features descriptions
      aiTutoringTitle: 'AI辅导',
      aiTutoringDesc: '7×24小时AI导师，为数学、物理和进阶数学提供个性化解释',
      comprehensiveCoverageTitle: '全面覆盖',
      comprehensiveCoverageDesc: '完整的CIE A-Level教学大纲覆盖，详细的主题分解和考试技巧',
      smartAnalysisTitle: '智能分析',
      smartAnalysisDesc: 'AI驱动的学习模式分析和个性化学习建议',
      practiceQuestionsTitle: '练习题库',
      practiceQuestionsDesc: '数千道历年试题，配备详细解答步骤和评分标准',
      progressTrackingTitle: '进度跟踪',
      progressTrackingDesc: '跨所有科目跟踪学习进度，提供详细分析和洞察',
      
      // User Feedback Section
      userFeedbackTitle: '学生反馈',
      userFeedbackSubtitle: 'CIE A-Level学生的真实成果',
      
      // User feedback content
      feedback1: '通过AI自动错误诊断，我的数学成绩提升了2个等级',
      feedback2: 'CIE专门化答案帮助我在物理考试中准确命中得分点',
      feedback3: '双语解释帮助我更好地理解经济学概念',
      
      // Stats Section
      studentCount: '5,000+',
      studentsText: '活跃学生',
      gradeImprovement: '85%',
      gradeImprovementText: '成绩提升',
      successRate: '92%',
      successRateText: '成功率',
      
      // FAQ Section
      faqTitle: '常见问题',
      faqSubtitle: '关于我们AI学习平台你需要了解的一切',
      
      // FAQ Questions and Answers
      faq1Question: '为什么我们的AI比通用AI更懂考试？',
      faq1Answer: '我们的AI经过CIE考试委员会教学大纲和评分标准的深度学习训练，能准确识别得分点，提供符合官方标准的答案。',
      
      faq2Question: '你们支持其他考试委员会吗？',
      faq2Answer: '目前专注于CIE考试委员会以确保深度和专业性。我们将根据用户需求逐步扩展到AQA、Edexcel等其他考试委员会。',
      
      faq3Question: '我可以用中文提问吗？',
      faq3Answer: '当然可以！你可以用中文提问，并获得中英双语解释，帮助你理解概念的同时掌握标准英语表达。',
      
      faq4Question: '如何确保答案的准确性？',
      faq4Answer: '所有答案严格按照官方评分标准生成，每个解题步骤都标注得分点，由我们的专业团队持续优化和验证。',
      
      // CTA Section
      ctaTitle: '准备好开始你的A*之旅了吗？',
      ctaSubtitle: '加入数千名CIE学生，在AI助力下取得高分',
      ctaButton: '今天免费开始',
      ctaSecondaryButton: '预约演示',
      
      // Footer
      aboutUs: '关于我们',
      privacyPolicy: '隐私政策',
      termsOfService: '服务条款',
      contactUs: '联系我们',
      
      // Common terms
      loading: '加载中...',
      error: '错误',
      retry: '重试',
      clearChat: '清空聊天',
      sendMessage: '发送消息',
      placeholder: '输入您的问题...',
    }
  };

  const value = {
    // Theme state
    theme,
    isDark: theme === 'dark',
    isLoading,
    
    // Language state
    language,
    isZh: language === 'zh',
    
    // Theme functions
    toggleTheme,
    setThemeMode,
    
    // Language functions
    toggleLanguage,
    setLanguageMode,
    
    // Computed values
    colors: colors[theme],
    text: text[language],
    
    // Utility functions
    getThemeClass: (lightClass, darkClass) => theme === 'dark' ? darkClass : lightClass,
    getText: (key) => text[language][key] || text.en[key] || key
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}; 