import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

// 创建认证上下文
const AuthContext = createContext({});

// 自定义Hook用于使用认证上下文
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// 认证提供者组件
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // 初始化时检查用户登录状态并设置认证监听器
  useEffect(() => {
    checkUserSession();
    
    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('认证状态变化:', event, session);
        
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
        }
        
        setLoading(false);
      }
    );
    
    // 清理订阅
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // 检查用户会话
  const checkUserSession = async () => {
    try {
      setLoading(true);
      
      // 获取当前会话
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('获取会话失败:', error);
        return;
      }
      
      if (session?.user) {
        setUser(session.user);
      }
    } catch (error) {
      console.error('检查用户会话失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 登录函数
  const signIn = async (email, password) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      setUser(data.user);
      return { user: data.user, error: null };
    } catch (error) {
      console.error('登录失败:', error);
      return { user: null, error };
    } finally {
      setLoading(false);
    }
  };

  // 注册函数
  const signUp = async (email, password, name) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name
          }
        }
      });
      
      if (error) throw error;
      
      // 注册成功，但可能需要邮箱验证
      if (data.user && !data.session) {
        return { 
          user: data.user, 
          error: null, 
          needsVerification: true 
        };
      }
      
      setUser(data.user);
      return { user: data.user, error: null, needsVerification: false };
    } catch (error) {
      console.error('注册失败:', error);
      return { user: null, error, needsVerification: false };
    } finally {
      setLoading(false);
    }
  };

  // 登出函数
  const signOut = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // 清除本地状态
      setUser(null);
      
      return { error: null };
    } catch (error) {
      console.error('登出失败:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // 重置密码
  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (error) throw error;
      
      console.log('密码重置邮件已发送到:', email);
      return { error: null };
    } catch (error) {
      console.error('密码重置失败:', error);
      return { error };
    }
  };

  // 更新用户资料
  const updateProfile = async (updates) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.updateUser({
        data: updates
      });
      if (error) throw error;
      
      setUser(data.user);
      return { user: data.user, error: null };
    } catch (error) {
      console.error('更新用户资料失败:', error);
      return { user: null, error };
    } finally {
      setLoading(false);
    }
  };

  // 打开认证模态框
  const openAuthModal = () => setIsAuthModalOpen(true);
  
  // 关闭认证模态框
  const closeAuthModal = () => setIsAuthModalOpen(false);

  // 检查用户是否已登录
  const isAuthenticated = !!user;

  // 获取用户显示名称
  const getUserDisplayName = () => {
    if (!user) return '';
    return user.user_metadata?.name || user.name || user.email?.split('@')[0] || '用户';
  };

  // 上下文值
  const value = {
    // 用户状态
    user,
    loading,
    isAuthenticated,
    
    // 认证方法
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    
    // 模态框状态
    isAuthModalOpen,
    openAuthModal,
    closeAuthModal,
    
    // 工具方法
    getUserDisplayName,
    checkUserSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;