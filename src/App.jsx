import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { AIProvider } from './context/AIContext';
import { useAIContext } from './context/AIContext';
import ChatWidget from './components/ChatWidget';
import SelectionListener from './components/SelectionListener';
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";

// Lazy loaded components for better performance
const Home = React.lazy(() => import("./pages/Home"));
const HomeOrRedirect = React.lazy(() => import("./pages/HomeOrRedirect"));
const Topics = React.lazy(() => import("./pages/Topics"));
const AskAI = React.lazy(() => import("./pages/AskAI"));
const PaperPage = React.lazy(() => import("./pages/PaperPage"));
const TopicDetail = React.lazy(() => import("./pages/TopicDetail"));
const PhysicsASLevel = React.lazy(() => import("./pages/PhysicsASLevel"));
const PhysicsA2Level = React.lazy(() => import("./pages/PhysicsA2Level"));
const StudyHub = React.lazy(() => import("./pages/StudyHub"));
const AITutoring = React.lazy(() => import("./pages/AITutoring"));
const SubjectPage = React.lazy(() => import('./pages/SubjectPage'));
const Search = React.lazy(() => import('./pages/Search'));
const LearningPath = React.lazy(() => import('./pages/LearningPath'));
const CommunityAndRecommendations = React.lazy(() => import('./pages/CommunityAndRecommendations'));
const QuestionDetail = React.lazy(() => import('./pages/QuestionDetail'));

// Subject-specific pages - lazy loaded
const SubjectSelection = React.lazy(() => import("./pages/SubjectSelection"));
const MathematicsTopics = React.lazy(() => import("./pages/MathematicsTopics"));
const FurtherMathematicsTopics = React.lazy(() => import("./pages/FurtherMathematicsTopics"));
const PhysicsTopics = React.lazy(() => import("./pages/PhysicsTopics"));
const PhysicsTopicDetail = React.lazy(() => import("./pages/PhysicsTopicDetail"));

// Paper selection pages - lazy loaded
const MathematicsPapers = React.lazy(() => import("./pages/MathematicsPapers"));
const FurtherMathematicsPapers = React.lazy(() => import("./pages/FurtherMathematicsPapers"));
const PhysicsPapers = React.lazy(() => import("./pages/PhysicsPapers"));

// Tools / Smart Function pages - lazy loaded
const ToolsImageSolver = React.lazy(() => import('./pages/ToolsImageSolver'));
const ToolsProgressTracking = React.lazy(() => import('./pages/ToolsProgressTracking'));
const ToolsSmartRecommendations = React.lazy(() => import('./pages/ToolsSmartRecommendations'));
const ToolsStudySuggestions = React.lazy(() => import('./pages/ToolsStudySuggestions'));

// Pricing page - lazy loaded
const Pricing = React.lazy(() => import('./pages/Pricing'));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      <p className="text-gray-600 dark:text-gray-300 font-medium">Loading...</p>
    </div>
  </div>
);

function ContentWithChatShift() {
  const { isChatOpen, panelWidth } = useAIContext();
  const rightPadding = isChatOpen ? panelWidth : 0;
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200" style={{ paddingRight: rightPadding, transition: 'padding-right 300ms ease' }}>
      <Navbar />
      <div className="flex-1">
        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              {/* Study Hub - The new central page */}
              <Route path="/study-hub" element={<StudyHub />} />
              <Route path="/study-hub/:subjectCode" element={<SubjectPage />} />
                              {/* Learning Path Page */}
                <Route path="/learning-path/:subjectCode" element={<LearningPath />} />
                {/* Community and Recommendations Page */}
                <Route path="/community/:subjectCode" element={<CommunityAndRecommendations />} />
                <Route path="/recommendations/:subjectCode" element={<CommunityAndRecommendations />} />
              {/* Subject Selection Page */}
              <Route path="/topics" element={<SubjectSelection />} />
              {/* Paper Selection Pages */}
              <Route path="/mathematics-papers" element={<MathematicsPapers />} />
              <Route path="/further-mathematics-papers" element={<FurtherMathematicsPapers />} />
              <Route path="/physics-papers" element={<PhysicsPapers />} />
              {/* Subject-specific Topic Pages */}
              <Route path="/mathematics-topics" element={<MathematicsTopics />} />
              <Route path="/topics/mathematics" element={<MathematicsTopics />} />
              <Route path="/topics/further-mathematics" element={<FurtherMathematicsTopics />} />
              <Route path="/topics/physics" element={<PhysicsTopics />} />
              {/* Legacy Physics routes for backward compatibility */}
              <Route path="/physics/as-level" element={<PhysicsASLevel />} />
              <Route path="/physics/a2-level" element={<PhysicsA2Level />} />
              {/* AI Chat Page */}
              <Route path="/ask-ai" element={<div className="container mx-auto p-4"><AskAI /></div>} />
              <Route path="/ai-tutoring" element={<AITutoring />} />
              {/* Search Page */}
              <Route path="/search" element={<Search />} />
              {/* Smart Tools */}
              <Route path="/tools/image-solver" element={<ToolsImageSolver />} />
              <Route path="/tools/progress-tracking" element={<ToolsProgressTracking />} />
              <Route path="/tools/smart-recommendations" element={<ToolsSmartRecommendations />} />
              <Route path="/tools/study-suggestions" element={<ToolsStudySuggestions />} />
              {/* Pricing Page */}
              <Route path="/pricing" element={<Pricing />} />
              {/* Dynamic Pages */}
              <Route path="/paper/:subject/:paper" element={<PaperPage />} />
              <Route path="/topic/:subject/:paper/:topicId" element={<TopicDetail />} />
              <Route path="/community/question/:questionId" element={<QuestionDetail />} />
              {/* Physics Topic Detail Page */}
              <Route path="/topic/physics/:paper/:topicId" element={<PhysicsTopicDetail />} />
              {/* 404 Page */}
              <Route path="/404" element={<div className="container mx-auto p-4"><NotFound /></div>} />
              <Route path="*" element={<div className="container mx-auto p-4"><NotFound /></div>} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
      <Footer />
      <SelectionListener />
      <ChatWidget />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AIProvider>
            <ContentWithChatShift />
          </AIProvider>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
