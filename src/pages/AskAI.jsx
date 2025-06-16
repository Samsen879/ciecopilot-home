import React from "react";
import QuestionBox from "../components/QuestionBox";

const AskAI = () => (
  <div>
    <h1 className="text-2xl font-bold mb-6">AI 问答</h1>
    <QuestionBox />
    <div className="text-gray-500 mt-4 text-sm">
      * 问题示例：<br />
      - How to solve a quadratic equation by completing the square?<br />
      - 什么是电动势和电势差的区别？
    </div>
  </div>
);

export default AskAI;
