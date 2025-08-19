import React from 'react';
import ChatPanel from '../components/ChatPanel';

export default function ToolsImageSolver() {
  return (
    <div className="container mx-auto px-4 py-24">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Image Problem Solving</h1>
      <p className="text-gray-600 mb-4">Upload an image with a question, and get AI-assisted solutions with citations.</p>
      <div className="bg-white rounded-2xl shadow p-4">
        <ChatPanel />
      </div>
    </div>
  );
}


