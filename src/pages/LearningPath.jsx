import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import LearningPathDashboard from '../components/learning-path/LearningPathDashboard';
import { subjectMetaByCode } from '../components/learning-path/learning-path-view-model';

export default function LearningPath() {
  const { subjectCode = '9709' } = useParams();
  const navigate = useNavigate();
  const subject = subjectMetaByCode[subjectCode] || {
    name: 'Unknown Subject',
    fullName: 'Unknown Subject',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-full border border-slate-300 bg-white p-3 text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Learning Path</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                {subject.name}
              </h1>
              <p className="mt-2 text-base leading-7 text-slate-600">
                {subject.fullName} 的路径视图已改为稳定快照模式，明确表达 fresh、stale、error 和 empty 状态。
              </p>
            </div>
          </div>
        </div>

        <LearningPathDashboard subjectCode={subjectCode} />
      </div>
    </div>
  );
}
