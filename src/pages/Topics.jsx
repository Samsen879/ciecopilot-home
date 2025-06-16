import React from "react";
import topics from "../data/topics.json";
import TopicCard from "../components/TopicCard";

const Topics = () => (
  <div>
    <h1 className="text-2xl font-bold mb-6">知识卡片</h1>
    <div>
      {topics.map((topic, idx) => (
        <TopicCard key={idx} topic={topic} />
      ))}
    </div>
  </div>
);

export default Topics;
