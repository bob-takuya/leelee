import { create } from 'zustand';
import type { Node, Member, GAConfig, Vec3, StabilityReport } from './types';
import { PRESETS } from './core/presets';

export type Step = 'place' | 'strut' | 'optimize' | 'result';

export interface GARun {
  running: boolean;
  generation: number;
  bestFitness: number;
  history: { gen: number; best: number; avg: number }[];
  feasible: boolean;
  selfStressDim: number;
}

interface HistorySnapshot {
  nodes: Node[];
  members: Member[];
}

interface Store {
  nodes: Node[];
  members: Member[];
  step: Step;
  hoveredMemberId: string | null;
  selectedNodeId: string | null;
  enforceClass1: boolean;
  gaConfig: GAConfig;
  gaRun: GARun;
  stability: StabilityReport | null;
  forceDensities: Record<string, number>; // by member id
  selfStressDim: number;
  thicknessScale: boolean;

  // history (undo/redo)
  past: HistorySnapshot[];
  future: HistorySnapshot[];

  // actions
  setStep: (s: Step) => void;
  addNodeAt: (pos: Vec3) => void;
  moveNode: (id: string, pos: Vec3) => void;
  deleteNode: (id: string) => void;
  clearAll: () => void;
  loadPreset: (id: string, param?: number) => void;
  toggleStrut: (memberId: string) => void;
  clearStruts: () => void;
  setHoveredMember: (id: string | null) => void;
  setSelectedNode: (id: string | null) => void;
  setEnforceClass1: (v: boolean) => void;
  setGAConfig: (c: Partial<GAConfig>) => void;
  setThicknessScale: (v: boolean) => void;

  // GA lifecycle
  startGA: () => void;
  stopGA: () => void;
  resetGAResult: () => void;
  onGAProgress: (g: number, best: number, avg: number) => void;
  onGADone: (r: {
    finalMemberOrder: { id: string; type: 'strut' | 'cable' }[];
    finalForceDensities: number[];
    feasible: boolean;
    selfStressDim: number;
  }) => void;

  setStability: (r: StabilityReport | null) => void;

  // history
  undo: () => void;
  redo: () => void;
  loadSnapshot: (s: HistorySnapshot) => void;
}

let nodeCounter = 0;
function nextNodeId(existing: Node[]): string {
  const used = new Set(existing.map((n) => n.id));
  while (used.has(`n${nodeCounter}`)) nodeCounter++;
  const id = `n${nodeCounter}`;
  nodeCounter++;
  return id;
}

function memberId(a: string, b: string): string {
  const [x, y] = a < b ? [a, b] : [b, a];
  return `${x}__${y}`;
}

function rebuildGroundStructure(
  nodes: Node[],
  priorMembers: Member[]
): Member[] {
  const priorById = new Map(priorMembers.map((m) => [m.id, m]));
  const result: Member[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const id = memberId(nodes[i].id, nodes[j].id);
      const prior = priorById.get(id);
      result.push({
        id,
        nodeA: nodes[i].id,
        nodeB: nodes[j].id,
        // Keep prior strut classification if present; otherwise candidate.
        type: prior?.type === 'strut' ? 'strut' : 'candidate',
        forceDensity: undefined,
      });
    }
  }
  return result;
}

const defaultGAConfig: GAConfig = {
  generations: 200,
  populationSize: 50,
  mutationRate: 0.02,
  crossoverRate: 0.8,
};

const MAX_HISTORY = 20;

