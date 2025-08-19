import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../utils/supabase';

const SubjectPage = () => {
    const { subjectCode } = useParams();
    const [subject, setSubject] = useState(null);
    const [papers, setPapers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Fetch subject details
                const { data: subjectData, error: subjectError } = await db
                    .from('subjects')
                    .select('id, name, code')
                    .eq('code', subjectCode)
                    .single();

                if (subjectError) {
                    throw new Error(`Subject with code ${subjectCode} not found.`);
                }
                setSubject(subjectData);

                // Fetch papers for the subject using the subject's ID
                const { data: papersData, error: papersError } = await db
                    .from('papers')
                    .select('id, name') 
                    .eq('subject_id', subjectData.id)
                    .order('name', { ascending: true });

                if (papersError) throw papersError;
                setPapers(papersData);

            } catch (err) {
                setError(err.message);
                console.error("Error fetching subject data:", err);
            } finally {
                setLoading(false);
            }
        };

        if (subjectCode) {
            fetchData();
        }
    }, [subjectCode]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                 <div className="p-8 bg-red-100 dark:bg-red-900/30 rounded-lg">
                   <p className="text-red-600 dark:text-red-400 font-semibold">Error: {error}</p>
                   <Link to="/study-hub" className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline">
                    &larr; Back to Subjects
                    </Link>
               </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <header className="mb-12">
                <Link to="/study-hub" className="text-blue-600 dark:text-blue-400 hover:underline mb-4 block">
                    &larr; Back to Subjects
                </Link>
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
                    {subject?.name}
                </h1>
                <p className="mt-4 text-xl text-gray-500 dark:text-gray-400">
                    Select a paper to view its topics and learning materials.
                </p>
            </header>

            <main>
                {papers.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        {papers.map((paper) => (
                            <Link 
                                key={paper.id} 
                                to={`/paper/${subject.code}/${paper.name}`} 
                                className="block p-6 text-center bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl hover:scale-105 transform transition-all duration-300"
                            >
                                <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400 capitalize">
                                    {paper.name.replace('paper', 'Paper ')}
                                </h2>
                            </Link>
                        ))}
                    </div>
                ) : (
                     <div className="text-center p-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                        <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300">No Papers Found</h2>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">
                            There are currently no papers available for {subject?.name}. Please check back later.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default SubjectPage;


