import { useRef } from 'react';
import { useStore } from '../store';
import type { GAInput, GAUpdate } from '../core/ga';
import { checkStability } from '../core/stability';

export default function GAParamsPanel() {
  const gaConfig = useStore((s) => s.gaConfig);
  const setGAConfig = useStore((s) => s.setGAConfig);
  const gaRun = useStore((s) => s.gaRun);
  const startGA = useStore((s) => s.startGA);
  const stopGA = useStore((s) => s.stopGA);
  const resetGAResult = useStore((s) => s.resetGAResult);
  const onGAProgress = useStore((s) => s.onGAProgress);
  const onGADone = useStore((s) => s.onGADone);
  const setStability = useStore((s) => s.setStability);

  const workerRef = useRef<Worker | null>(null);

  const canRun = useStore((s) => {
    const nodes = s.nodes;
    const struts = s.members.filter((m) => m.type === 'strut');
    const cands = s.members.filter((m) => m.type === 'candidate');
    return nodes.length >= 3 && struts.length >= 1 && cands.length >= 1;
  });

  const start = () => {
    const { nodes, members, enforceClass1, gaConfig } = useStore.getState();
    const strutIds = members.filter((m) => m.type === 'strut').map((m) => m.id);
    const candidateIds = members.filter((m) => m.type === 'candidate').map((m) => m.id);
    const memberDefs = members.map((m) => ({ id: m.id, nodeA: m.nodeA, nodeB: m.nodeB }));

    const input: GAInput = {
      nodes,
      strutIds,
      candidateIds,
      memberDefs,
      config: gaConfig,
      enforceClass1,
    };

    startGA();

    const worker = new Worker(new URL('../workers/gaWorker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;
    worker.onmessage = (e: MessageEvent<GAUpdate>) => {
      const u = e.data;
      if (u.type === 'progress') {
        onGAProgress(u.generation ?? 0, u.bestFitness ?? 0, u.avgFitness ?? 0);
      } else if (u.type === 'done' && u.result) {
        onGADone({
          finalMemberOrder: u.result.finalMemberOrder,
          finalForceDensities: u.result.finalForceDensities,
          feasible: u.result.feasible,
          selfStressDim: u.result.selfStressDim,
        });
        // Stability post-check
        try {
          const state = useStore.getState();
          const active = state.members
            .filter((m) => m.type === 'strut' || m.type === 'cable')
            .map((m) => ({ id: m.id, nodeA: m.nodeA, nodeB: m.nodeB }));
          const fdArr = active.map((m) => state.forceDensities[m.id] ?? 0);
          const rep = checkStability(state.nodes, active, fdArr);
          setStability(rep);
        } catch (err) {
          console.error(err);
          setStability(null);
        }
        worker.terminate();
        workerRef.current = null;
      }
    };
    worker.postMessage(input);
  };

  const stop = () => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    stopGA();
  };

  return (
    <div className="section">
      <div className="section-title">GA パラメータ</div>
      <div className="grid grid-cols-2 gap-2">
        <Field
          label="世代数"
          value={gaConfig.generations}
          onChange={(v) => setGAConfig({ generations: v })}
          min={10}
          step={10}
        />
        <Field
          label="個体数"
          value={gaConfig.populationSize}
          onChange={(v) => setGAConfig({ populationSize: v })}
          min={5}
          step={5}
        />
        <Field
          label="突然変異率"
          value={gaConfig.mutationRate}
          onChange={(v) => setGAConfig({ mutationRate: v })}
          min={0}
          max={1}
          step={0.01}
          float
        />
        <Field
          label="交叉率"
          value={gaConfig.crossoverRate}
          onChange={(v) => setGAConfig({ crossoverRate: v })}
          min={0}
          max={1}
          step={0.05}
          float
        />
      </div>
      <div className="flex gap-1 mt-3">
        {!gaRun.running ? (
          <button
            className="btn btn-primary flex-1"
            disabled={!canRun}
            onClick={start}
          >
            ▶ 実行
          </button>
        ) : (
          <button className="btn btn-danger flex-1" onClick={stop}>
            ■ 停止
          </button>
        )}
        <button className="btn" onClick={resetGAResult}>
          Reset
        </button>
      </div>
      {gaRun.running && (
        <div className="text-[10px] text-slate-400 mt-2 font-mono">
          gen {gaRun.generation} / {gaConfig.generations} · best{' '}
          {Number.isFinite(gaRun.bestFitness) ? gaRun.bestFitness.toFixed(2) : '–'}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  min,
  max,
  step,
  float,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  float?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="label">{label}</span>
      <input
        className="field"
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) =>
          onChange(float ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0)
        }
      />
    </label>
  );
}
