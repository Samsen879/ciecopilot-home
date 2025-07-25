import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Topics from "./pages/Topics";
import AskAI from "./pages/AskAI";
import NotFound from "./pages/NotFound";
import Landing from "./pages/Landing";
import PaperPage from "./pages/PaperPage";
import TopicDetail from "./pages/TopicDetail";
import FurtherMathTopics from "./pages/FurtherMathTopics";
import PhysicsASLevel from "./pages/PhysicsASLevel";
import PhysicsA2Level from "./pages/PhysicsA2Level";
// New subject-specific pages
import SubjectSelection from "./pages/SubjectSelection";
import MathematicsTopics from "./pages/MathematicsTopics";
import FurtherMathematicsTopics from "./pages/FurtherMathematicsTopics";
import PhysicsTopics from "./pages/PhysicsTopics";
// Paper selection pages - 与导航栏Start Learning完全一致
import MathematicsPapers from "./pages/MathematicsPapers";
import FurtherMathematicsPapers from "./pages/FurtherMathematicsPapers";
import PhysicsPapers from "./pages/PhysicsPapers";
// import { StagewiseToolbar } from "@stagewise/toolbar-react";
// import { ReactPlugin } from "@stagewise-plugins/react";

function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        {/* <StagewiseToolbar config={{ plugins: [ReactPlugin] }} /> */}
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Landing />} />
            {/* Subject Selection Page */}
            <Route path="/topics" element={<SubjectSelection />} />
            
            {/* Paper Selection Pages - 与导航栏Start Learning路径完全一致 */}
            <Route path="/mathematics-papers" element={<MathematicsPapers />} />
            <Route path="/further-mathematics-papers" element={<FurtherMathematicsPapers />} />
            <Route path="/physics-papers" element={<PhysicsPapers />} />
            
            {/* Legacy Subject-specific Topic Pages */}
            <Route path="/mathematics-topics" element={<MathematicsTopics />} />
            <Route path="/topics/mathematics" element={<MathematicsTopics />} />
            <Route path="/topics/further-mathematics" element={<FurtherMathematicsTopics />} />
            <Route path="/topics/physics" element={<PhysicsTopics />} />
            
            {/* Legacy routes for backward compatibility */}
            <Route path="/further-math-topics" element={<FurtherMathTopics />} />
            <Route path="/physics/as-level" element={<PhysicsASLevel />} />
            <Route path="/physics/a2-level" element={<PhysicsA2Level />} />
            
            <Route path="/ask-ai" element={<div className="container mx-auto p-4"><AskAI /></div>} />
            <Route path="/paper/:subject/:paper" element={<PaperPage />} />
            <Route path="/topic/:subject/:paper/:topicId" element={<TopicDetail />} />
            <Route path="*" element={<div className="container mx-auto p-4"><NotFound /></div>} />
          </Routes>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
