# 前端状态管理和API集成指南

本文档提供React应用的状态管理、API集成和数据流管理的完整示例。

## 1. API客户端封装 (api/communityApi.js)

```javascript
// src/api/communityApi.js
import { apiClient } from './apiClient';

class CommunityAPI {
  // 问题相关API
  async getQuestions(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiClient.get(`/community/questions?${queryString}`);
    return response.data;
  }

  async getQuestion(id) {
    const response = await apiClient.get(`/community/questions/${id}`);
    return response.data;
  }

  async createQuestion(questionData) {
    const response = await apiClient.post('/community/questions', questionData);
    return response.data;
  }

  async updateQuestion(id, questionData) {
    const response = await apiClient.put(`/community/questions/${id}`, questionData);
    return response.data;
  }

  async deleteQuestion(id) {
    const response = await apiClient.delete(`/community/questions/${id}`);
    return response.data;
  }

  // 回答相关API
  async getAnswers(questionId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiClient.get(`/community/questions/${questionId}/answers?${queryString}`);
    return response.data;
  }

  async createAnswer(answerData) {
    const response = await apiClient.post('/community/answers', answerData);
    return response.data;
  }

  async updateAnswer(id, answerData) {
    const response = await apiClient.put(`/community/answers/${id}`, answerData);
    return response.data;
  }

  async deleteAnswer(id) {
    const response = await apiClient.delete(`/community/answers/${id}`);
    return response.data;
  }

  async markAnswerAsBest(answerId) {
    const response = await apiClient.post(`/community/answers/${answerId}/mark-best`);
    return response.data;
  }

  // 互动相关API
  async createInteraction(interactionData) {
    const response = await apiClient.post('/community/interactions', interactionData);
    return response.data;
  }

  async getUserInteractions(userId = null) {
    const url = userId ? `/community/interactions?user_id=${userId}` : '/community/interactions';
    const response = await apiClient.get(url);
    return response.data;
  }

  async deleteInteraction(id) {
    const response = await apiClient.delete(`/community/interactions/${id}`);
    return response.data;
  }

  // 用户档案相关API
  async getUserProfile(userId) {
    const response = await apiClient.get(`/community/users/${userId}/profile`);
    return response.data;
  }

  async updateUserProfile(userId, profileData) {
    const response = await apiClient.put(`/community/users/${userId}/profile`, profileData);
    return response.data;
  }

  // 徽章相关API
  async getUserBadges(userId) {
    const response = await apiClient.get(`/community/users/${userId}/badges`);
    return response.data;
  }

  async getAllBadges() {
    const response = await apiClient.get('/community/badges');
    return response.data;
  }

  // 声誉相关API
  async getUserReputation(userId) {
    const response = await apiClient.get(`/community/users/${userId}/reputation`);
    return response.data;
  }

  async getReputationHistory(userId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiClient.get(`/community/users/${userId}/reputation/history?${queryString}`);
    return response.data;
  }

  // 搜索API
  async searchQuestions(query, params = {}) {
    const searchParams = { ...params, search: query };
    return this.getQuestions(searchParams);
  }

  // 健康检查
  async healthCheck() {
    const response = await apiClient.get('/community/health');
    return response.data;
  }
}

export const communityApi = new CommunityAPI();
```

## 2. 基础API客户端 (api/apiClient.js)

```javascript
// src/api/apiClient.js
import axios from 'axios';
import { getAuthToken, removeAuthToken } from '../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

class APIClient {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  setupInterceptors() {
    // 请求拦截器 - 添加认证token
    this.client.interceptors.request.use(
      (config) => {
        const token = getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器 - 处理错误和token过期
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          // Token过期或无效，清除本地token并重定向到登录页
          removeAuthToken();
          window.location.href = '/login';
        }
        
        // 统一错误处理
        const errorMessage = error.response?.data?.message || error.message || '请求失败';
        return Promise.reject(new Error(errorMessage));
      }
    );
  }

  async get(url, config = {}) {
    return this.client.get(url, config);
  }

  async post(url, data = {}, config = {}) {
    return this.client.post(url, data, config);
  }

  async put(url, data = {}, config = {}) {
    return this.client.put(url, data, config);
  }

  async delete(url, config = {}) {
    return this.client.delete(url, config);
  }

  async patch(url, data = {}, config = {}) {
    return this.client.patch(url, data, config);
  }
}

export const apiClient = new APIClient();
```

## 3. 认证工具函数 (utils/auth.js)

```javascript
// src/utils/auth.js
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

export const getAuthToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setAuthToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getUserData = () => {
  const userData = localStorage.getItem(USER_KEY);
  return userData ? JSON.parse(userData) : null;
};

export const setUserData = (user) => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const isAuthenticated = () => {
  const token = getAuthToken();
  const user = getUserData();
  return !!(token && user);
};
```