export const useStore = create<Store>((set, get) => ({
  nodes: [],
  members: [],
  step: 'place',
  hoveredMemberId: null,
  selectedNodeId: null,
  enforceClass1: true,
  gaConfig: { ...defaultGAConfig },
  gaRun: {
    running: false,
    generation: 0,
    bestFitness: -Infinity,
    history: [],
    feasible: false,
    selfStressDim: 0,
  },
  stability: null,
  forceDensities: {},
  selfStressDim: 0,
  thicknessScale: true,
  past: [],
  future: [],

  setStep: (s) => set({ step: s }),

  addNodeAt: (pos) => {
    const { nodes, members } = get();
    pushHistory(set, get);
    const id = nextNodeId(nodes);
    const newNodes = [...nodes, { id, position: pos }];
    set({
      nodes: newNodes,
      members: rebuildGroundStructure(newNodes, members),
    });
  },

  moveNode: (id, pos) => {
    const { nodes } = get();
    pushHistory(set, get);
    set({
      nodes: nodes.map((n) => (n.id === id ? { ...n, position: pos } : n)),
    });
  },

  deleteNode: (id) => {
    const { nodes, members } = get();
    pushHistory(set, get);
    const newNodes = nodes.filter((n) => n.id !== id);
    set({
      nodes: newNodes,
      members: rebuildGroundStructure(newNodes, members).filter(
        (m) => m.nodeA !== id && m.nodeB !== id
      ),
    });
  },

  clearAll: () => {
    pushHistory(set, get);
    set({
      nodes: [],
      members: [],
      forceDensities: {},
      stability: null,
      selfStressDim: 0,
      gaRun: {
        running: false,
        generation: 0,
        bestFitness: -Infinity,
        history: [],
        feasible: false,
        selfStressDim: 0,
      },
    });
  },

  loadPreset: (id, param) => {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    pushHistory(set, get);
    const { nodes: nodesRaw, suggestedStruts } = preset.build(param);
    // Re-assign IDs to avoid conflicts with nodeCounter.
    const nodes: Node[] = nodesRaw.map((n, i) => ({
      id: `n${i}`,
      position: n.position,
    }));
    nodeCounter = nodes.length;
    const members = rebuildGroundStructure(nodes, []);
    if (suggestedStruts) {
      for (const [i, j] of suggestedStruts) {
        const a = nodes[i]?.id;
        const b = nodes[j]?.id;
        if (!a || !b) continue;
        const mid = memberId(a, b);
        const m = members.find((x) => x.id === mid);
        if (m) m.type = 'strut';
      }
    }
    set({
      nodes,
      members,
      forceDensities: {},
      stability: null,
      selfStressDim: 0,
      step: suggestedStruts ? 'strut' : 'place',
    });
  },

  toggleStrut: (memberId) => {
    const { members } = get();
    pushHistory(set, get);
    set({
      members: members.map((m) =>
        m.id === memberId
          ? { ...m, type: m.type === 'strut' ? 'candidate' : 'strut' }
          : m
      ),
    });
  },

  clearStruts: () => {
    pushHistory(set, get);
    set({
      members: get().members.map((m) => ({
        ...m,
        type: m.type === 'strut' ? 'candidate' : m.type,
      })),
    });
  },

  setHoveredMember: (id) => set({ hoveredMemberId: id }),
  setSelectedNode: (id) => set({ selectedNodeId: id }),
  setEnforceClass1: (v) => set({ enforceClass1: v }),
  setGAConfig: (c) => set({ gaConfig: { ...get().gaConfig, ...c } }),
  setThicknessScale: (v) => set({ thicknessScale: v }),

  startGA: () =>
    set({
      gaRun: {
        running: true,
        generation: 0,
        bestFitness: -Infinity,
        history: [],
        feasible: false,
        selfStressDim: 0,
      },
      step: 'optimize',
    }),

  stopGA: () =>
    set({ gaRun: { ...get().gaRun, running: false } }),

  resetGAResult: () =>
    set({
      gaRun: {
        running: false,
        generation: 0,
        bestFitness: -Infinity,
        history: [],
        feasible: false,
        selfStressDim: 0,
      },
      forceDensities: {},
      stability: null,
      selfStressDim: 0,
      members: get().members.map((m) => ({
        ...m,
        type: m.type === 'cable' || m.type === 'removed' ? 'candidate' : m.type,
        forceDensity: undefined,
      })),
    }),

  onGAProgress: (gen, best, avg) => {
    const { gaRun } = get();
    set({
      gaRun: {
        ...gaRun,
        generation: gen,
        bestFitness: best,
        history: [...gaRun.history, { gen, best, avg }],
      },
    });
  },

  onGADone: (r) => {
    const { members } = get();
    const activeIds = new Set(r.finalMemberOrder.map((x) => x.id));
    const typeById = new Map(r.finalMemberOrder.map((x) => [x.id, x.type]));
    const fd: Record<string, number> = {};
    r.finalMemberOrder.forEach((m, i) => {
      fd[m.id] = r.finalForceDensities[i] ?? 0;
    });
    set({
      members: members.map((m) => {
        if (activeIds.has(m.id)) {
          const t = typeById.get(m.id)!;
          return { ...m, type: t, forceDensity: fd[m.id] };
        }
        // member was a strut but somehow not in order: keep it
        if (m.type === 'strut') return { ...m, forceDensity: fd[m.id] };
        return { ...m, type: 'removed', forceDensity: undefined };
      }),
      forceDensities: fd,
      selfStressDim: r.selfStressDim,
      gaRun: { ...get().gaRun, running: false, feasible: r.feasible, selfStressDim: r.selfStressDim },
      step: 'result',
    });
  },

  setStability: (r) => set({ stability: r }),

  undo: () => {
    const { past, future, nodes, members } = get();
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    set({
      past: past.slice(0, -1),
      future: [{ nodes, members }, ...future].slice(0, MAX_HISTORY),
      nodes: prev.nodes,
      members: prev.members,
    });
  },

  redo: () => {
    const { past, future, nodes, members } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      past: [...past, { nodes, members }].slice(-MAX_HISTORY),
      future: future.slice(1),
      nodes: next.nodes,
      members: next.members,
    });
  },

  loadSnapshot: (s) => {
    pushHistory(set, get);
    const maxId = s.nodes.reduce(
      (m, n) => Math.max(m, parseInt(n.id.replace(/[^0-9]/g, ''), 10) || 0),
      0
    );
    nodeCounter = maxId + 1;
    set({
      nodes: s.nodes,
      members: s.members,
      forceDensities: {},
      stability: null,
      selfStressDim: 0,
    });
  },
}));

function pushHistory(_set: unknown, _get: unknown): void {
  const { past, nodes, members } = useStore.getState();
  useStore.setState({
    past: [...past, { nodes, members }].slice(-MAX_HISTORY),
    future: [],
  });
}
