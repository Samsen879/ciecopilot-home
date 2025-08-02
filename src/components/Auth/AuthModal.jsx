import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';

const AuthModal = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState(initialMode); // 'login' or 'signup'
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  // 处理登录
  const handleLogin = async (formData) => {
    setIsLoading(true);
    try {
      const result = await signIn(formData.email, formData.password);
      if (result.error) {
        throw result.error;
      }
      // 登录成功后关闭模态框
      onClose();
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 处理注册
  const handleSignup = async (formData) => {
    setIsLoading(true);
    try {
      const result = await signUp(formData.email, formData.password, formData.name);
      if (result.error) {
        throw result.error;
      }
      // 注册成功后关闭模态框
      onClose();
    } catch (error) {
      console.error('注册失败:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 切换模式
  const switchToLogin = () => setMode('login');
  const switchToSignup = () => setMode('signup');

  // 处理模态框关闭
  const handleClose = () => {
    if (!isLoading) {
      onClose();
      // 重置模式为登录
      setTimeout(() => setMode('login'), 300);
    }
  };

  // 处理背景点击
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-5 h-5" />
            </button>

            {/* 表单内容 */}
            <AnimatePresence mode="wait">
              {mode === 'login' ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <LoginForm
                    onLogin={handleLogin}
                    onSwitchToSignup={switchToSignup}
                    isLoading={isLoading}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="signup"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <SignupForm
                    onSignup={handleSignup}
                    onSwitchToLogin={switchToLogin}
                    isLoading={isLoading}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;