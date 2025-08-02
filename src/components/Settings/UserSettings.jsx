import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Lock, 
  Bell, 
  Palette, 
  Globe, 
  Target, 
  Clock, 
  BookOpen, 
  Save, 
  Camera, 
  Eye, 
  EyeOff,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';

// 用户设置组件
const UserSettings = () => {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', content: '' });
  
  // 个人信息设置
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    avatar: '',
    bio: '',
    school: '',
    grade: '',
    subjects: []
  });
  
  // 密码修改
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  // 学习偏好设置
  const [preferences, setPreferences] = useState({
    dailyGoal: 5, // 每日学习主题数
    studyTime: 30, // 每次学习时间（分钟）
    difficulty: 'medium', // 默认难度
    reminderTime: '19:00', // 提醒时间
    autoSave: true, // 自动保存进度
    showHints: true, // 显示提示
    darkMode: false, // 深色模式
    language: 'zh-CN' // 界面语言
  });
  
  // 通知设置
  const [notifications, setNotifications] = useState({
    dailyReminder: true,
    weeklyReport: true,
    achievementAlert: true,
    errorBookReminder: true,
    emailNotifications: false,
    pushNotifications: true
  });

  // 初始化数据
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        avatar: user.avatar || '',
        bio: user.bio || '',
        school: user.school || '',
        grade: user.grade || '',
        subjects: user.subjects || []
      });
    }
    
    // 从localStorage加载设置
    const savedPreferences = localStorage.getItem('userPreferences');
    if (savedPreferences) {
      setPreferences(JSON.parse(savedPreferences));
    }
    
    const savedNotifications = localStorage.getItem('notificationSettings');
    if (savedNotifications) {
      setNotifications(JSON.parse(savedNotifications));
    }
  }, [user]);

  // 显示消息
  const showMessage = (type, content) => {
    setMessage({ type, content });
    setTimeout(() => setMessage({ type: '', content: '' }), 3000);
  };

  // 保存个人信息
  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      // 使用Supabase更新用户资料
      const { error } = await updateProfile({
        name: profileData.name,
        bio: profileData.bio,
        school: profileData.school,
        grade: profileData.grade,
        subjects: profileData.subjects
      });
      
      if (error) throw error;
      
      showMessage('success', '个人信息已更新');
    } catch (error) {
      showMessage('error', '更新失败：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 修改密码
  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage('error', '新密码确认不匹配');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      showMessage('error', '密码长度至少6位');
      return;
    }
    
    setLoading(true);
    try {
      // 使用Supabase更新密码
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });
      
      if (error) throw error;
      
      showMessage('success', '密码已更新');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      showMessage('error', '密码修改失败：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 保存偏好设置
  const handleSavePreferences = () => {
    localStorage.setItem('userPreferences', JSON.stringify(preferences));
    showMessage('success', '偏好设置已保存');
  };

  // 保存通知设置
  const handleSaveNotifications = () => {
    localStorage.setItem('notificationSettings', JSON.stringify(notifications));
    showMessage('success', '通知设置已保存');
  };

  // 标签页配置
  const tabs = [
    { id: 'profile', label: '个人信息', icon: User },
    { id: 'security', label: '安全设置', icon: Lock },
    { id: 'preferences', label: '学习偏好', icon: Target },
    { id: 'notifications', label: '通知设置', icon: Bell }
  ];

  // 动画变体
  const tabContentVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          用户设置
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          管理您的个人信息和应用偏好
        </p>
      </div>

      {/* 消息提示 */}
      {message.content && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
              : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}
        >
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
          {message.content}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* 侧边栏标签 */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
            <nav className="space-y-2">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="lg:col-span-3">
          <motion.div
            key={activeTab}
            variants={tabContentVariants}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
          >
            {/* 个人信息标签 */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  个人信息
                </h2>
                
                {/* 头像上传 */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                      {profileData.avatar ? (
                        <img src={profileData.avatar} alt="头像" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-12 h-12 text-gray-400" />
                      )}
                    </div>
                    <button className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors">
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      更换头像
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      支持 JPG、PNG 格式，建议尺寸 200x200
                    </p>
                  </div>
                </div>
                
                {/* 基本信息表单 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      姓名
                    </label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      邮箱
                    </label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      学校
                    </label>
                    <input
                      type="text"
                      value={profileData.school}
                      onChange={(e) => setProfileData(prev => ({ ...prev, school: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      年级
                    </label>
                    <select
                      value={profileData.grade}
                      onChange={(e) => setProfileData(prev => ({ ...prev, grade: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">选择年级</option>
                      <option value="AS">AS Level</option>
                      <option value="A2">A2 Level</option>
                      <option value="IGCSE">IGCSE</option>
                    </select>
                  </div>
                </div>
                
                {/* 个人简介 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    个人简介
                  </label>
                  <textarea
                    value={profileData.bio}
                    onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="介绍一下自己..."
                  />
                </div>
                
                <button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="w-5 h-5" />
                  {loading ? '保存中...' : '保存更改'}
                </button>
              </div>
            )}

            {/* 安全设置标签 */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  安全设置
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      当前密码
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        className="w-full px-4 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      新密码
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="w-full px-4 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      确认新密码
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full px-4 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={handleChangePassword}
                  disabled={loading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Lock className="w-5 h-5" />
                  {loading ? '更新中...' : '更新密码'}
                </button>
              </div>
            )}

            {/* 学习偏好标签 */}
            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  学习偏好
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      每日学习目标（主题数）
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={preferences.dailyGoal}
                      onChange={(e) => setPreferences(prev => ({ ...prev, dailyGoal: parseInt(e.target.value) }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      单次学习时间（分钟）
                    </label>
                    <input
                      type="number"
                      min="15"
                      max="120"
                      step="15"
                      value={preferences.studyTime}
                      onChange={(e) => setPreferences(prev => ({ ...prev, studyTime: parseInt(e.target.value) }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      默认难度
                    </label>
                    <select
                      value={preferences.difficulty}
                      onChange={(e) => setPreferences(prev => ({ ...prev, difficulty: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    >
                      <option value="easy">简单</option>
                      <option value="medium">中等</option>
                      <option value="hard">困难</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      学习提醒时间
                    </label>
                    <input
                      type="time"
                      value={preferences.reminderTime}
                      onChange={(e) => setPreferences(prev => ({ ...prev, reminderTime: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                
                {/* 开关设置 */}
                <div className="space-y-4">
                  {[
                    { key: 'autoSave', label: '自动保存学习进度', icon: Save },
                    { key: 'showHints', label: '显示学习提示', icon: BookOpen },
                    { key: 'darkMode', label: '深色模式', icon: Palette }
                  ].map(setting => {
                    const Icon = setting.icon;
                    return (
                      <div key={setting.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          <span className="text-gray-900 dark:text-white">{setting.label}</span>
                        </div>
                        <button
                          onClick={() => setPreferences(prev => ({ ...prev, [setting.key]: !prev[setting.key] }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            preferences[setting.key] ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              preferences[setting.key] ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
                
                <button
                  onClick={handleSavePreferences}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-5 h-5" />
                  保存偏好设置
                </button>
              </div>
            )}

            {/* 通知设置标签 */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  通知设置
                </h2>
                
                <div className="space-y-4">
                  {[
                    { key: 'dailyReminder', label: '每日学习提醒', desc: '在设定时间提醒您开始学习' },
                    { key: 'weeklyReport', label: '周学习报告', desc: '每周发送学习进度总结' },
                    { key: 'achievementAlert', label: '成就通知', desc: '获得新成就时通知您' },
                    { key: 'errorBookReminder', label: '错题复习提醒', desc: '提醒您复习错题本中的题目' },
                    { key: 'emailNotifications', label: '邮件通知', desc: '通过邮件接收重要通知' },
                    { key: 'pushNotifications', label: '推送通知', desc: '接收浏览器推送通知' }
                  ].map(notification => (
                    <div key={notification.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <h3 className="text-gray-900 dark:text-white font-medium">{notification.label}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{notification.desc}</p>
                      </div>
                      <button
                        onClick={() => setNotifications(prev => ({ ...prev, [notification.key]: !prev[notification.key] }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          notifications[notification.key] ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            notifications[notification.key] ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={handleSaveNotifications}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  保存通知设置
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;