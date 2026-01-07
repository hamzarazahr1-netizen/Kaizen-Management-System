
import React, { useState } from 'react';
import { User, DEPARTMENTS } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalizedInput = id.trim();
    const normalizedId = normalizedInput.toLowerCase();

    // Admin Login (Kept for actual admin use but hidden from UI hints)
    if (normalizedId === 'admin' && password === 'Lean2025') {
      onLogin({ id: 'admin', name: 'Lean Admin', role: 'ADMIN', department: 'Lean Department' });
      return;
    }

    // Department Login
    const deptMatch = DEPARTMENTS.find(d => d.toLowerCase() === normalizedId);

    if (deptMatch && password === '123') {
      onLogin({ 
        id: deptMatch.toLowerCase().replace(/\s/g, '_'), 
        name: deptMatch, 
        role: 'DEPARTMENT', 
        department: deptMatch 
      });
      return;
    }

    setError('Authentication failed. Check ID and Password.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 text-slate-900">
      <div className="w-full max-w-md bg-white rounded-lg shadow-2xl overflow-hidden border border-slate-800">
        <div className="bg-slate-800 p-8 text-white text-center">
          <h2 className="text-xl font-bold uppercase tracking-tighter">Master Furnishings Pvt. Ltd.</h2>
          <div className="h-1 w-12 bg-blue-500 mx-auto mt-4 mb-2"></div>
          <p className="text-slate-400 text-xs uppercase tracking-widest font-medium">Kaizen Management Portal</p>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded border border-red-200 text-xs font-bold uppercase text-center">
              {error}
            </div>
          )}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Department ID</label>
            <input 
              type="text" 
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded text-sm text-slate-900 focus:border-blue-500 focus:ring-0 outline-none transition-all placeholder:text-slate-300"
              placeholder="Enter Department Name"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">Access Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded text-sm text-slate-900 focus:border-blue-500 focus:ring-0 outline-none transition-all placeholder:text-slate-300"
              placeholder="••••••••"
              required
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-slate-900 hover:bg-black text-white text-xs font-bold uppercase py-4 rounded transition-all shadow-xl active:scale-[0.98]"
          >
            Authenticate User
          </button>
          <div className="pt-4 text-center border-t border-slate-100 mt-4">
            <p className="text-[10px] text-slate-400 leading-relaxed uppercase">
              Authorized Personnel Only. Logins are Monitored.
              <br/>
              <span className="font-bold text-slate-500">Hint: Use your Department Name as ID (e.g. Chair) & Pass: 123</span>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
