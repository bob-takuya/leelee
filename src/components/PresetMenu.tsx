import { useState } from 'react';
import { useStore } from '../store';
import { PRESETS } from '../core/presets';
import { downloadText, fromJSON, toJSON, toOBJ } from '../core/export';

export default function PresetMenu() {
  const loadPreset = useStore((s) => s.loadPreset);
  const clearAll = useStore((s) => s.clearAll);
  const nodes = useStore((s) => s.nodes);
  const members = useStore((s) => s.members);
  const loadSnapshot = useStore((s) => s.loadSnapshot);
  const [randomN, setRandomN] = useState(8);

  const onImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const snap = fromJSON(String(reader.result));
        loadSnapshot({ nodes: snap.nodes, members: snap.members });
      } catch (err) {
        alert('Failed to import: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="section">
      <div className="section-title">プリセット / ファイル</div>
      <div className="grid grid-cols-1 gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            className="btn text-left flex flex-col items-start py-1.5 px-2"
            title={p.description}
            onClick={() => loadPreset(p.id, p.id === 'random' ? randomN : undefined)}
          >
            <span className="text-[11px] font-semibold text-slate-200">{p.label}</span>
            <span className="text-[10px] text-slate-500">{p.description}</span>
          </button>
        ))}
        {
          <div className="flex items-center gap-2 mt-1">
            <label className="label">ランダム節点数</label>
            <input
              className="field w-16"
              type="number"
              min={4}
              max={20}
              value={randomN}
              onChange={(e) => setRandomN(parseInt(e.target.value) || 4)}
            />
          </div>
        }
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        <button className="btn btn-danger" onClick={clearAll}>
          Clear
        </button>
        <button
          className="btn"
          onClick={() => downloadText('tensegrity.json', toJSON(nodes, members), 'application/json')}
        >
          Export JSON
        </button>
        <button
          className="btn"
          onClick={() => downloadText('tensegrity.obj', toOBJ(nodes, members), 'text/plain')}
        >
          Export OBJ
        </button>
        <label className="btn cursor-pointer">
          Import JSON
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImport(f);
              e.target.value = '';
            }}
          />
        </label>
      </div>
    </div>
  );
}
