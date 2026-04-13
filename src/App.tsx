import Header from './components/Header';
import Viewport from './components/Viewport';
import SidePanel from './components/SidePanel';
import BottomBar from './components/BottomBar';
import { useEffect } from 'react';
import { useStore } from './store';

export default function App() {
  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useStore.getState().undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        useStore.getState().redo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const id = useStore.getState().selectedNodeId;
        if (id) {
          useStore.getState().deleteNode(id);
          useStore.getState().setSelectedNode(null);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="h-full w-full flex flex-col bg-ink text-slate-100">
      <Header />
      <div className="flex-1 flex min-h-0">
        <main className="flex-1 relative">
          <Viewport />
        </main>
        <SidePanel />
      </div>
      <BottomBar />
    </div>
  );
}
