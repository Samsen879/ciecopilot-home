import React, { startTransition, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  BookMarked,
  CalendarRange,
  Clock3,
  Lock,
  Milestone,
  RefreshCw,
  Route,
  ShieldAlert,
  Target,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchRecommendations } from '../Recommendations/recommendations-client.js';
import { createRecommendationsViewModel } from '../Recommendations/recommendation-view-model.js';
import { loadLearningPath } from './learning-path-client.js';
import {
  createLearningPathViewModel,
  deriveLearningPathSurfaceState,
} from './learning-path-view-model.js';

const DEFAULT_PREFERENCES = {
  target_mastery: 0.8,
  daily_study_time: 60,
  study_duration: 30,
  difficulty_progression: 'adaptive',
};

function SummaryCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
        <Icon className="mr-2 h-4 w-4" />
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold text-slate-950">{value}</div>
      {hint && <p className="mt-2 text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

function StatusBadge({ status }) {
  const badgeClass = status === 'completed'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : status === 'in_progress'
      ? 'border-blue-200 bg-blue-50 text-blue-700'
      : 'border-slate-200 bg-slate-50 text-slate-600';

  const label = status === 'completed'
    ? '已完成'
    : status === 'in_progress'
      ? '进行中'
      : '待开始';

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${badgeClass}`}>
      {label}
    </span>
  );
}

function AuthState() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
        <Lock className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">登录后生成学习路径</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
        页面不会再退回到旧组件 mock，而是直接依赖学习路径生成接口和 recommendations 侧栏。
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-28 animate-pulse rounded-3xl bg-slate-200/70" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
        <div className="h-[36rem] animate-pulse rounded-3xl bg-slate-200/70" />
        <div className="h-[36rem] animate-pulse rounded-3xl bg-slate-200/70" />
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50/80 p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-700">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">学习路径生成失败</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        重试
      </button>
    </div>
  );
}

function EmptyState({ onRetry }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
        <Route className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">还没有可展示的学习路径</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
        当前存储记录不足以表达路径结构，可以直接重新生成一条新的路径快照。
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        重新生成
      </button>
    </div>
  );
}

function MiniRecommendationCard({ item }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">{item.title}</div>
          <div className="mt-1 text-xs leading-5 text-slate-500">{item.reasoningSummary}</div>
        </div>
        <div className="rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
          {item.confidencePercentage}%
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {item.reasonTags.slice(0, 3).map((tag) => (
          <span
            key={tag.id}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-700"
          >
            {tag.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function LearningPathDashboard({ subjectCode = '9709', className = '' }) {
  const { user } = useAuth();
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [pathResult, setPathResult] = useState(null);
  const [pathError, setPathError] = useState(null);
  const [recommendationPayload, setRecommendationPayload] = useState(null);
  const [recommendationError, setRecommendationError] = useState(null);

  useEffect(() => {
    if (!user?.id) {
      setPathResult(null);
      setPathError(null);
      setRecommendationPayload(null);
      setRecommendationError(null);
      setIsLoading(false);
      return undefined;
    }

    let cancelled = false;

    async function loadDashboard() {
      setIsLoading(true);
      setPathError(null);
      setRecommendationError(null);

      const [pathState, recommendationState] = await Promise.allSettled([
        loadLearningPath({
          userId: user.id,
          subjectCode,
          preferences: DEFAULT_PREFERENCES,
          forceRefresh: refreshNonce > 0,
        }),
        fetchRecommendations({
          subjectCode,
          type: 'learning_path',
          limit: 3,
          refresh: refreshNonce > 0,
        }),
      ]);

      if (cancelled) {
        return;
      }

      startTransition(() => {
        if (pathState.status === 'fulfilled') {
          setPathResult(pathState.value);
          setPathError(pathState.value.storageError || null);
        } else {
          setPathResult(null);
          setPathError(pathState.reason);
        }

        if (recommendationState.status === 'fulfilled') {
          setRecommendationPayload(recommendationState.value);
          setRecommendationError(null);
        } else {
          setRecommendationPayload(null);
          setRecommendationError(recommendationState.reason);
        }
      });

      setIsLoading(false);
    }

    loadDashboard().catch((unexpectedError) => {
      if (!cancelled) {
        setPathError(unexpectedError);
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [refreshNonce, subjectCode, user?.id]);

  const viewModel = useMemo(() => (
    createLearningPathViewModel({
      storedRecord: pathResult?.storedRecord || null,
      generatedPayload: pathResult?.storedRecord ? null : pathResult?.generatedPayload,
      subjectCode,
    })
  ), [pathResult, subjectCode]);
  const hasPathData = Boolean(pathResult?.storedRecord || pathResult?.generatedPayload);

  const recommendationViewModel = useMemo(() => (
    recommendationPayload
      ? createRecommendationsViewModel(recommendationPayload, {
        activeType: 'learning_path',
        subjectCode,
      })
      : null
  ), [recommendationPayload, subjectCode]);

  const surfaceState = deriveLearningPathSurfaceState({
    isAuthenticated: Boolean(user),
    isLoading,
    error: hasPathData ? null : pathError,
    viewModel: hasPathData ? viewModel : null,
  });

  const handleRefresh = () => setRefreshNonce((value) => value + 1);

  return (
    <section className={`space-y-6 ${className}`}>
      <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
              <BookMarked className="mr-2 h-4 w-4" />
              Learning Path
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
              {viewModel.subject.fullName}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              页面会优先读取持久化路径，缺失时再回源生成，并同步展示 learning-path recommendations 作为执行提示。
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            重新编排
          </button>
        </div>
      </div>

      {surfaceState === 'auth_required' && <AuthState />}
      {surfaceState === 'loading' && <LoadingState />}
      {surfaceState === 'error' && (
        <ErrorState
          message={pathError?.message || '路径接口没有返回可用数据。'}
          onRetry={handleRefresh}
        />
      )}
      {surfaceState === 'empty' && <EmptyState onRetry={handleRefresh} />}

      {surfaceState !== 'auth_required' && surfaceState !== 'loading' && surfaceState !== 'error' && surfaceState !== 'empty' && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              icon={Target}
              label="总体进度"
              value={`${viewModel.completionPercentage}%`}
              hint={`目标掌握度 ${viewModel.targetMasteryPercentage}%`}
            />
            <SummaryCard
              icon={Clock3}
              label="预计投入"
              value={viewModel.estimatedDurationLabel}
              hint={`日均 ${viewModel.dailyCommitmentLabel}`}
            />
            <SummaryCard
              icon={Milestone}
              label="里程碑"
              value={viewModel.stats.milestoneCount}
              hint={`${viewModel.stats.totalTopics} 个主题节点`}
            />
            <SummaryCard
              icon={CalendarRange}
              label="最近更新"
              value={viewModel.updatedLabel}
              hint={viewModel.source === 'stored' ? '持久化快照' : '本次生成'}
            />
          </div>

          {pathError && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
              路径已生成，但落库失败。当前仍展示刚生成的结果。{pathError.message}
            </div>
          )}

          {surfaceState === 'stale' && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
              当前学习路径快照已超过 7 天未更新，建议重新编排以避免 stale 计划继续驱动学习节奏。
            </div>
          )}

          <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
            <div className="space-y-5">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">路径主线</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      以主题掌握度和日程负载为中心，明确当前应先推进的节点。
                    </p>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {viewModel.stats.totalSessions} 个计划 session
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {viewModel.timeline.map((entry, index) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.04 }}
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <StatusBadge status={entry.status} />
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                              {entry.dayLabel}
                            </span>
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-slate-900">{entry.title}</h4>
                            <p className="mt-1 text-sm leading-6 text-slate-500">{entry.priorityReason}</p>
                          </div>
                        </div>

                        <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:min-w-[16rem]">
                          <div className="rounded-2xl bg-white px-4 py-3">
                            <div className="text-xs uppercase tracking-[0.16em] text-slate-400">投入</div>
                            <div className="mt-2 font-medium text-slate-900">{entry.durationLabel}</div>
                          </div>
                          <div className="rounded-2xl bg-white px-4 py-3">
                            <div className="text-xs uppercase tracking-[0.16em] text-slate-400">活动</div>
                            <div className="mt-2 font-medium text-slate-900">{entry.activityLabel}</div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem]">
                        <div>
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>当前掌握度</span>
                            <span>{entry.currentMasteryPercentage}% / {entry.targetMasteryPercentage}%</span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-slate-200">
                            <div
                              className="h-2 rounded-full bg-slate-900 transition-all"
                              style={{ width: `${entry.currentMasteryPercentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                          <div className="font-medium text-slate-900">{entry.difficultyLabel}</div>
                          <div className="mt-1">{entry.sessionCount} 个 session</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900">里程碑与下一步</h3>
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3">
                    {viewModel.milestones.map((milestone) => (
                      <div key={milestone.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{milestone.dayLabel}</div>
                        <div className="mt-2 text-sm font-semibold text-slate-900">{milestone.title}</div>
                        <div className="mt-1 text-sm leading-6 text-slate-500">{milestone.description}</div>
                        {milestone.celebrationMessage && (
                          <div className="mt-2 text-xs text-slate-500">{milestone.celebrationMessage}</div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Next Steps</div>
                    <div className="mt-3 space-y-3">
                      {viewModel.nextSteps.length > 0 ? viewModel.nextSteps.map((step, index) => (
                        <div key={`${step}-${index}`} className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">
                          {step}
                        </div>
                      )) : (
                        <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-500">
                          暂无额外 next steps，建议从第一条主线节点开始执行。
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center">
                  <ShieldAlert className="mr-2 h-5 w-5 text-slate-500" />
                  <h3 className="text-lg font-semibold text-slate-900">路径规则</h3>
                </div>
                <div className="mt-4 space-y-3">
                  {viewModel.adaptiveRules.length > 0 ? viewModel.adaptiveRules.slice(0, 6).map((rule) => (
                    <div key={rule.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="text-sm font-medium text-slate-900">{rule.label}</div>
                      <div className="mt-1 text-sm leading-6 text-slate-500">{rule.description}</div>
                    </div>
                  )) : (
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      当前记录里没有可解释的 adaptive rules。
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">配套路径推荐</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  与主路径并排展示，方便判断“继续执行”还是“切换方案”。
                </p>

                {recommendationError && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    learning-path recommendations 未成功返回，当前仅展示路径主视图。{recommendationError.message}
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  {recommendationViewModel?.items?.length ? recommendationViewModel.items.map((item) => (
                    <MiniRecommendationCard key={item.id} item={item} />
                  )) : (
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      暂无 learning-path recommendations，可继续按当前路径执行。
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
