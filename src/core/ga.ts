import type { Node, GAConfig } from '../types';
import { findSelfStress } from './equilibrium';

export interface GAInput {
  nodes: Node[];
  strutIds: string[];           // member IDs classified as struts
  candidateIds: string[];       // member IDs that are cable candidates (0/1 chromosome)
  memberDefs: {                  // all members of the ground structure
    id: string;
    nodeA: string;
    nodeB: string;
  }[];
  config: GAConfig;
  // Class 1 check: penalize strut-sharing-node configurations
  enforceClass1: boolean;
}

export interface GAUpdate {
  type: 'progress' | 'done';
  generation?: number;
  bestFitness?: number;
  avgFitness?: number;
  bestChromosome?: number[];
  result?: {
    bestChromosome: number[];
    bestFitnessHistory: number[];
    avgFitnessHistory: number[];
    finalForceDensities: number[];
    finalMemberOrder: { id: string; type: 'strut' | 'cable' }[];
    feasible: boolean;
    selfStressDim: number;
  };
}

/**
 * Evaluate fitness for a chromosome. Higher is better.
 *
 *   fitness =
 *     1000 * feasibility
 *   +  100 * selfStressDimReward
 *   +   50 * discontinuityScore
 *   +    5 * (1 / max(numCables, 1))           // prefer fewer cables
 *   -  penalty * violationCount
 */
function evaluate(
  chromosome: number[],
  input: GAInput
): { fitness: number; feasible: boolean; w: number[]; selfStressDim: number } {
  const { nodes, strutIds, candidateIds, memberDefs } = input;
  const byId = new Map(memberDefs.map((m) => [m.id, m]));

  const activeCables: { id: string; nodeA: string; nodeB: string; sign: 1 }[] = [];
  for (let i = 0; i < candidateIds.length; i++) {
    if (chromosome[i] === 1) {
      const m = byId.get(candidateIds[i])!;
      activeCables.push({ id: m.id, nodeA: m.nodeA, nodeB: m.nodeB, sign: 1 });
    }
  }
  const activeStruts = strutIds.map((id) => {
    const m = byId.get(id)!;
    return { id: m.id, nodeA: m.nodeA, nodeB: m.nodeB, sign: -1 as const };
  });
  const active = [...activeStruts, ...activeCables];
  const numCables = activeCables.length;

  if (active.length === 0 || numCables === 0) {
    return { fitness: -1e6, feasible: false, w: [], selfStressDim: 0 };
  }

  // Every node must be touched by at least one active member
  const touched = new Set<string>();
  for (const m of active) {
    touched.add(m.nodeA);
    touched.add(m.nodeB);
  }
  let unconnectedPenalty = 0;
  for (const n of nodes) if (!touched.has(n.id)) unconnectedPenalty += 200;

  const { w, feasible, nullspaceDim } = findSelfStress(nodes, active);

  let discontinuityScore = 0;
  if (input.enforceClass1) {
    // Count how many nodes have more than one strut (violation)
    const strutCountAtNode = new Map<string, number>();
    for (const s of activeStruts) {
      strutCountAtNode.set(s.nodeA, (strutCountAtNode.get(s.nodeA) ?? 0) + 1);
      strutCountAtNode.set(s.nodeB, (strutCountAtNode.get(s.nodeB) ?? 0) + 1);
    }
    let violations = 0;
    for (const c of strutCountAtNode.values()) {
      if (c > 1) violations += c - 1;
    }
    discontinuityScore = violations === 0 ? 1 : 0;
    unconnectedPenalty += violations * 50;
  } else {
    discontinuityScore = 0.5;
  }

  // Prefer single-dim self-stress (cleaner design)
  const dimReward = feasible ? 1 / (1 + Math.max(0, nullspaceDim - 1)) : 0;

  const fitness =
    (feasible ? 1000 : 0) +
    100 * dimReward +
    50 * discontinuityScore +
    5 * (1 / Math.max(numCables, 1)) -
    unconnectedPenalty;

  // Pad w with zeros where chromosome=0 so it's aligned with all active
  // members in [struts, cables] order.
  return { fitness, feasible, w, selfStressDim: nullspaceDim };
}

function randomChromosome(len: number, density = 0.5): number[] {
  const out = new Array(len);
  for (let i = 0; i < len; i++) out[i] = Math.random() < density ? 1 : 0;
  return out;
}

function tournamentSelect(pop: number[][], fitnesses: number[], k = 3): number[] {
  let bestIdx = -1;
  let bestFit = -Infinity;
  for (let i = 0; i < k; i++) {
    const idx = Math.floor(Math.random() * pop.length);
    if (fitnesses[idx] > bestFit) {
      bestFit = fitnesses[idx];
      bestIdx = idx;
    }
  }
  return pop[bestIdx].slice();
}

