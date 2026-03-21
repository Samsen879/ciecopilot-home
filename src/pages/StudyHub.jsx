import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../utils/supabase';
import PersonalizedRecommendations from '../components/AI/PersonalizedRecommendations';
import { useAuth } from '../contexts/AuthContext';
import {
    LEARNING_RUNTIME_ENTRY_TOPICS,
    getStudyHubSurfaceMode,
} from './legacy-entry-mode.js';

const StudyHub = () => {
    const surfaceMode = getStudyHubSurfaceMode();
    const { user } = useAuth();
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (surfaceMode === 'compatibility_shell') {
            return undefined;
        }

        const fetchSubjects = async () => {
            try {
                setLoading(true);
                const { data, error } = await db.from('subjects').select('id, name, code');
                if (error) {
                    throw error;
                }
                setSubjects(data);
            } catch (err) {
                setError(err.message);
                console.error("Error fetching subjects:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchSubjects();
        return undefined;
    }, [surfaceMode]);

    if (surfaceMode === 'compatibility_shell') {
        return (
            <div className="container mx-auto px-4 py-12">
                <header className="mx-auto max-w-4xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
                        Compatibility Surface
                    </p>
                    <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
                        Study Hub now hands off into the learning runtime
                    </h1>
                    <p className="mt-4 text-base leading-7 text-slate-600">
                        Legacy Study Hub is no longer the canonical home for runtime state. Use the
                        pilot workspace links below to enter the new workspace shell.
                    </p>
                </header>

                <main className="mx-auto mt-8 max-w-5xl">
                    <div className="grid gap-4 md:grid-cols-2">
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

                    <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                        AskAI and Learning Path are retained as compatibility entry points only while
                        the runtime rollout stays behind the feature flag.
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <header className="text-center mb-12">
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
                    Study Hub
                </h1>
                <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500 dark:text-gray-400">
                    Your central place for all subjects, papers, and topics.
                </p>
            </header>

            <main>
                {/* Personalized Recommendations Section */}
                {user && (
                    <div className="mb-12">
                        <PersonalizedRecommendations 
                            className="mb-8"
                            onRecommendationClick={(item) => {
                                // Handle recommendation click - could navigate to specific content
                                console.log('Recommendation clicked:', item);
                            }}
                        />
                    </div>
                )}

                {/* Subjects Section */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">所有科目</h2>
                    
                    {loading && (
                        <div className="p-8 text-center">
                            <p className="text-gray-500 dark:text-gray-400">Loading subjects...</p>
                        </div>
                    )}
                    {error && (
                         <div className="p-8 text-center bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <p className="text-red-600 dark:text-red-400 font-semibold">Error: {error}</p>
                        </div>
                    )}
                    {!loading && !error && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {subjects.map((subject) => (
                                <Link 
                                    key={subject.id} 
                                    to={`/study-hub/${subject.code}`} 
                                    className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
                                >
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{subject.name}</h2>
                                    <p className="mt-2 text-gray-600 dark:text-gray-400">Subject Code: {subject.code}</p>
                                    <div className="mt-3 flex items-center text-blue-600 dark:text-blue-400">
                                        <span className="text-sm">查看学习路径 →</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <footer className="mt-16 text-center text-gray-500 dark:text-gray-400">
                <p>&copy; {new Date().getFullYear()} CIE Copilot. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default StudyHub;
