import { useState } from 'react';
import { useStore } from '../store';
import type { Vec3 } from '../types';

export default function NodeListPanel() {
  const nodes = useStore((s) => s.nodes);
  const addNodeAt = useStore((s) => s.addNodeAt);
  const moveNode = useStore((s) => s.moveNode);
  const deleteNode = useStore((s) => s.deleteNode);
  const selected = useStore((s) => s.selectedNodeId);
  const setSelected = useStore((s) => s.setSelectedNode);

  const [draft, setDraft] = useState<Vec3>([0, 1, 0]);

  return (
    <div className="section">
      <div className="section-title">
        節点 <span className="chip">{nodes.length}</span>
      </div>
      <div className="flex items-center gap-1 mb-2">
        {(['x', 'y', 'z'] as const).map((ax, i) => (
          <input
            key={ax}
            className="field"
            type="number"
            step="0.1"
            value={draft[i]}
            onChange={(e) => {
              const v = parseFloat(e.target.value) || 0;
              const next = [...draft] as Vec3;
              next[i] = v;
              setDraft(next);
            }}
          />
        ))}
        <button className="btn btn-primary" onClick={() => addNodeAt(draft)}>
          +
        </button>
      </div>
      <div className="max-h-40 overflow-y-auto border border-line rounded">
        <table className="w-full text-[11px] font-mono">
          <thead className="text-slate-500 bg-panel2">
            <tr>
              <th className="text-left px-2 py-1">id</th>
              <th className="text-right px-1">x</th>
              <th className="text-right px-1">y</th>
              <th className="text-right px-1">z</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {nodes.map((n) => (
              <tr
                key={n.id}
                className={`border-t border-line ${
                  selected === n.id ? 'bg-accent/10' : ''
                }`}
                onClick={() => setSelected(selected === n.id ? null : n.id)}
              >
                <td className="px-2 py-1 text-slate-300">{n.id}</td>
                {([0, 1, 2] as const).map((i) => (
                  <td key={i} className="px-1 py-0.5">
                    <input
                      className="w-full bg-transparent text-right text-slate-200 focus:outline-none"
                      type="number"
                      step="0.1"
                      value={n.position[i]}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        const p = [...n.position] as Vec3;
                        p[i] = v;
                        moveNode(n.id, p);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                ))}
                <td className="px-1">
                  <button
                    className="text-slate-500 hover:text-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNode(n.id);
                    }}
                    title="delete"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
            {nodes.length === 0 && (
              <tr>
                <td className="px-2 py-2 text-slate-500" colSpan={5}>
                  まだ節点がありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
