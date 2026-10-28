import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Home, TestTube, FileText, Activity, User, Settings, LogOut, Sun, Moon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import AITutor from './AITutor';

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: <Home size={20} /> },
    { path: '/course', label: 'Course Content', icon: <BookOpen size={20} /> },
    { path: '/exam-prep', label: 'Exam Preparation', icon: <FileText size={20} /> },
    { path: '/virtual-lab', label: 'Virtual Lab', icon: <TestTube size={20} /> },
    { path: '/progress', label: 'My Progress', icon: <Activity size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      <aside className="w-64 bg-slate-900 dark:bg-black text-slate-300 flex-col hidden md:flex border-r border-slate-800">
        <div className="p-6 font-bold text-xl text-white tracking-wide border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2"><BookOpen className="text-indigo-500" /> COA Lab</div>
          <button onClick={toggleTheme} className="text-slate-400 hover:text-white">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                location.pathname === item.path ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800 space-y-2">
           <button className="flex items-center gap-3 px-4 py-2 w-full hover:bg-slate-800 rounded-lg transition-colors">
             <User size={20} /> Profile
           </button>
           <button className="flex items-center gap-3 px-4 py-2 w-full hover:bg-slate-800 rounded-lg transition-colors">
             <Settings size={20} /> Settings
           </button>
           <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-3 px-4 py-2 w-full hover:bg-red-900/50 text-red-400 hover:text-red-300 rounded-lg transition-colors">
             <LogOut size={20} /> Sign Out
           </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto relative text-slate-900 dark:text-slate-100">
        {children}
        <AITutor />
      </main>
    </div>
  );
}