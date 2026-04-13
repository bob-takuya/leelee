import { useStore } from '../store';

export default function ResultPanel() {
  const members = useStore((s) => s.members);
  const stability = useStore((s) => s.stability);
  const selfStressDim = useStore((s) => s.selfStressDim);
  const thicknessScale = useStore((s) => s.thicknessScale);
  const setThicknessScale = useStore((s) => s.setThicknessScale);

  const active = members.filter(
    (m) => (m.type === 'strut' || m.type === 'cable') && m.forceDensity !== undefined
  );

  if (active.length === 0) return null;

  return (
    <div className="section">
      <div className="section-title">
        結果（自己応力 w）
        {stability && (
          <span
            className={`ml-auto chip ${
              stability.verdict === 'stable'
                ? 'text-green-300 border-green-500/50'
                : stability.verdict === 'unstable'
                  ? 'text-red-300 border-red-500/50'
                  : 'text-yellow-300 border-yellow-500/50'
            }`}
          >
            {stability.verdict === 'stable'
              ? '✓ 安定'
              : stability.verdict === 'unstable'
                ? '✗ 不安定'
                : '? 要確認'}
          </span>
        )}
      </div>
      <label className="flex items-center gap-2 text-[11px] text-slate-300 mb-2">
        <input
          type="checkbox"
          checked={thicknessScale}
          onChange={(e) => setThicknessScale(e.target.checked)}
        />
        太さを |q| に比例させる
      </label>
      <div className="text-[10px] text-slate-500 mb-1 font-mono">
        selfStressDim = {selfStressDim} · members = {active.length}
      </div>
      <div className="max-h-40 overflow-y-auto border border-line rounded">
        <table className="w-full text-[11px] font-mono">
          <thead className="text-slate-500 bg-panel2 sticky top-0">
            <tr>
              <th className="text-left px-2 py-1">id</th>
              <th className="text-left px-1">type</th>
              <th className="text-right px-2">q</th>
            </tr>
          </thead>
          <tbody>
            {active.map((m) => (
              <tr key={m.id} className="border-t border-line">
                <td className="px-2 py-0.5 text-slate-400">
                  {m.nodeA}↔{m.nodeB}
                </td>
                <td className={`px-1 ${m.type === 'strut' ? 'text-red-400' : 'text-blue-400'}`}>
                  {m.type}
                </td>
                <td className="px-2 text-right text-slate-200">
                  {(m.forceDensity ?? 0).toFixed(4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {stability && (
        <div className="text-[10px] text-slate-500 mt-2 font-mono leading-relaxed">
          rank(A) = {stability.rankA} / {stability.expectedRank}
          {' · '}
          nullDim = {stability.nullspaceDim}
          <br />
          infRigid: {stability.infinitesimallyRigid ? '✓' : '✗'} · prestress:{' '}
          {stability.prestressStable ? '✓' : '✗'}
        </div>
      )}
    </div>
  );
}