function crossover(a: number[], b: number[]): [number[], number[]] {
  const n = a.length;
  if (n < 2) return [a.slice(), b.slice()];
  const pt = 1 + Math.floor(Math.random() * (n - 1));
  const c1 = a.slice(0, pt).concat(b.slice(pt));
  const c2 = b.slice(0, pt).concat(a.slice(pt));
  return [c1, c2];
}

function mutate(chrom: number[], rate: number): void {
  for (let i = 0; i < chrom.length; i++) {
    if (Math.random() < rate) chrom[i] ^= 1;
  }
}

export type GAEmit = (u: GAUpdate) => void;

export async function runGA(
  input: GAInput,
  emit: GAEmit,
  shouldStop: () => boolean
): Promise<void> {
  const len = input.candidateIds.length;
  const { populationSize, generations, mutationRate, crossoverRate } = input.config;

  if (len === 0) {
    emit({ type: 'done', result: emptyResult(input) });
    return;
  }

  // Initialize population
  let pop: number[][] = [];
  for (let i = 0; i < populationSize; i++) {
    // initial density proportional to expected cables (heuristic)
    pop.push(randomChromosome(len, 0.4));
  }

  let bestHistory: number[] = [];
  let avgHistory: number[] = [];
  let bestEver: { chrom: number[]; fit: number; w: number[]; feasible: boolean; dim: number } = {
    chrom: pop[0].slice(),
    fit: -Infinity,
    w: [],
    feasible: false,
    dim: 0,
  };

  for (let gen = 0; gen < generations; gen++) {
    if (shouldStop()) break;
    const evals = pop.map((c) => evaluate(c, input));
    const fits = evals.map((e) => e.fitness);
    const best = Math.max(...fits);
    const avg = fits.reduce((a, b) => a + b, 0) / fits.length;
    const bestIdx = fits.indexOf(best);
    if (best > bestEver.fit) {
      bestEver = {
        chrom: pop[bestIdx].slice(),
        fit: best,
        w: evals[bestIdx].w,
        feasible: evals[bestIdx].feasible,
        dim: evals[bestIdx].selfStressDim,
      };
    }
    bestHistory.push(bestEver.fit);
    avgHistory.push(avg);

    emit({
      type: 'progress',
      generation: gen,
      bestFitness: bestEver.fit,
      avgFitness: avg,
      bestChromosome: bestEver.chrom.slice(),
    });

    // Yield to the event loop so postMessage gets flushed
    if (gen % 5 === 0) await new Promise((r) => setTimeout(r, 0));

    // Next generation
    const nextPop: number[][] = [];
    // Elitism
    nextPop.push(bestEver.chrom.slice());
    while (nextPop.length < populationSize) {
      const p1 = tournamentSelect(pop, fits);
      const p2 = tournamentSelect(pop, fits);
      let c1: number[], c2: number[];
      if (Math.random() < crossoverRate) {
        [c1, c2] = crossover(p1, p2);
      } else {
        c1 = p1;
        c2 = p2;
      }
      mutate(c1, mutationRate);
      mutate(c2, mutationRate);
      nextPop.push(c1);
      if (nextPop.length < populationSize) nextPop.push(c2);
    }
    pop = nextPop;
  }

  // Build result
  const finalMemberOrder: { id: string; type: 'strut' | 'cable' }[] = [];
  for (const id of input.strutIds) finalMemberOrder.push({ id, type: 'strut' });
  const cableIdsActive: string[] = [];
  for (let i = 0; i < input.candidateIds.length; i++) {
    if (bestEver.chrom[i] === 1) {
      finalMemberOrder.push({ id: input.candidateIds[i], type: 'cable' });
      cableIdsActive.push(input.candidateIds[i]);
    }
  }

  const finalForceDensities = bestEver.w;

  emit({
    type: 'done',
    result: {
      bestChromosome: bestEver.chrom,
      bestFitnessHistory: bestHistory,
      avgFitnessHistory: avgHistory,
      finalForceDensities,
      finalMemberOrder,
      feasible: bestEver.feasible,
      selfStressDim: bestEver.dim,
    },
  });
}

function emptyResult(_input: GAInput): GAUpdate['result'] {
  return {
    bestChromosome: [],
    bestFitnessHistory: [],
    avgFitnessHistory: [],
    finalForceDensities: [],
    finalMemberOrder: [],
    feasible: false,
    selfStressDim: 0,
  };
}
