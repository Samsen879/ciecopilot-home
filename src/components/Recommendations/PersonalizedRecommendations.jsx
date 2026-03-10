import React, { startTransition, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Brain,
  Clock3,
  Lock,
  RefreshCw,
  Sparkles,
  Target,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchRecommendations } from './recommendations-client.js';
import {
  createRecommendationsViewModel,
  deriveRecommendationsSurfaceState,
  recommendationTypeMeta,
} from './recommendation-view-model.js';

const TYPE_TABS = [
  { id: 'content', label: '内容' },
  { id: 'topic', label: '主题' },
  { id: 'learning_path', label: '路径' },
];

function SummaryPill({ label, value, tone = 'slate' }) {
  const toneClass = tone === 'amber'
    ? 'border-amber-200 bg-amber-50 text-amber-800'
    : tone === 'red'
      ? 'border-red-200 bg-red-50 text-red-800'
      : 'border-slate-200 bg-slate-50 text-slate-700';

  return (
    <div className={`rounded-full border px-3 py-1 text-xs font-medium ${toneClass}`}>
      <span className="mr-1 opacity-70">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function ScoreMeter({ label, value }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-slate-900 transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 px-6 py-14 text-center">
      <LightbulbIcon />
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function LightbulbIcon() {
  return (
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
      <Sparkles className="h-6 w-6" />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-20 animate-pulse rounded-2xl bg-slate-200/70" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-72 animate-pulse rounded-3xl bg-slate-200/70" />
        ))}
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
      <h3 className="mt-4 text-lg font-semibold text-slate-900">推荐加载失败</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        重新获取
      </button>
    </div>
  );
}

function AuthState() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
        <Lock className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">登录后查看个性化推荐</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
        recommendations API 需要可信用户上下文，未登录时不会回退到本地 mock。
      </p>
    </div>
  );
}

function RecommendationCard({ item, onClick }) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      onClick={() => onClick?.(item)}
      className="w-full rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {item.targetType}
          </div>
          <h3 className="text-xl font-semibold text-slate-900">{item.title}</h3>
          <p className="text-sm leading-6 text-slate-600">{item.description}</p>
        </div>
        <div className="rounded-2xl bg-slate-900 px-3 py-2 text-center text-white">
          <div className="text-lg font-semibold">{item.confidencePercentage}%</div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-300">fit</div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <ScoreMeter label="置信度" value={item.confidencePercentage} />
        <ScoreMeter label="相关度" value={item.relevancePercentage} />
        <ScoreMeter label="优先级" value={item.priorityPercentage} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="flex items-center text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            <Clock3 className="mr-2 h-4 w-4" />
            学习成本
          </div>
          <div className="mt-2 text-sm font-medium text-slate-900">{item.estimatedDurationLabel}</div>
          <div className="mt-1 text-xs text-slate-500">{item.difficultyLabel}</div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="flex items-center text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            <Target className="mr-2 h-4 w-4" />
            解释
          </div>
          <div className="mt-2 text-sm font-medium text-slate-900">{item.reasoningSummary}</div>
          <div className="mt-1 text-xs text-slate-500">{item.freshnessLabel}</div>
        </div>
      </div>

      {item.reasonTags.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {item.reasonTags.map((tag) => (
            <span
              key={tag.id}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}
    </motion.button>
  );
}

export default function PersonalizedRecommendations({
  subjectCode = '9709',
  onRecommendationClick,
  className = '',
}) {
  const { user } = useAuth();
  const [activeType, setActiveType] = useState('content');
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    if (!user?.id) {
      setPayload(null);
      setError(null);
      setIsLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    let cancelled = false;

    async function loadRecommendations() {
      setIsLoading(true);
      setError(null);

      try {
        const nextPayload = await fetchRecommendations({
          subjectCode,
          type: activeType,
          limit: 6,
          refresh: refreshNonce > 0,
          signal: controller.signal,
        });

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setPayload(nextPayload);
          setError(null);
        });
      } catch (nextError) {
        if (cancelled || nextError?.name === 'AbortError') {
          return;
        }
        setError(nextError);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadRecommendations();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [activeType, refreshNonce, subjectCode, user?.id]);

  const viewModel = useMemo(() => (
    payload
      ? createRecommendationsViewModel(payload, { activeType, subjectCode })
      : null
  ), [activeType, payload, subjectCode]);

  const surfaceState = deriveRecommendationsSurfaceState({
    isAuthenticated: Boolean(user),
    isLoading,
    error: payload ? null : error,
    viewModel,
  });

  const meta = recommendationTypeMeta[activeType] || recommendationTypeMeta.content;

  return (
    <section className={`space-y-6 ${className}`}>
      <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
              <Brain className="mr-2 h-4 w-4" />
              Recommendations Runtime
            </div>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Smart Recommendations</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                聚焦 {meta.label}。页面只展示后端稳定契约里已经确认的解释字段，不再混用本地 mock 与旧服务层。
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SummaryPill
              label="状态"
              value={viewModel?.summary.stale ? 'stale' : viewModel?.summary.cached ? 'cached' : 'live'}
              tone={viewModel?.summary.stale ? 'amber' : 'slate'}
            />
            {viewModel?.summary.sourceCount > 0 && (
              <SummaryPill label="候选源" value={viewModel.summary.sourceCount} />
            )}
            <button
              type="button"
              onClick={() => setRefreshNonce((value) => value + 1)}
              disabled={isLoading}
              className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveType(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activeType === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {surfaceState === 'auth_required' && <AuthState />}
      {surfaceState === 'loading' && <LoadingState />}
      {surfaceState === 'error' && (
        <ErrorState
          message={error?.message || '请求未成功返回可消费的 recommendations contract。'}
          onRetry={() => setRefreshNonce((value) => value + 1)}
        />
      )}

      {viewModel && surfaceState !== 'loading' && surfaceState !== 'error' && surfaceState !== 'auth_required' && (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryPill label="返回" value={`${viewModel.summary.returned}/${viewModel.summary.total}`} />
            <SummaryPill label="生成" value={viewModel.summary.generatedLabel} />
            <SummaryPill
              label="到期"
              value={viewModel.summary.expiresLabel}
              tone={viewModel.summary.stale ? 'amber' : 'slate'}
            />
          </div>

          {error && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
              刷新失败，当前继续展示最近一次成功返回的数据。{error.message}
            </div>
          )}

          {surfaceState === 'stale' && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
              当前结果已进入 stale 状态，来源于缓存兜底。可以继续阅读推荐解释，但执行前建议刷新一次。
            </div>
          )}

          {viewModel.items.length === 0 ? (
            <EmptyState
              title={viewModel.emptyState.title}
              description={viewModel.emptyState.description}
            />
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              {viewModel.items.map((item) => (
                <RecommendationCard
                  key={item.id}
                  item={item}
                  onClick={onRecommendationClick}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
