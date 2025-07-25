import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Navbar from './components/Navbar';

const Home = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    {/* Hero Section */}
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-5xl font-bold text-gray-800 mb-6">
        Personalized A Level<br />Learning Assistant
      </h1>
      <p className="text-xl text-gray-600 mb-4 max-w-3xl mx-auto">
        Exclusively designed for CIE exam board with comprehensive syllabus coverage, 
        AI-powered error analysis and past paper pattern summaries
      </p>
      <p className="text-lg text-blue-600 mb-12">
        Need a quick recap? I'm here for you.
      </p>
      
      {/* CTA Buttons */}
      <div className="flex gap-4 justify-center">
        <Link 
          to="/topics" 
          className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
        >
          Explore Subjects
        </Link>
        <Link 
          to="/ask-ai" 
          className="border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white px-8 py-3 rounded-lg font-semibold transition-colors"
        >
          View All Features
        </Link>
      </div>
    </div>
  </div>
);

const Topics = () => (
  <div className="container mx-auto px-4 py-8">
    <h1 className="text-3xl font-bold mb-6">知识卡片</h1>
    <p>Topic cards will be displayed here.</p>
  </div>
);

const AskAI = () => (
  <div className="container mx-auto px-4 py-8">
    <h1 className="text-3xl font-bold mb-6">AI问答</h1>
    <p>AI chat interface will be implemented here.</p>
  </div>
);

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/topics" element={<Topics />} />
          <Route path="/ask-ai" element={<AskAI />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;