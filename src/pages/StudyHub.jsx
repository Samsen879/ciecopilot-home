import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../utils/supabase';
import PersonalizedRecommendations from '../components/AI/PersonalizedRecommendations';
import { useAuth } from '../contexts/AuthContext';

const StudyHub = () => {
    const { user } = useAuth();
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
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
    }, []);

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

