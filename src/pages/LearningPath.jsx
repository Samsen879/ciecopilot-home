import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { subjectMetaByCode } from '../components/learning-path/learning-path-view-model';
import { LEARNING_RUNTIME_ENTRY_TOPICS } from './legacy-entry-mode.js';

export default function LearningPath() {
  const { subjectCode = '9709' } = useParams();
  const navigate = useNavigate();
  const subject = subjectMetaByCode[subjectCode] || {
    name: 'Unknown Subject',
    fullName: 'Unknown Subject',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-full border border-slate-300 bg-white p-3 text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
                Compatibility Surface
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                Learning Path is now a compatibility handoff into runtime workspaces
              </h1>
              <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">
                Topic-level path views no longer depend on the retired legacy AI generation flow.
                Stable slots, linked references, and review queue projections now live under the
                learning-runtime workspace routes.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {LEARNING_RUNTIME_ENTRY_TOPICS.map((topic) => (
              <Link
                key={topic.topicId}
                to={`/learn/workspace/${topic.topicId}`}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-6 transition hover:border-slate-900 hover:bg-white"
              >
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
                  Runtime workspace
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-950">{topic.title}</h2>
                <p className="mt-2 text-sm text-slate-600">{topic.topicPath}</p>
              </Link>
            ))}
          </div>

          <p className="mt-8 text-sm text-slate-500">
            {subject.fullName} remains available only as a compatibility handoff into the
            learning-runtime workspace.
          </p>
        </div>
      </div>
    </div>
  );
}
