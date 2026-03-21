import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Bot, MessageSquare, Sparkles, Target } from "lucide-react";
import { Link } from "react-router-dom";
import ChatPanel from "../components/ChatPanel";
import {
  LEARNING_RUNTIME_ENTRY_TOPICS,
  getAskAiEntryMode,
} from "./legacy-entry-mode.js";

const AskAI = () => {
  const entryMode = getAskAiEntryMode();
  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: "easeOut" }
  };

  if (entryMode === "learning_runtime") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 pt-20">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-900 p-3 text-white">
                <Bot size={28} />
              </div>
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
                  Learning Runtime
                </p>
                <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
                  AskAI now hands off into runtime workspaces
                </h1>
              </div>
            </div>

            <p className="mt-6 max-w-3xl text-base leading-7 text-slate-600">
              The legacy AskAI page no longer owns canonical learning state. Use a runtime workspace
              to review stable slots, linked references, and the topic-filtered review queue for the
              pilot trigonometry slice.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {LEARNING_RUNTIME_ENTRY_TOPICS.map((topic) => (
                <Link
                  key={topic.topicId}
                  to={`/learn/workspace/${topic.topicId}`}
                  className="group rounded-3xl border border-slate-200 bg-slate-50 p-6 transition hover:border-slate-900 hover:bg-white"
                >
                  <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
                    Runtime workspace
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-slate-950">{topic.title}</h2>
                  <p className="mt-2 text-sm text-slate-600">{topic.topicPath}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-slate-900">
                    Open workspace
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>

            <p className="mt-8 text-sm text-slate-500">
              Legacy AskAI remains a compatibility entry only; stable runtime truth now lives on the
              new session and workspace routes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 pt-20">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header Section */}
        <motion.div
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 bg-blue-500 text-white rounded-2xl">
              <Bot size={32} />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
              AI 问答助手
            </h1>
          </div>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            专门为CIE A Level学生定制的AI学习助手，提供精准的数学、物理和进阶数学答疑
          </p>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <MessageSquare className="w-8 h-8 text-blue-500 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">即时问答</h3>
              <p className="text-gray-600 text-sm">随时提问，即时获得详细解答</p>
            </div>
            
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <Target className="w-8 h-8 text-green-500 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">精准答案</h3>
              <p className="text-gray-600 text-sm">基于CIE考试大纲的标准答案</p>
            </div>
            
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <Sparkles className="w-8 h-8 text-purple-500 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">双语支持</h3>
              <p className="text-gray-600 text-sm">中英文提问，双语详细解答</p>
            </div>
          </div>
        </motion.div>

        {/* Chat Interface */}
        <motion.div
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">开始提问</h2>
              <p className="text-gray-600">
                在下方输入您的A Level问题，AI助手将为您提供详细解答
              </p>
            </div>
            
            {/* 使用新的 ChatPanel 形成最小闭环 */}
            <div className="h-96">
              <ChatPanel
                chatId="ask-ai-legacy"
                compatibilityNotice="This legacy AskAI surface is route-scoped chat only; canonical runtime state lives on the new learning-runtime routes."
              />
            </div>
          </div>
        </motion.div>

        {/* Example Questions */}
        <motion.div
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.4 }}
          className="mt-12 text-center"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">示例问题</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              "How to solve a quadratic equation by completing the square?",
              "什么是电动势和电势差的区别？",
              "How do I find the derivative of ln(x)?",
              "解释一下牛顿第二定律的应用",
              "What is the binomial theorem?"
            ].map((question, index) => (
              <span
                key={index}
                className="inline-block bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm border border-blue-200"
              >
                {question}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AskAI;
