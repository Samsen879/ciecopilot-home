import React from "react";

const TopicCard = ({ topic }) => (
  <div className="bg-white rounded-2xl shadow p-4 mb-4">
    <h2 className="text-xl font-bold mb-2">{topic.title}</h2>
    <p className="text-gray-700">{topic.description}</p>
  </div>
);

export default TopicCard;
