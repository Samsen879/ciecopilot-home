import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, 
  RefreshCw, 
  Download, 
  Upload, 
  Trash2, 
  Users, 
  BookOpen, 
  FileText, 
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Info,
  Settings
} from 'lucide-react';

// 数据库管理组件
const DatabaseManager = () => {
  const [stats, setStats] = useState({
    users: 0,
    subjects: 0,
    papers: 0,
    topics: 0,
    studyRecords: 0,
    errorRecords: 0
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', content: '' });
  const [activeTab, setActiveTab] = useState('overview');
  const [migrationStatus, setMigrationStatus] = useState('pending'); // pending, running, completed, error

  // TODO: 当Supabase配置完成后，替换为真实数据获取
  useEffect(() => {
    loadDatabaseStats();
  }, []);

  // 加载数据库统计
  const loadDatabaseStats = async () => {
    setLoading(true);
    try {
      // TODO: 替换为真实的Supabase查询
      /*
      const [usersResult, subjectsResult, papersResult, topicsResult, studyResult, errorResult] = await Promise.all([
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('subjects').select('*', { count: 'exact', head: true }),
        supabase.from('papers').select('*', { count: 'exact', head: true }),
        supabase.from('topics').select('*', { count: 'exact', head: true }),
        supabase.from('study_records').select('*', { count: 'exact', head: true }),
        supabase.from('error_book').select('*', { count: 'exact', head: true })
      ]);
      
      setStats({
        users: usersResult.count || 0,
        subjects: subjectsResult.count || 0,
        papers: papersResult.count || 0,
        topics: topicsResult.count || 0,
        studyRecords: studyResult.count || 0,
        errorRecords: errorResult.count || 0
      });
      */
      
      // 模拟数据
      setStats({
        users: 12,
        subjects: 3,
        papers: 8,
        topics: 156,
        studyRecords: 1247,
        errorRecords: 89
      });
      
    } catch (error) {
      showMessage('error', '加载统计数据失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 显示消息
  const showMessage = (type, content) => {
    setMessage({ type, content });
    setTimeout(() => setMessage({ type: '', content: '' }), 5000);
  };

  // 运行数据迁移
  const runMigration = async () => {
    setMigrationStatus('running');
    setLoading(true);
    
    try {
      // TODO: 当Supabase配置完成后，调用真实的迁移脚本
      /*
      const response = await fetch('/api/migrate-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('迁移失败');
      }
      */
      
      // 模拟迁移过程
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setMigrationStatus('completed');
      showMessage('success', '数据迁移完成！');
      await loadDatabaseStats();
      
    } catch (error) {
      setMigrationStatus('error');
      showMessage('error', '数据迁移失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 备份数据库
  const backupDatabase = async () => {
    setLoading(true);
    try {
      // TODO: 实现数据库备份逻辑
      showMessage('info', '备份功能开发中...');
    } catch (error) {
      showMessage('error', '备份失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 清理数据库
  const cleanDatabase = async () => {
    if (!confirm('确定要清理数据库吗？这将删除所有用户数据（保留基础内容）。')) {
      return;
    }
    
    setLoading(true);
    try {
      // TODO: 实现数据库清理逻辑
      showMessage('info', '清理功能开发中...');
    } catch (error) {
      showMessage('error', '清理失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 统计卡片数据
  const statCards = [
    { label: '用户数量', value: stats.users, icon: Users, color: 'blue' },
    { label: '科目数量', value: stats.subjects, icon: BookOpen, color: 'green' },
    { label: '试卷数量', value: stats.papers, icon: FileText, color: 'purple' },
    { label: '主题数量', value: stats.topics, icon: Database, color: 'orange' },
    { label: '学习记录', value: stats.studyRecords, icon: BarChart3, color: 'indigo' },
    { label: '错题记录', value: stats.errorRecords, icon: AlertTriangle, color: 'red' }
  ];

  // 获取颜色类
  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
      green: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
      purple: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
      orange: 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
      indigo: 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
      red: 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
    };
    return colors[color] || colors.blue;
  };

  // 标签页
  const tabs = [
    { id: 'overview', label: '概览', icon: BarChart3 },
    { id: 'migration', label: '数据迁移', icon: Upload },
    { id: 'maintenance', label: '维护工具', icon: Settings }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              数据库管理
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              管理和维护应用数据库
            </p>
          </div>
        </div>
        
        <button
          onClick={loadDatabaseStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {/* 消息提示 */}
      {message.content && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
              : message.type === 'error'
              ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
              : 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
          }`}
        >
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : 
           message.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : 
           <Info className="w-5 h-5" />}
          {message.content}
        </motion.div>
      )}

      {/* 标签页导航 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* 概览标签 */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 统计卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {statCards.map((card, index) => {
                  const Icon = card.icon;
                  return (
                    <motion.div
                      key={card.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-lg ${getColorClasses(card.color)}`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                          {card.value.toLocaleString()}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {card.label}
                      </h3>
                    </motion.div>
                  );
                })}
              </div>

              {/* 数据库状态 */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  数据库状态
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <span className="text-gray-700 dark:text-gray-300">连接状态</span>
                    <span className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      正常
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <span className="text-gray-700 dark:text-gray-300">最后更新</span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {new Date().toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 数据迁移标签 */}
          {activeTab === 'migration' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  数据迁移工具
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  将现有的JSON数据迁移到Supabase数据库
                </p>
              </div>

              {/* 迁移状态 */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                    迁移状态
                  </h4>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    migrationStatus === 'completed' ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' :
                    migrationStatus === 'running' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400' :
                    migrationStatus === 'error' ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400' :
                    'bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400'
                  }`}>
                    {migrationStatus === 'completed' ? '已完成' :
                     migrationStatus === 'running' ? '进行中' :
                     migrationStatus === 'error' ? '失败' : '待执行'}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-gray-700 dark:text-gray-300">数学科目数据 (9709)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-gray-700 dark:text-gray-300">进阶数学科目数据 (9231)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-gray-700 dark:text-gray-300">物理科目数据 (9702)</span>
                  </div>
                </div>
              </div>

              {/* 迁移按钮 */}
              <div className="text-center">
                <button
                  onClick={runMigration}
                  disabled={loading || migrationStatus === 'running'}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mx-auto"
                >
                  <Upload className={`w-5 h-5 ${migrationStatus === 'running' ? 'animate-pulse' : ''}`} />
                  {migrationStatus === 'running' ? '迁移中...' : '开始迁移'}
                </button>
              </div>
            </div>
          )}

          {/* 维护工具标签 */}
          {activeTab === 'maintenance' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  维护工具
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  数据库备份、清理和优化工具
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 备份工具 */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Download className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                      数据备份
                    </h4>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    创建数据库的完整备份，包括所有用户数据和内容。
                  </p>
                  <button
                    onClick={backupDatabase}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    创建备份
                  </button>
                </div>

                {/* 清理工具 */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                      数据清理
                    </h4>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    清理用户数据，保留基础内容结构。此操作不可逆。
                  </p>
                  <button
                    onClick={cleanDatabase}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    清理数据
                  </button>
                </div>
              </div>

              {/* 警告信息 */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  <div>
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                      注意事项
                    </h4>
                    <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
                      维护操作可能影响应用正常使用，建议在低峰时段执行。清理操作不可逆，请谨慎操作。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DatabaseManager;