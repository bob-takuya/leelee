import { useStore, type Step } from '../store';

const STEPS: { id: Step; label: string }[] = [
  { id: 'place', label: '① 節点を配置' },
  { id: 'strut', label: '② ストラットを選択' },
  { id: 'optimize', label: '③ GAを実行' },
  { id: 'result', label: '④ 結果を確認' },
];

export default function Header() {
  const step = useStore((s) => s.step);
  const setStep = useStore((s) => s.setStep);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const past = useStore((s) => s.past);
  const future = useStore((s) => s.future);

  return (
    <header className="h-12 border-b border-line bg-panel flex items-center px-4 gap-4 shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-accent/20 border border-accent/60 flex items-center justify-center text-accent font-mono text-[10px]">
          TL
        </div>
        <div className="font-semibold tracking-tight">TensegrityLab</div>
        <div className="text-[10px] text-slate-500 font-mono hidden md:block">
          Lee &amp; Lee (2016)
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center gap-1">
        {STEPS.map((s, i) => {
          const active = step === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setStep(s.id)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                active
                  ? 'bg-accent/20 text-accent border border-accent/60'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <button className="btn" onClick={undo} disabled={past.length === 0}>
          ⟲ Undo
        </button>
        <button className="btn" onClick={redo} disabled={future.length === 0}>
          ⟳ Redo
        </button>
      </div>
    </header>
  );
}