## 4. 认证上下文 (contexts/AuthContext.jsx)

```jsx
// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUserData, setUserData, removeAuthToken, isAuthenticated } from '../utils/auth';
import { apiClient } from '../api/apiClient';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      if (isAuthenticated()) {
        const userData = getUserData();
        setUser(userData);
        setIsLoggedIn(true);
        
        // 验证token是否仍然有效
        await validateToken();
      }
    } catch (error) {
      console.error('认证初始化失败:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const validateToken = async () => {
    try {
      const response = await apiClient.get('/auth/validate');
      if (response.data.valid) {
        // Token有效，更新用户数据
        if (response.data.user) {
          setUser(response.data.user);
          setUserData(response.data.user);
        }
      } else {
        throw new Error('Token无效');
      }
    } catch (error) {
      throw error;
    }
  };

  const login = async (credentials) => {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      const { token, user: userData } = response.data;
      
      // 保存认证信息
      setAuthToken(token);
      setUserData(userData);
      setUser(userData);
      setIsLoggedIn(true);
      
      return { success: true, user: userData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await apiClient.post('/auth/register', userData);
      const { token, user: newUser } = response.data;
      
      // 自动登录
      setAuthToken(token);
      setUserData(newUser);
      setUser(newUser);
      setIsLoggedIn(true);
      
      return { success: true, user: newUser };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
    setIsLoggedIn(false);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    setUserData(updatedUser);
  };

  const value = {
    user,
    isLoggedIn,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: () => isLoggedIn
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
```

## 5. 社区状态管理 (contexts/CommunityContext.jsx)

