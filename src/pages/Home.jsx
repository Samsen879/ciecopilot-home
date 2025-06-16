import React from "react";
import { Link } from "react-router-dom";

const Home = () => (
  <div className="text-center mt-10">
    <h1 className="text-3xl font-bold mb-6">欢迎来到 AI Tutor App</h1>
    <p className="mb-8 text-lg text-gray-700">
      针对 CIE A Level 数学、进阶数学与物理的近一对一高性价比AI学习平台
    </p>
    <div className="flex justify-center space-x-6">
      <Link to="/topics" className="bg-blue-600 text-white px-6 py-3 rounded-2xl shadow hover:bg-blue-700 text-lg">
        查看知识卡片
      </Link>
      <Link to="/ask-ai" className="bg-green-600 text-white px-6 py-3 rounded-2xl shadow hover:bg-green-700 text-lg">
        进入AI问答
      </Link>
    </div>
  </div>
);

export default Home;
