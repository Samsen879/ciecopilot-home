import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";

// Lazy loaded components for better performance
const Home = React.lazy(() => import("./pages/Home"));
const Topics = React.lazy(() => import("./pages/Topics"));
const AskAI = React.lazy(() => import("./pages/AskAI"));
const PaperPage = React.lazy(() => import("./pages/PaperPage"));
const TopicDetail = React.lazy(() => import("./pages/TopicDetail"));
const PhysicsASLevel = React.lazy(() => import("./pages/PhysicsASLevel"));
const PhysicsA2Level = React.lazy(() => import("./pages/PhysicsA2Level"));

// Subject-specific pages - lazy loaded
const SubjectSelection = React.lazy(() => import("./pages/SubjectSelection"));
const MathematicsTopics = React.lazy(() => import("./pages/MathematicsTopics"));
const FurtherMathematicsTopics = React.lazy(() => import("./pages/FurtherMathematicsTopics"));
const PhysicsTopics = React.lazy(() => import("./pages/PhysicsTopics"));

// Paper selection pages - lazy loaded
const MathematicsPapers = React.lazy(() => import("./pages/MathematicsPapers"));
const FurtherMathematicsPapers = React.lazy(() => import("./pages/FurtherMathematicsPapers"));
const PhysicsPapers = React.lazy(() => import("./pages/PhysicsPapers"));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      <p className="text-gray-600 dark:text-gray-300 font-medium">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
            <Navbar />
            <div className="flex-1">
              <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  
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
                  <Route path="/ask-ai" element={
                    <div className="container mx-auto p-4">
                      <AskAI />
                    </div>
                  } />
                  
                  {/* Dynamic Pages */}
                  <Route path="/paper/:subject/:paper" element={<PaperPage />} />
                  <Route path="/topic/:subject/:paper/:topicId" element={<TopicDetail />} />
                  
                  {/* 404 Page */}
                  <Route path="*" element={
                    <div className="container mx-auto p-4">
                      <NotFound />
                    </div>
                  } />
                </Routes>
              </Suspense>
            </div>
            <Footer />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
