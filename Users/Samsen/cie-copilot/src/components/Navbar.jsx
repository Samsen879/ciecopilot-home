import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => (
  <nav className="bg-white border-b shadow mb-4">
    <div className="container mx-auto flex justify-between items-center py-3 px-4">
      <Link to="/" className="text-2xl font-bold text-blue-500">CIE Copilot</Link>
      <div className="flex space-x-6">
        <Link to="/" className="hover:text-blue-500">首页</Link>
        <Link to="/topics" className="hover:text-blue-500">知识卡片</Link>
        <Link to="/ask-ai" className="hover:text-blue-500">AI问答</Link>
        {/* 添加 Navigation icon.png 图标到导航栏右侧 */}
        <img src="/nav-icon.png" alt="Navigation Icon" className="h-6 w-6" />
      </div>
    </div>
  </nav>
);

export default Navbar;