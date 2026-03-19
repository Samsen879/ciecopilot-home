import React from 'react';
import PersonalizedRecommendations from '../components/Recommendations/PersonalizedRecommendations';

export default function ToolsSmartRecommendations() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
            Recommendations
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            稳定推荐编排与解释面板
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            页面只消费 recommendations 后端稳定契约，明确区分 loading、empty、error、cached 和 stale 状态。
          </p>
        </div>

        <PersonalizedRecommendations subjectCode="9709" />
      </div>
    </div>
  );
}
