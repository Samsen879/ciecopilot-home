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
function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/topics" element={<div className="container mx-auto p-4"><Topics /></div>} />
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