```jsx
// src/contexts/CommunityContext.jsx
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { communityApi } from '../api/communityApi';
import { useAuth } from './AuthContext';

const CommunityContext = createContext();

export const useCommunity = () => {
  const context = useContext(CommunityContext);
  if (!context) {
    throw new Error('useCommunity must be used within a CommunityProvider');
  }
  return context;
};

// 状态管理
const initialState = {
  questions: [],
  currentQuestion: null,
  answers: [],
  userProfile: null,
  userBadges: null,
  userReputation: null,
  loading: {
    questions: false,
    question: false,
    answers: false,
    profile: false,
    badges: false,
    reputation: false
  },
  error: null,
  pagination: null,
  filters: {
    search: '',
    subject_code: '',
    difficulty: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  }
};

const communityReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.key]: action.value
        }
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.error
      };
    
    case 'SET_QUESTIONS':
      return {
        ...state,
        questions: action.questions,
        pagination: action.pagination
      };
    
    case 'ADD_QUESTION':
      return {
        ...state,
        questions: [action.question, ...state.questions]
      };
    
    case 'UPDATE_QUESTION':
      return {
        ...state,
        questions: state.questions.map(q => 
          q.id === action.question.id ? action.question : q
        ),
        currentQuestion: state.currentQuestion?.id === action.question.id 
          ? action.question 
          : state.currentQuestion
      };
    
    case 'DELETE_QUESTION':
      return {
        ...state,
        questions: state.questions.filter(q => q.id !== action.questionId)
      };
    
    case 'SET_CURRENT_QUESTION':
      return {
        ...state,
        currentQuestion: action.question
      };
    
    case 'SET_ANSWERS':
      return {
        ...state,
        answers: action.answers
      };
    
    case 'ADD_ANSWER':
      return {
        ...state,
        answers: [action.answer, ...state.answers]
      };
    
    case 'UPDATE_ANSWER':
      return {
        ...state,
        answers: state.answers.map(a => 
          a.id === action.answer.id ? action.answer : a
        )
      };
    
    case 'DELETE_ANSWER':
      return {
        ...state,
        answers: state.answers.filter(a => a.id !== action.answerId)
      };
    
    case 'SET_USER_PROFILE':
      return {
        ...state,
        userProfile: action.profile
      };
    
    case 'SET_USER_BADGES':
      return {
        ...state,
        userBadges: action.badges
      };
    
    case 'SET_USER_REPUTATION':
      return {
        ...state,
        userReputation: action.reputation
      };
    
    case 'SET_FILTERS':
      return {
        ...state,
        filters: {
          ...state.filters,
          ...action.filters
        }
      };
    
    case 'UPDATE_VOTE':
      const { contentType, contentId, newVotes } = action;
      if (contentType === 'question') {
        return {
          ...state,
          questions: state.questions.map(q => 
            q.id === contentId ? { ...q, ...newVotes } : q
          ),
          currentQuestion: state.currentQuestion?.id === contentId 
            ? { ...state.currentQuestion, ...newVotes }
            : state.currentQuestion
        };
      } else if (contentType === 'answer') {
        return {
          ...state,
          answers: state.answers.map(a => 
            a.id === contentId ? { ...a, ...newVotes } : a
          )
        };
      }
      return state;
    
    default:
      return state;
  }
};

export const CommunityProvider = ({ children }) => {
  const [state, dispatch] = useReducer(communityReducer, initialState);
  const { user } = useAuth();

  // Actions
  const setLoading = (key, value) => {
    dispatch({ type: 'SET_LOADING', key, value });
  };

  const setError = (error) => {
    dispatch({ type: 'SET_ERROR', error });
  };

  const fetchQuestions = async (params = {}) => {
    try {
      setLoading('questions', true);
      setError(null);
      
      const mergedParams = { ...state.filters, ...params };
      const response = await communityApi.getQuestions(mergedParams);
      
      dispatch({ 
        type: 'SET_QUESTIONS', 
        questions: response.questions, 
        pagination: response.pagination 
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading('questions', false);
    }
  };

  const fetchQuestion = async (id) => {
    try {
      setLoading('question', true);
      setError(null);
      
      const response = await communityApi.getQuestion(id);
      
      dispatch({ type: 'SET_CURRENT_QUESTION', question: response.question });
      if (response.answers) {
        dispatch({ type: 'SET_ANSWERS', answers: response.answers });
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading('question', false);
    }
  };

  const createQuestion = async (questionData) => {
    try {
      const response = await communityApi.createQuestion(questionData);
      dispatch({ type: 'ADD_QUESTION', question: response.question });
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const updateQuestion = async (id, questionData) => {
    try {
      const response = await communityApi.updateQuestion(id, questionData);
      dispatch({ type: 'UPDATE_QUESTION', question: response.question });
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const deleteQuestion = async (id) => {
    try {
      await communityApi.deleteQuestion(id);
      dispatch({ type: 'DELETE_QUESTION', questionId: id });
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const createAnswer = async (answerData) => {
    try {
      const response = await communityApi.createAnswer(answerData);
      dispatch({ type: 'ADD_ANSWER', answer: response.answer });
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const updateAnswer = async (id, answerData) => {
    try {
      const response = await communityApi.updateAnswer(id, answerData);
      dispatch({ type: 'UPDATE_ANSWER', answer: response.answer });
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const deleteAnswer = async (id) => {
    try {
      await communityApi.deleteAnswer(id);
      dispatch({ type: 'DELETE_ANSWER', answerId: id });
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const createInteraction = async (interactionData) => {
    try {
      const response = await communityApi.createInteraction(interactionData);
      
      // 更新本地投票状态
      dispatch({
        type: 'UPDATE_VOTE',
        contentType: interactionData.contentType,
        contentId: interactionData.contentId,
        newVotes: response.newVotes
      });
      
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const fetchUserProfile = async (userId) => {
    try {
      setLoading('profile', true);
      const response = await communityApi.getUserProfile(userId);
      dispatch({ type: 'SET_USER_PROFILE', profile: response.profile });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading('profile', false);
    }
  };

  const fetchUserBadges = async (userId) => {
    try {
      setLoading('badges', true);
      const response = await communityApi.getUserBadges(userId);
      dispatch({ type: 'SET_USER_BADGES', badges: response.badges });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading('badges', false);
    }
  };

  const fetchUserReputation = async (userId) => {
    try {
      setLoading('reputation', true);
      const response = await communityApi.getUserReputation(userId);
      dispatch({ type: 'SET_USER_REPUTATION', reputation: response.reputation });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading('reputation', false);
    }
  };

  const updateFilters = (newFilters) => {
    dispatch({ type: 'SET_FILTERS', filters: newFilters });
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    // State
    ...state,
    
    // Actions
    fetchQuestions,
    fetchQuestion,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    createAnswer,
    updateAnswer,
    deleteAnswer,
    createInteraction,
    fetchUserProfile,
    fetchUserBadges,
    fetchUserReputation,
    updateFilters,
    clearError
  };

  return (
    <CommunityContext.Provider value={value}>
      {children}
    </CommunityContext.Provider>
  );
};
```

## 6. 自定义Hook示例 (hooks/useCommunity.js)

