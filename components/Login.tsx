import React, { useState } from 'react';
import { Building2, Lock, UserCheck, ChevronRight } from 'lucide-react';
import {
  User,
  Factory,
  FACTORIES,
  FACTORY_DEPARTMENTS,
  MOLTY_FOAM_DEPARTMENTS
} from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const MOLTY_ALIASES: Record<string, string> = {
  'foam': 'Foam Section',
  'foam section': 'Foam Section',
  'spring': 'Spring Section',
  'spring section': 'Spring Section',
  'rebound': 'Rebound Section',
  'rebound section': 'Rebound Section',
  'uncver': 'Uncver Section',
  'uncver section': 'Uncver Section',
  'uncover': 'Uncver Section',
  'uncover section': 'Uncver Section',
  'accessories': 'Accessories Section',
  'accessories section': 'Accessories Section'
};

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [selectedFactory, setSelectedFactory] = useState<Factory>(Factory.FURNITURE);
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const availableUnits = FACTORY_DEPARTMENTS[selectedFactory];

  const handleFactoryChange = (factory: Factory) => {
    setSelectedFactory(factory);
    setId('');
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalizedInput = id.trim();
    const normalizedId = normalizedInput.toLowerCase();

    // Admin Login -> Unified Lean & Transformation Portal covering both factories
    if (normalizedId === 'admin' && password === 'Lean2025') {
      onLogin({
        id: 'admin',
        name: 'Lean & Transformation Admin',
        role: 'ADMIN',
        department: 'Lean & Transformation',
        factory: 'ALL'
      });
      return;
    }

    // Department / Section Login scoped to selected Factory
    let deptMatch: string | undefined;
    if (selectedFactory === Factory.MOLTY_FOAM) {
      deptMatch =
        MOLTY_FOAM_DEPARTMENTS.find(d => d.toLowerCase() === normalizedId) ||
        MOLTY_ALIASES[normalizedId];
    } else {
      deptMatch = availableUnits.find(d => d.toLowerCase() === normalizedId);
    }

    if (deptMatch && password === '123') {
      const factoryPrefix = selectedFactory === Factory.MOLTY_FOAM ? 'molty' : 'furniture';
      onLogin({
        id: `${factoryPrefix}_${deptMatch.toLowerCase().replace(/\s+/g, '_')}`,
        name: deptMatch,
        role: 'DEPARTMENT',
        department: deptMatch,
        factory: selectedFactory
      });
      return;
    }

    setError(
      `Authentication failed for ${selectedFactory}. Verify your ${
        selectedFactory === Factory.MOLTY_FOAM ? 'Section' : 'Department'
      } ID and Password.`
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 md:p-8 text-slate-900">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-800 grid grid-cols-1 lg:grid-cols-12">
        {/* Left Brand & Factory Context Panel */}
        <div className="lg:col-span-5 bg-[#f4f5f6] border-b lg:border-b-0 lg:border-r border-slate-200 p-8 flex flex-col justify-between">
          <div>
            <div className="mb-7 flex items-center gap-4">
              <img
                src="/assets/aistudio/Master_Furnishings_68c64c06.jpeg"
                alt="Master Furnishings"
                className="h-14 w-auto object-contain mix-blend-multiply"
                referrerPolicy="no-referrer"
              />
              <div className="h-12 w-px bg-slate-300 shrink-0" aria-hidden="true" />
              <img
                src="/assets/aistudio/Master_Logo_17bc2ec9.png"
                alt="Master Molty Foam Since 1963"
                className="h-14 w-auto object-contain rounded shadow-xs shrink-0"
                referrerPolicy="no-referrer"
              />
            </div>

            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-snug">
              Master Kaizen Management System
            </h1>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Centralized continuous improvement tracking, section performance analytics, and reward disbursement across Master Lifestyle and Master Molty Foam Karachi Factories.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 space-y-3">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {selectedFactory === Factory.MOLTY_FOAM ? 'Port Qasim Sections' : 'Furniture Factory Units'}
            </p>
            <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-600 leading-relaxed">
              {availableUnits.map((unit, idx) => (
                <React.Fragment key={unit}>
                  <button
                    type="button"
                    onClick={() => setId(unit)}
                    className="hover:text-blue-700 hover:underline font-medium text-left transition-colors"
                  >
                    {unit}
                  </button>
                  {idx < availableUnits.length - 1 && (
                    <span aria-hidden="true" className="text-slate-300">·</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sign-In Form */}
        <div className="lg:col-span-7 p-8 md:p-10 bg-white">
          <div className="mb-6">
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Facility Sign In</h2>
            <p className="text-xs text-slate-500 mt-1">
              Select your factory unit below, or sign in with Management Admin credentials.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-700 p-3.5 rounded-lg border border-red-200 text-xs font-semibold">
                {error}
              </div>
            )}

            {/* Factory Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Select Factory
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {FACTORIES.map((factory) => {
                  const isActive = selectedFactory === factory;
                  const unitCount = FACTORY_DEPARTMENTS[factory].length;
                  return (
                    <button
                      key={factory}
                      type="button"
                      onClick={() => handleFactoryChange(factory)}
                      className={`p-3.5 rounded-lg border text-left transition-all flex flex-col gap-1 ${
                        isActive
                          ? 'border-blue-700 bg-blue-50/70 ring-1 ring-blue-700'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Building2 className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-700' : 'text-slate-400'}`} />
                        <span className={`text-[11px] font-semibold tabular-nums ${isActive ? 'text-blue-700' : 'text-slate-400'}`}>
                          {unitCount} {factory === Factory.MOLTY_FOAM ? 'Sections' : 'Depts'}
                        </span>
                      </div>
                      <span className={`text-xs font-bold leading-snug ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                        {factory}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Unit Selector + Department ID Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Quick Select {selectedFactory === Factory.MOLTY_FOAM ? 'Section' : 'Department'}
                </label>
                <select
                  value={availableUnits.includes(id) ? id : ''}
                  onChange={(e) => {
                    if (e.target.value) setId(e.target.value);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-blue-700 focus:bg-white outline-none transition-all"
                >
                  <option value="">Choose unit...</option>
                  {availableUnits.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {selectedFactory === Factory.MOLTY_FOAM ? 'Section / Admin ID' : 'Department / Admin ID'}
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    list="factory-unit-list"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-blue-700 focus:bg-white outline-none transition-all placeholder:text-slate-400"
                    placeholder={selectedFactory === Factory.MOLTY_FOAM ? 'e.g. Foam Section' : 'e.g. Chair'}
                    required
                  />
                  <datalist id="factory-unit-list">
                    {availableUnits.map((unit) => (
                      <option key={unit} value={unit} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Access Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-blue-700 focus:bg-white outline-none transition-all placeholder:text-slate-400"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-blue-800 text-white text-xs font-bold uppercase tracking-wider py-3.5 px-4 rounded-lg transition-all shadow-sm active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <span>Sign In to Portal</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="pt-4 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-500">
                Authorized Personnel Only · Use your {selectedFactory === Factory.MOLTY_FOAM ? 'Section' : 'Department'} Name as ID (Pass: <span className="font-mono font-semibold text-slate-700">123</span>)
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
