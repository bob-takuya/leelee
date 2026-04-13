import { useMemo } from 'react';
import { useStore } from '../store';

export default function StrutSelectionPanel() {
  const members = useStore((s) => s.members);
  const nodes = useStore((s) => s.nodes);
  const toggleStrut = useStore((s) => s.toggleStrut);
  const clearStruts = useStore((s) => s.clearStruts);
  const enforceClass1 = useStore((s) => s.enforceClass1);
  const setEnforceClass1 = useStore((s) => s.setEnforceClass1);

  const struts = members.filter((m) => m.type === 'strut');
  const numCandidates = members.filter((m) => m.type === 'candidate').length;

  const { class1Ok, sharedNodes } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of struts) {
      counts.set(s.nodeA, (counts.get(s.nodeA) ?? 0) + 1);
      counts.set(s.nodeB, (counts.get(s.nodeB) ?? 0) + 1);
    }
    const shared: string[] = [];
    for (const [id, c] of counts.entries()) if (c > 1) shared.push(id);
    return { class1Ok: shared.length === 0, sharedNodes: shared };
  }, [struts]);

  let warning: string | null = null;
  if (nodes.length >= 3 && struts.length === 0)
    warning = 'ストラットがまだ選択されていません。';
  else if (nodes.length >= 4 && struts.length < Math.ceil(nodes.length / 4))
    warning = 'ストラットが少ない可能性があります。';
  else if (struts.length > nodes.length / 2)
    warning = 'ストラットが多すぎます。多くの節点で複数のストラットが共有されます。';

  return (
    <div className="section">
      <div className="section-title">
        ストラット <span className="chip">{struts.length}</span>
        <span className="ml-auto text-[10px] text-slate-500 font-normal">
          candidates: {numCandidates}
        </span>
      </div>
      <p className="text-[10px] text-slate-500 leading-relaxed mb-2">
        Ground Structure のメンバーをクリックするとストラット（赤）として登録されます。
        Class 1 条件：ストラット同士が節点を共有しないこと。
      </p>
      <label className="flex items-center gap-2 text-[11px] text-slate-300 mb-2">
        <input
          type="checkbox"
          checked={enforceClass1}
          onChange={(e) => setEnforceClass1(e.target.checked)}
        />
        Class 1 をバリデートする
      </label>

      {warning && (
        <div className="text-[10px] text-yellow-300/90 bg-yellow-500/10 border border-yellow-500/30 rounded px-2 py-1 mb-2">
          ⚠ {warning}
        </div>
      )}
      {enforceClass1 && !class1Ok && (
        <div className="text-[10px] text-red-300/90 bg-red-500/10 border border-red-500/30 rounded px-2 py-1 mb-2">
          ✗ Class 1 違反：ストラットが節点 {sharedNodes.join(', ')} を共有しています。
        </div>
      )}

      <div className="max-h-32 overflow-y-auto border border-line rounded">
        {struts.length === 0 ? (
          <div className="px-2 py-2 text-[11px] text-slate-500">未選択</div>
        ) : (
          struts.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between px-2 py-1 text-[11px] font-mono border-b border-line last:border-b-0"
            >
              <span className="text-red-300">
                {s.nodeA} ↔ {s.nodeB}
              </span>
              <button
                className="text-slate-500 hover:text-red-400"
                onClick={() => toggleStrut(s.id)}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
      {struts.length > 0 && (
        <button className="btn mt-2" onClick={clearStruts}>
          ストラットをクリア
        </button>
      )}
    </div>
  );
}