```javascript
// src/hooks/useCommunityData.js
import { useState, useEffect } from 'react';
import { communityApi } from '../api/communityApi';

// 获取问题列表的Hook
export const useQuestions = (params = {}) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);

  const fetchQuestions = async (newParams = {}) => {
    try {
      setLoading(true);
      setError(null);
      const mergedParams = { ...params, ...newParams };
      const response = await communityApi.getQuestions(mergedParams);
      setQuestions(response.questions);
      setPagination(response.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [JSON.stringify(params)]);

  return {
    questions,
    loading,
    error,
    pagination,
    refetch: fetchQuestions
  };
};

// 获取单个问题的Hook
export const useQuestion = (questionId) => {
  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchQuestion = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await communityApi.getQuestion(questionId);
      setQuestion(response.question);
      setAnswers(response.answers || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (questionId) {
      fetchQuestion();
    }
  }, [questionId]);

  return {
    question,
    answers,
    loading,
    error,
    refetch: fetchQuestion,
    setAnswers
  };
};

// 用户档案Hook
export const useUserProfile = (userId) => {
  const [profile, setProfile] = useState(null);
  const [badges, setBadges] = useState(null);
  const [reputation, setReputation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [profileResponse, badgesResponse, reputationResponse] = await Promise.all([
        communityApi.getUserProfile(userId),
        communityApi.getUserBadges(userId),
        communityApi.getUserReputation(userId)
      ]);
      
      setProfile(profileResponse.profile);
      setBadges(badgesResponse.badges);
      setReputation(reputationResponse.reputation);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  return {
    profile,
    badges,
    reputation,
    loading,
    error,
    refetch: fetchUserData
  };
};

// 投票Hook
export const useVoting = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const vote = async (contentType, contentId, voteType) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await communityApi.createInteraction({
        contentType,
        contentId,
        interactionType: voteType
      });
      
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    vote,
    loading,
    error
  };
};
```

## 7. 应用根组件配置 (App.jsx)

```jsx
// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CommunityProvider } from './contexts/CommunityContext';
import { Toaster } from 'react-hot-toast';

// 组件导入
import Navbar from './components/Layout/Navbar';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import QuestionList from './components/Community/QuestionList';
import QuestionDetail from './components/Community/QuestionDetail';
import QuestionForm from './components/Community/QuestionForm';
import UserProfile from './components/Community/UserProfile';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Home from './components/Home/Home';

function App() {
  return (
    <Router>
      <AuthProvider>
        <CommunityProvider>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            
            <main className="container mx-auto px-4 py-8">
              <Routes>
                {/* 公开路由 */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                {/* 社区路由 */}
                <Route path="/community" element={<QuestionList />} />
                <Route path="/community/:subjectCode" element={<QuestionList />} />
                <Route path="/community/questions/:id" element={<QuestionDetail />} />
                <Route path="/community/users/:userId" element={<UserProfile />} />
                
                {/* 需要认证的路由 */}
                <Route path="/community/ask" element={
                  <ProtectedRoute>
                    <QuestionForm />
                  </ProtectedRoute>
                } />
                
                {/* 404页面 */}
                <Route path="*" element={
                  <div className="text-center py-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                    <p className="text-gray-600">页面不存在</p>
                  </div>
                } />
              </Routes>
            </main>
            
            {/* 全局通知 */}
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
              }}
            />
          </div>
        </CommunityProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
```

## 8. 环境变量配置 (.env)

```bash
# .env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_NAME=CIE Copilot
VITE_APP_VERSION=1.0.0
```

## 9. 使用示例

### 在组件中使用Context

```jsx
// 使用认证Context
import { useAuth } from '../contexts/AuthContext';

const MyComponent = () => {
  const { user, isLoggedIn, login, logout } = useAuth();
  
  // 组件逻辑
};

// 使用社区Context
import { useCommunity } from '../contexts/CommunityContext';

const QuestionComponent = () => {
  const { 
    questions, 
    loading, 
    error, 
    fetchQuestions, 
    createQuestion 
  } = useCommunity();
  
  // 组件逻辑
};
```

### 使用自定义Hook

```jsx
import { useQuestions, useQuestion } from '../hooks/useCommunityData';

const QuestionListComponent = () => {
  const { questions, loading, error, refetch } = useQuestions({
    subject_code: '9709',
    difficulty: 'intermediate'
  });
  
  // 组件逻辑
};
```

## 10. 错误处理和加载状态

```jsx
// 错误边界组件
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">出错了</h1>
            <p className="text-gray-600 mb-4">应用遇到了一个错误</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 加载组件
const LoadingSpinner = ({ size = 'medium' }) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  return (
    <div className="flex justify-center items-center">
      <div className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-gray-300 border-t-blue-600`}></div>
    </div>
  );
};
```

## 总结

这个状态管理系统提供了：

1. **统一的API客户端** - 处理所有HTTP请求和错误
2. **认证管理** - JWT token管理和用户状态
3. **社区状态管理** - 使用Context和Reducer模式
4. **自定义Hook** - 封装常用的数据获取逻辑
5. **错误处理** - 统一的错误处理机制
6. **加载状态** - 优雅的加载状态管理

Agent B可以基于这个架构快速开始开发，确保数据流清晰、状态管理一致、用户体验良好。