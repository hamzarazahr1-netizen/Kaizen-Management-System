import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  orderBy,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { LogOut, LayoutDashboard, PlusCircle, FileText, BarChart3 } from 'lucide-react';
import { db } from './firebase';
import { User, Kaizen, Factory, MOLTY_FOAM_DEPARTMENTS } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import KaizenForm from './components/KaizenForm';
import Records from './components/Records';
import AdminGlobalAnalytics from './components/AdminGlobalAnalytics';
import QuickSubmitPortal from './components/QuickSubmitPortal';
import { parseQuickSubmitFromUrl } from './utils/qrPdf';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: ErrorBoundaryProps;
  declare state: ErrorBoundaryState;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message || 'An unexpected application error occurred.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
            <h1 className="text-lg font-extrabold text-slate-900">Connection or Data Error</h1>
            <p className="text-xs text-slate-500 mt-2 break-words">{this.state.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-5 py-2.5 bg-slate-900 hover:bg-blue-800 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors"
            >
              Reload Portal
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [kaizens, setKaizens] = useState<Kaizen[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'submit' | 'records' | 'analytics'>('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [qrTarget, setQrTarget] = useState<{ factory: Factory; department: string } | null>(() =>
    parseQuickSubmitFromUrl()
  );

  useEffect(() => {
    if (!currentUser) {
      setKaizens([]);
      setIsSyncing(false);
      return;
    }

    const q = query(collection(db, 'kaizens'), orderBy('submissionDate', 'desc'));

    setIsSyncing(true);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => {
          const raw = docSnap.data();
          const inferredFactory: Factory =
            raw.factory === Factory.MOLTY_FOAM || MOLTY_FOAM_DEPARTMENTS.includes(raw.department)
              ? Factory.MOLTY_FOAM
              : Factory.FURNITURE;

          return {
            ...raw,
            id: docSnap.id,
            factory: inferredFactory
          } as Kaizen;
        });
        setKaizens(data);
        setIsSyncing(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'kaizens');
        setIsSyncing(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const saveKaizenToFirestore = async (newKaizen: Kaizen) => {
    setIsSyncing(true);
    try {
      const kaizensRef = collection(db, 'kaizens');
      if (newKaizen.id) {
        await setDoc(doc(db, 'kaizens', newKaizen.id), {
          ...newKaizen,
          createdAt: serverTimestamp()
        });
      } else {
        await addDoc(kaizensRef, {
          ...newKaizen,
          createdAt: serverTimestamp()
        });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'kaizens');
    } finally {
      setIsSyncing(false);
    }
  };

  const addKaizen = async (newKaizen: Kaizen) => {
    await saveKaizenToFirestore(newKaizen);
    setActiveTab('records');
  };

  const updateKaizen = async (updatedKaizen: Kaizen) => {
    setIsSyncing(true);
    try {
      const kaizenRef = doc(db, 'kaizens', updatedKaizen.id);
      await updateDoc(kaizenRef, {
        ...updatedKaizen,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `kaizens/${updatedKaizen.id}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExitQrMode = () => {
    setQrTarget(null);
    if (window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  const handleLogin = (user: User) => {
    handleExitQrMode();
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  const handleLogout = () => setCurrentUser(null);

  if (!currentUser && qrTarget) {
    return (
      <QuickSubmitPortal
        factory={qrTarget.factory}
        department={qrTarget.department}
        onSubmit={saveKaizenToFirestore}
        onGoToLogin={handleExitQrMode}
      />
    );
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-6 sticky top-0 z-[100]">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2.5 shrink-0">
            <img
              src="/assets/aistudio/Master_Furnishings_68c64c06.jpeg"
              alt="Master Furnishings"
              className="h-9 w-auto object-contain mix-blend-multiply shrink-0"
              referrerPolicy="no-referrer"
            />
            <img
              src="/assets/aistudio/Master_Logo_17bc2ec9.png"
              alt="Master Molty Foam"
              className="h-9 w-auto object-contain rounded shrink-0"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="hidden sm:block border-l border-slate-200 pl-4 min-w-0">
            <h1 className="text-sm font-extrabold text-slate-900 tracking-tight truncate">
              {currentUser.role === 'ADMIN' ? 'Lean & Transformation Portal' : 'Master Kaizen Management System'}
            </h1>
            <p className="text-xs text-slate-500 truncate">
              {currentUser.role === 'ADMIN'
                ? 'Master Lifestyle & Master Molty Foam Karachi Factories'
                : `${currentUser.factory} · ${currentUser.department}`}
            </p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-2 text-xs font-bold whitespace-nowrap shrink-0 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'dashboard'
                ? 'border-blue-700 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          {currentUser.role === 'DEPARTMENT' && (
            <button
              onClick={() => setActiveTab('submit')}
              className={`py-2 text-xs font-bold whitespace-nowrap shrink-0 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'submit'
                  ? 'border-blue-700 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Submit Kaizen</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('records')}
            className={`py-2 text-xs font-bold whitespace-nowrap shrink-0 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'records'
                ? 'border-blue-700 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Records Management</span>
          </button>

          {currentUser.role === 'ADMIN' && (
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-2 text-xs font-bold whitespace-nowrap shrink-0 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'analytics'
                  ? 'border-blue-700 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Global Analytics</span>
            </button>
          )}
        </nav>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right hidden xl:block">
            <p className="text-xs font-bold text-slate-900">{currentUser.department}</p>
            <p className="text-[11px] text-slate-500">
              {currentUser.role === 'ADMIN' ? 'Management Access' : currentUser.factory}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Mobile Nav */}
      <nav className="md:hidden bg-white border-b border-slate-200 px-4 py-1 flex gap-4 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`py-2.5 text-xs font-bold whitespace-nowrap shrink-0 border-b-2 ${
            activeTab === 'dashboard' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500'
          }`}
        >
          Dashboard
        </button>
        {currentUser.role === 'DEPARTMENT' && (
          <button
            onClick={() => setActiveTab('submit')}
            className={`py-2.5 text-xs font-bold whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'submit' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500'
            }`}
          >
            Submit Kaizen
          </button>
        )}
        <button
          onClick={() => setActiveTab('records')}
          className={`py-2.5 text-xs font-bold whitespace-nowrap shrink-0 border-b-2 ${
            activeTab === 'records' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500'
          }`}
        >
          Records Management
        </button>
        {currentUser.role === 'ADMIN' && (
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2.5 text-xs font-bold whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'analytics' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500'
            }`}
          >
            Global Analytics
          </button>
        )}
      </nav>

      <main className="flex-1 overflow-auto p-4 md:p-6 pb-20">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard user={currentUser} kaizens={kaizens} />}
          {activeTab === 'submit' && currentUser.role === 'DEPARTMENT' && currentUser.factory !== 'ALL' && (
            <KaizenForm
              factory={currentUser.factory}
              department={currentUser.department}
              onSubmit={addKaizen}
            />
          )}
          {activeTab === 'records' && (
            <Records user={currentUser} kaizens={kaizens} onUpdate={updateKaizen} />
          )}
          {activeTab === 'analytics' && currentUser.role === 'ADMIN' && (
            <AdminGlobalAnalytics kaizens={kaizens} />
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-3 px-6 text-xs text-slate-500">
        <div className="flex flex-col sm:flex-row justify-between items-center max-w-7xl mx-auto gap-2">
          <p className="font-medium">
            © 2026 Master Furnishings Pvt. Ltd. <span aria-hidden="true">·</span> Lean & Transformation Portal {isSyncing ? '· Syncing...' : ''}
          </p>
          <p className="font-semibold text-slate-400">Developed by Hamza Raza</p>
        </div>
      </footer>
    </div>
  );
};

const App: React.FC = () => (
  <AppErrorBoundary>
    <AppContent />
  </AppErrorBoundary>
);

export default App;
