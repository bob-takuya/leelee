import { useStore } from '../store';

export default function BottomBar() {
  const nodes = useStore((s) => s.nodes);
  const members = useStore((s) => s.members);
  const stability = useStore((s) => s.stability);
  const selfStressDim = useStore((s) => s.selfStressDim);
  const gaRun = useStore((s) => s.gaRun);

  const visible = members.filter((m) => m.type !== 'removed');
  const struts = members.filter((m) => m.type === 'strut').length;
  const cables = members.filter((m) => m.type === 'cable').length;
  const candidates = members.filter((m) => m.type === 'candidate').length;

  return (
    <div className="h-8 border-t border-line bg-panel flex items-center px-4 text-[10px] font-mono text-slate-400 gap-4 shrink-0">
      <span>節点 {nodes.length}</span>
      <span>メンバー {visible.length}</span>
      <span className="text-red-400">strut {struts}</span>
      <span className="text-blue-400">cable {cables}</span>
      <span>candidates {candidates}</span>
      <span className="ml-auto">self-stress dim: {selfStressDim}</span>
      {gaRun.running && (
        <span className="text-accent">
          GA running · gen {gaRun.generation}
        </span>
      )}
      <span>
        安定:{' '}
        {stability?.verdict === 'stable'
          ? '✓'
          : stability?.verdict === 'unstable'
            ? '✗'
            : stability?.verdict === 'uncertain'
              ? '?'
              : '–'}
      </span>
    </div>
  );
}
