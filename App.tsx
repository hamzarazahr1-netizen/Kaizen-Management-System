
import React, { useState, useEffect } from 'react';
import { User, Kaizen, DEPARTMENTS } from './types';
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
import { db } from './firebase';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import KaizenForm from './components/KaizenForm';
import Records from './components/Records';
import AdminGlobalAnalytics from './components/AdminGlobalAnalytics';

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

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [kaizens, setKaizens] = useState<Kaizen[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'submit' | 'records' | 'analytics'>('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'kaizens'), orderBy('submissionDate', 'desc'));
    
    setIsSyncing(true);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Kaizen[];
      setKaizens(data);
      setIsSyncing(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'kaizens');
      setIsSyncing(false);
    });

    return () => unsubscribe();
  }, []);

  const addKaizen = async (newKaizen: Kaizen) => {
    setIsSyncing(true);
    try {
      const kaizensRef = collection(db, 'kaizens');
      // We use the ID provided by the form if it exists, otherwise Firestore generates one
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
      setActiveTab('records');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'kaizens');
    } finally {
      setIsSyncing(false);
    }
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

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  const handleLogout = () => setCurrentUser(null);

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="bg-slate-900 text-white shadow-md py-4 px-6 flex justify-between items-center border-b border-slate-700">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase">Master Furnishings Pvt. Ltd.</h1>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              Lean Cloud Operational System
              {isSyncing && <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right border-r border-slate-700 pr-6 hidden md:block">
            <p className="text-sm font-bold text-blue-400 uppercase">{currentUser.department}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">{currentUser.role}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="px-4 py-1.5 text-xs font-bold border border-slate-600 hover:bg-slate-800 rounded transition-all uppercase"
          >
            Logout
          </button>
        </div>
      </header>

      <nav className="bg-white border-b border-slate-200 px-6 py-1 flex gap-2 overflow-x-auto no-scrollbar sticky top-0 z-[100]">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-3 text-xs font-bold uppercase whitespace-nowrap transition-all border-b-2 ${activeTab === 'dashboard' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Dashboard
        </button>
        {currentUser.role === 'DEPARTMENT' && (
          <button 
            onClick={() => setActiveTab('submit')}
            className={`px-4 py-3 text-xs font-bold uppercase whitespace-nowrap transition-all border-b-2 ${activeTab === 'submit' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Submit Kaizen
          </button>
        )}
        <button 
          onClick={() => setActiveTab('records')}
          className={`px-4 py-3 text-xs font-bold uppercase whitespace-nowrap transition-all border-b-2 ${activeTab === 'records' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Records Management
        </button>
        {currentUser.role === 'ADMIN' && (
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-3 text-xs font-bold uppercase whitespace-nowrap transition-all border-b-2 ${activeTab === 'analytics' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Global Analytics
          </button>
        )}
      </nav>

      <main className="flex-1 overflow-auto p-4 md:p-6 pb-24">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard user={currentUser} kaizens={kaizens} />}
          {activeTab === 'submit' && currentUser.role === 'DEPARTMENT' && (
            <KaizenForm department={currentUser.department} onSubmit={addKaizen} />
          )}
          {activeTab === 'records' && (
            <Records user={currentUser} kaizens={kaizens} onUpdate={updateKaizen} />
          )}
          {activeTab === 'analytics' && currentUser.role === 'ADMIN' && (
            <AdminGlobalAnalytics kaizens={kaizens} />
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-[10px] text-slate-400 fixed bottom-0 left-0 right-0 z-50">
        <div className="flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto gap-2">
          <p className="uppercase font-medium">© 2025 Master Furnishings Pvt. Ltd. | Cloud Status: {isSyncing ? 'SYNCING...' : 'CONNECTED'}</p>
          <div className="flex items-center gap-2">
            <span className="h-1 w-1 bg-slate-300 rounded-full"></span>
            <p className="italic font-bold text-slate-500 uppercase tracking-widest opacity-60">Developed by Hamza Raza</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
