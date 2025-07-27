import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, BookOpen, Clock, Target } from 'lucide-react';
import { useTopicProgress } from '../hooks/useLocalStorage';

const ProgressDemo = () => {
  // 演示不同进度状态的topics
  const demoTopics = [
    { id: 'quadratic-equations', name: 'Quadratic Equations', subject: '9709', paper: 'p1' },
    { id: 'calculus-basics', name: 'Calculus Basics', subject: '9709', paper: 'p1' },
    { id: 'mechanics-forces', name: 'Forces & Motion', subject: '9702', paper: 'p1' }
  ];

  const { updateProgress: updateQuadratic } = useTopicProgress('9709-p1-quadratic-equations');
  const { updateProgress: updateCalculus } = useTopicProgress('9709-p1-calculus-basics');
  const { updateProgress: updateMechanics } = useTopicProgress('9702-p1-mechanics-forces');

  const simulateProgress = (updateFn, mastery, completed = false) => {
    updateFn({
      mastery,
      completed,
      score: mastery,
      attempts: Math.floor(mastery / 20)
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 
                 rounded-xl p-6 border border-purple-100 dark:border-purple-800 max-w-2xl mx-auto"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-500 text-white rounded-lg">
          <Trophy className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            进度追踪演示
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            点击按钮体验不同的学习进度状态
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            二次方程 (Quadratic Equations)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => simulateProgress(updateQuadratic, 45)}
              className="px-3 py-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-800/40 transition-colors"
            >
              45% 进度
            </button>
            <button
              onClick={() => simulateProgress(updateQuadratic, 85, true)}
              className="px-3 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full hover:bg-green-200 dark:hover:bg-green-800/40 transition-colors"
            >
              完成
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            微积分基础 (Calculus Basics)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => simulateProgress(updateCalculus, 25)}
              className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors"
            >
              25% 进度
            </button>
            <button
              onClick={() => simulateProgress(updateCalculus, 70)}
              className="px-3 py-1 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full hover:bg-orange-200 dark:hover:bg-orange-800/40 transition-colors"
            >
              70% 进度
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            力与运动 (Forces & Motion)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => simulateProgress(updateMechanics, 60)}
              className="px-3 py-1 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800/40 transition-colors"
            >
              60% 进度
            </button>
            <button
              onClick={() => simulateProgress(updateMechanics, 100, true)}
              className="px-3 py-1 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-800/40 transition-colors"
            >
              完美完成
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
        <div className="flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              如何使用进度追踪？
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              1. 点击上方按钮模拟学习进度<br/>
              2. 返回主题页面查看进度卡片<br/>
              3. 进度会自动保存在本地存储中
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProgressDemo; 