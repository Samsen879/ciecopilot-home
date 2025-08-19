import React from 'react';
import { Navigate } from 'react-router-dom';
import Landing from './Landing';
import { useAuth } from '../contexts/AuthContext';

const HomeOrRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/study-hub" replace />;
  }

  return <Landing />;
};

export default HomeOrRedirect;





