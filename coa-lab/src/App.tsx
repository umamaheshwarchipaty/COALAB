import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';

import { Dashboard } from './pages/Dashboard';
import Auth from './pages/Auth';

import { CourseContent } from './pages/CoursePages';
// 1. MATCH THE EXPORTED NAMES EXACTLY
import { VirtualLabPage } from './pages/VirtualLabPage'; 
import { ExamPrepPage } from './pages/ExamPrepPage';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">Loading COA Lab...</div>;

  if (!session) return <Auth />;

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          
          <Route path="/course" element={<CourseContent />} />
          {/* 2. UPDATE THE ROUTES TO USE THE CORRECT COMPONENT NAMES */}
          <Route path="/virtual-lab" element={<VirtualLabPage />} />
          <Route path="/exam-prep" element={<ExamPrepPage />} />
          
          <Route path="/progress" element={<div className="p-8"><h1 className="text-3xl font-bold dark:text-white">My Progress</h1></div>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;