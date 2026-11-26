import React, { useState } from 'react';
import { Building2, Lock, MapPin, UserCheck, ChevronRight, ShieldCheck } from 'lucide-react';
import {
  User,
  Location,
  LOCATIONS,
  Factory,
  LOCATION_FACTORIES,
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
  const [loginMode, setLoginMode] = useState<'SECTION' | 'ADMIN'>('SECTION');
  const [selectedLocation, setSelectedLocation] = useState<Location>(Location.KARACHI);
  const [selectedFactory, setSelectedFactory] = useState<Factory>(Factory.MASTER_LIFESTYLE);
  const [sectionInput, setSectionInput] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const availableFactories = LOCATION_FACTORIES[selectedLocation];
  const availableUnits = FACTORY_DEPARTMENTS[selectedFactory];

  const handleLocationChange = (loc: Location) => {
    setSelectedLocation(loc);
    const factoriesForLoc = LOCATION_FACTORIES[loc];
    const nextFactory = factoriesForLoc.includes(selectedFactory)
      ? selectedFactory
      : factoriesForLoc[0];
    setSelectedFactory(nextFactory);
    setSectionInput('');
    setError('');
  };

  const handleFactoryChange = (factory: Factory) => {
    setSelectedFactory(factory);
    setSectionInput('');
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalizedInput = sectionInput.trim();
    const normalizedId = normalizedInput.toLowerCase();

    // Kaizen Committee / Management Admin Login
    if (
      (loginMode === 'ADMIN' && (normalizedId === '' || normalizedId === 'admin') && password === 'Lean2025') ||
      (normalizedId === 'admin' && password === 'Lean2025')
    ) {
      onLogin({
        id: 'admin',
        name: 'Kaizen Committee Admin',
        role: 'ADMIN',
        department: 'Kaizen Committee · Management',
        location: 'ALL',
        factory: 'ALL'
      });
      return;
    }

    if (loginMode === 'ADMIN') {
      setError('Invalid Management credentials. Verify Admin ID and Password.');
      return;
    }

    // Section Login scoped to selected Location > Factory > Section
    let deptMatch: string | undefined;
    if (selectedFactory === Factory.MASTER_MOLTY_FOAM) {
      deptMatch =
        MOLTY_FOAM_DEPARTMENTS.find((d) => d.toLowerCase() === normalizedId) ||
        MOLTY_ALIASES[normalizedId];
    } else {
      deptMatch = availableUnits.find((d) => d.toLowerCase() === normalizedId);
    }

    if (deptMatch && password === '123') {
      const locSlug = selectedLocation.toLowerCase();
      const facSlug = selectedFactory === Factory.MASTER_MOLTY_FOAM ? 'molty' : 'lifestyle';
      onLogin({
        id: `${locSlug}_${facSlug}_${deptMatch.toLowerCase().replace(/\s+/g, '_')}`,
        name: deptMatch,
        role: 'DEPARTMENT',
        department: deptMatch,
        location: selectedLocation,
        factory: selectedFactory
      });
      return;
    }

    setError(
      `Authentication failed for ${selectedLocation} · ${selectedFactory}. Verify your Section and Password.`
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 md:p-8 text-slate-900">
      <div className="w-full max-w-5xl bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-800 grid grid-cols-1 lg:grid-cols-12">
        {/* Left Brand & Pakistan Operations Context */}
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
              Group-wide continuous improvement platform across Pakistan — connecting Karachi, Lahore, and Mirpur facilities under Master Lifestyle Pvt. Ltd. and Master Molty Foam.
            </p>

            <div className="mt-6 pt-5 border-t border-slate-200 space-y-2 text-xs text-slate-700">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Pakistan Group Footprint
              </p>
              <div className="space-y-1.5">
                <p><span className="font-bold text-slate-900">Karachi:</span> Master Lifestyle Pvt. Ltd. · Master Molty Foam</p>
                <p><span className="font-bold text-slate-900">Lahore:</span> Master Lifestyle Pvt. Ltd. · Master Molty Foam</p>
                <p><span className="font-bold text-slate-900">Mirpur:</span> Master Molty Foam</p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 space-y-2.5">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {selectedLocation} · {selectedFactory} Sections
            </p>
            <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-600 leading-relaxed">
              {availableUnits.map((unit, idx) => (
                <React.Fragment key={unit}>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMode('SECTION');
                      setSectionInput(unit);
                    }}
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Facility Sign In</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose your location, factory, and section to open your dashboard.
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0 self-start">
              <button
                type="button"
                onClick={() => {
                  setLoginMode('SECTION');
                  setError('');
                  if (sectionInput.toLowerCase() === 'admin') setSectionInput('');
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap ${
                  loginMode === 'SECTION'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Section Portal
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMode('ADMIN');
                  setSectionInput('admin');
                  setError('');
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap ${
                  loginMode === 'ADMIN'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kaizen Committee
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-700 p-3.5 rounded-lg border border-red-200 text-xs font-semibold">
                {error}
              </div>
            )}

            {loginMode === 'SECTION' ? (
              <>
                {/* Step 1: Location Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    1. Select Location
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {LOCATIONS.map((loc) => {
                      const isActive = selectedLocation === loc;
                      const facCount = LOCATION_FACTORIES[loc].length;
                      return (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => handleLocationChange(loc)}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            isActive
                              ? 'border-blue-700 bg-blue-50/70 ring-1 ring-blue-700'
                              : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <MapPin className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-700' : 'text-slate-400'}`} />
                            <span className={`text-[11px] font-semibold tabular-nums ${isActive ? 'text-blue-700' : 'text-slate-400'}`}>
                              {facCount} {facCount === 1 ? 'Factory' : 'Factories'}
                            </span>
                          </div>
                          <span className={`text-xs font-bold block ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                            {loc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: Factory Selector (filtered by Location) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    2. Select Factory ({selectedLocation})
                  </label>
                  <div className={`grid gap-2.5 ${availableFactories.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                    {availableFactories.map((factory) => {
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
                              {unitCount} Sections
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

                {/* Step 3: Section Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      3. Choose Section
                    </label>
                    <select
                      value={availableUnits.includes(sectionInput) ? sectionInput : ''}
                      onChange={(e) => {
                        if (e.target.value) setSectionInput(e.target.value);
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-blue-700 focus:bg-white outline-none transition-all"
                    >
                      <option value="">Select section...</option>
                      {availableUnits.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Or Type Section ID
                    </label>
                    <div className="relative">
                      <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={sectionInput}
                        onChange={(e) => setSectionInput(e.target.value)}
                        list="factory-unit-list"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-blue-700 focus:bg-white outline-none transition-all placeholder:text-slate-400"
                        placeholder={selectedFactory === Factory.MASTER_MOLTY_FOAM ? 'e.g. Foam Section' : 'e.g. Chair'}
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
              </>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-600 leading-relaxed">
                    <p className="font-bold text-slate-900">Kaizen Committee & Management Access</p>
                    <p className="mt-0.5">
                      Review pending Kaizens across Karachi, Lahore, and Mirpur, evaluate submissions against the 7-criteria judgment matrix, and view segregated Finance reward summaries.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Management Admin ID
                  </label>
                  <div className="relative">
                    <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={sectionInput}
                      onChange={(e) => setSectionInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-blue-700 focus:bg-white outline-none transition-all"
                      placeholder="admin"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {loginMode === 'ADMIN' ? 'Management Password' : '4. Section Password'}
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
              <span>{loginMode === 'ADMIN' ? 'Open Management Dashboard' : 'Sign In to Section Portal'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="pt-4 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-500">
                {loginMode === 'ADMIN'
                  ? 'Kaizen Committee Admin ID: admin'
                  : 'Authorized Personnel Only · Select Location, Factory & Section (Pass: 123)'}
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
