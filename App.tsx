import React, { useState, useEffect } from 'react';
import { LayoutGrid, Plus, Volume2, Trash, Edit3, Lock, Unlock, AlertTriangle, Scissors, LogOut } from 'lucide-react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { SoundBoard, Sound } from './types';
import SoundPad from './components/SoundPad';
import EditorModal from './components/EditorModal';
import AudioEditor from './pages/AudioEditor';
import Login from './pages/Login';
import GlobalPlayer from './components/GlobalPlayer';
import { loadBoards, saveBoard, deleteBoard, saveSound, deleteSound } from './services/db';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { PlayerProvider } from './context/PlayerContext';

// Default initial state
const DEFAULT_BOARD: SoundBoard = {
  id: 'default-1',
  name: 'Main Board',
  columns: 4,
  gap: 4,
  sounds: []
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const BoardView: React.FC = () => {
  const [boards, setBoards] = useState<SoundBoard[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string>('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { logout, user } = useAuth();

  // Editor Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSound, setEditingSound] = useState<Partial<Sound>>({});

  // Load Initial Data
  useEffect(() => {
    const init = async () => {
      try {
        const loaded = await loadBoards();
        if (loaded.length === 0) {
          await saveBoard(DEFAULT_BOARD);
          setBoards([DEFAULT_BOARD]);
          setActiveBoardId(DEFAULT_BOARD.id);
        } else {
          setBoards(loaded);
          setActiveBoardId(loaded[0].id);
        }
      } catch (e) {
        console.error("DB Load failed", e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const activeBoard = boards.find(b => b.id === activeBoardId) || boards[0];

  const handleCreateBoard = async () => {
    const newBoard: SoundBoard = {
      id: crypto.randomUUID(),
      name: `New Board ${boards.length + 1}`,
      columns: 4,
      gap: 4,
      sounds: []
    };
    await saveBoard(newBoard);
    setBoards([...boards, newBoard]);
    setActiveBoardId(newBoard.id);
    setIsEditMode(true);
  };

  const handleDeleteBoard = async () => {
    if (boards.length <= 1) {
      alert("Cannot delete the last board.");
      return;
    }
    if (confirm("Are you sure you want to delete this board? This cannot be undone.")) {
      await deleteBoard(activeBoardId);
      const remaining = boards.filter(b => b.id !== activeBoardId);
      setBoards(remaining);
      setActiveBoardId(remaining[0].id);
    }
  };

  const handleUpdateBoardConfig = async (key: keyof SoundBoard, value: any) => {
    if (!activeBoard) return;
    const updated = { ...activeBoard, [key]: value };
    await saveBoard(updated);
    setBoards(boards.map(b => b.id === updated.id ? updated : b));
  };

  // Sound Management
  const handleAddSound = () => {
    setEditingSound({ id: crypto.randomUUID() });
    setIsModalOpen(true);
  };

  const handleEditSound = (sound: Sound) => {
    // RBAC Check
    if (sound.createdBy === 'admin' && user !== 'admin') {
      alert("You cannot edit sounds created by Admin.");
      return;
    }
    setEditingSound(sound);
    setIsModalOpen(true);
  };

  const handleDeleteSound = async (soundId: string) => {
    if (!activeBoard) return;

    const soundToDelete = activeBoard.sounds.find(s => s.id === soundId);
    if (soundToDelete?.createdBy === 'admin' && user !== 'admin') {
      alert("You cannot delete sounds created by Admin.");
      return;
    }

    await deleteSound(soundId);

    const updatedSounds = activeBoard.sounds.filter(s => s.id !== soundId);
    const updatedBoard = { ...activeBoard, sounds: updatedSounds };
    setBoards(boards.map(b => b.id === updatedBoard.id ? updatedBoard : b));
  };

  const handleSaveSound = async (soundData: Partial<Sound>) => {
    if (!activeBoard) return;

    // Ensure critical fields
    const newSound: Sound = {
      id: soundData.id || crypto.randomUUID(),
      name: soundData.name || 'Untitled',
      source: soundData.source || 'upload',
      blob: soundData.blob,
      color: soundData.color || '#06b6d4',
      volume: soundData.volume ?? 1,
      loop: soundData.loop || false,
      shortcut: soundData.shortcut,
      createdBy: soundData.createdBy || user || 'unknown' // Attach creator
    };

    await saveSound(newSound, activeBoard.id);

    let updatedSounds;
    const exists = activeBoard.sounds.find(s => s.id === newSound.id);
    if (exists) {
      updatedSounds = activeBoard.sounds.map(s => s.id === newSound.id ? newSound : s);
    } else {
      updatedSounds = [...activeBoard.sounds, newSound];
    }

    const updatedBoard = { ...activeBoard, sounds: updatedSounds };
    setBoards(boards.map(b => b.id === updatedBoard.id ? updatedBoard : b));
    setIsModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 font-mono animate-pulse">Initializing FunSounds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-950 text-gray-200 font-sans selection:bg-primary-500/30 pb-24">

      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
        <div className="p-6 border-b border-gray-800 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg shadow-lg shadow-primary-500/20">
            <Volume2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-none">FunSounds</h1>
            <span className="text-xs text-primary-400 font-mono uppercase tracking-widest">by Raghu</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="mb-4 px-2 py-2 bg-gray-800/50 rounded-lg flex items-center justify-between">
            <span className="text-xs text-gray-400">User: <span className="text-white font-bold">{user}</span></span>
            <button onClick={logout} className="text-xs text-red-400 hover:text-red-300"><LogOut className="w-3 h-3" /></button>
          </div>

          <Link to="/editor" className="w-full text-left px-4 py-3 rounded-xl text-gray-400 hover:bg-gray-800/50 hover:text-gray-200 transition-all duration-200 flex items-center gap-3 group mb-4 border border-transparent hover:border-gray-700">
            <Scissors className="w-4 h-4 text-accent-500" />
            <span>Audio Editor</span>
          </Link>

          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">Your Boards</p>
          {boards.map(board => (
            <button
              key={board.id}
              onClick={() => setActiveBoardId(board.id)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 group
                    ${activeBoardId === board.id
                  ? 'bg-gray-800 text-white shadow-md border border-gray-700'
                  : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'}`}
            >
              <LayoutGrid className={`w-4 h-4 ${activeBoardId === board.id ? 'text-primary-400' : 'text-gray-600 group-hover:text-gray-400'}`} />
              <span className="truncate">{board.name}</span>
            </button>
          ))}

          <button
            onClick={handleCreateBoard}
            className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-gray-700 rounded-xl text-gray-500 hover:text-primary-400 hover:border-primary-500/50 hover:bg-primary-500/5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Board</span>
          </button>
        </div>

        <div className="p-4 border-t border-gray-800 text-center">
          <p className="text-[10px] text-gray-600">Powered by Gemini 2.5</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">

        {/* Top Bar */}
        <header className="h-16 border-b border-gray-800 bg-gray-900/50 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-4">
            {isEditMode ? (
              <input
                type="text"
                value={activeBoard?.name}
                onChange={(e) => handleUpdateBoardConfig('name', e.target.value)}
                className="bg-gray-800 border border-gray-700 text-white px-3 py-1 rounded-md focus:border-primary-500 outline-none font-bold"
              />
            ) : (
              <h2 className="text-2xl font-bold text-white">{activeBoard?.name}</h2>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isEditMode && (
              <div className="flex items-center gap-2 mr-4 bg-gray-800 rounded-lg p-1">
                <span className="text-xs text-gray-400 px-2">Cols</span>
                <input
                  type="number" min="1" max="8"
                  value={activeBoard?.columns}
                  onChange={(e) => handleUpdateBoardConfig('columns', parseInt(e.target.value))}
                  className="w-12 bg-gray-900 border border-gray-700 rounded px-1 text-center text-sm"
                />
                <span className="text-xs text-gray-400 px-2 border-l border-gray-700">Gap</span>
                <input
                  type="number" min="0" max="8"
                  value={activeBoard?.gap}
                  onChange={(e) => handleUpdateBoardConfig('gap', parseInt(e.target.value))}
                  className="w-12 bg-gray-900 border border-gray-700 rounded px-1 text-center text-sm"
                />
              </div>
            )}

            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${isEditMode ? 'bg-accent-600 text-white shadow-lg shadow-accent-600/20' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
            >
              {isEditMode ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {isEditMode ? 'Done Editing' : 'Edit Board'}
            </button>

            {isEditMode && (
              <button
                onClick={handleDeleteBoard}
                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Delete Board"
              >
                <Trash className="w-5 h-5" />
              </button>
            )}
          </div>
        </header>

        {/* Board Grid */}
        <div className="flex-1 overflow-y-auto p-8 relative pb-32">
          {!activeBoard ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600">
              <AlertTriangle className="w-12 h-12 mb-4 opacity-50" />
              <p>No board selected</p>
            </div>
          ) : (
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${activeBoard.columns}, minmax(0, 1fr))`,
                gap: `${activeBoard.gap * 4}px`
              }}
            >
              {activeBoard.sounds.map(sound => (
                <SoundPad
                  key={sound.id}
                  sound={sound}
                  isEditMode={isEditMode}
                  onPlay={(id, sound) => console.log('Playing', id, sound)}
                  onEdit={handleEditSound}
                  onDelete={handleDeleteSound}
                />
              ))}

              {/* Add Button Placeholder */}
              {isEditMode && (
                <button
                  onClick={handleAddSound}
                  className="aspect-square rounded-xl border-2 border-dashed border-gray-700 bg-gray-800/30 hover:bg-gray-800 hover:border-primary-500/50 hover:text-primary-400 text-gray-600 flex flex-col items-center justify-center gap-2 transition-all group"
                >
                  <Plus className="w-8 h-8 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-medium">Add Sound</span>
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <EditorModal
        isOpen={isModalOpen}
        sound={editingSound}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveSound}
      />

      {/* Global Player */}
      <GlobalPlayer />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <PlayerProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <BoardView />
              </ProtectedRoute>
            } />
            <Route path="/editor" element={
              <ProtectedRoute>
                <AudioEditor />
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </PlayerProvider>
    </AuthProvider>
  );
};

export default App;
