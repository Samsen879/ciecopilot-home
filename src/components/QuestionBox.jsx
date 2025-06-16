import React, { useState } from "react";

const QuestionBox = () => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const handleAsk = () => {
    setAnswer("（示例）AI会在这里回答你的问题。");
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6 max-w-xl mx-auto">
      <textarea
        className="w-full border rounded p-2 mb-4"
        rows={3}
        placeholder="请输入你的A Level数理问题……"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        onClick={handleAsk}
      >
        提问
      </button>
      <div className="mt-4 text-gray-700 min-h-[48px]">
        {answer && <div><b>AI回答：</b>{answer}</div>}
      </div>
    </div>
  );
};

export default QuestionBox;
