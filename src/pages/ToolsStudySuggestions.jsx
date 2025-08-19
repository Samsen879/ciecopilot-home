import React from 'react';
import PersonalizedRecommendations from '../components/AI/PersonalizedRecommendations';

export default function ToolsStudySuggestions() {
  return (
    <div className="container mx-auto px-4 py-24">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Study Suggestions</h1>
      <PersonalizedRecommendations subjectCode="9702" />
    </div>
  );
}


