export type Vec3 = [number, number, number];

export interface Node {
  id: string;
  position: Vec3;
}

export type MemberType = 'strut' | 'cable' | 'candidate' | 'removed';

export interface Member {
  id: string;
  nodeA: string;
  nodeB: string;
  type: MemberType;
  forceDensity?: number;
}

export interface TensegrityState {
  nodes: Node[];
  members: Member[];
  selfStressVector: number[];
  isStable: boolean | null;
}

export interface GAConfig {
  generations: number;
  populationSize: number;
  mutationRate: number;
  crossoverRate: number;
}

export interface GAProgress {
  generation: number;
  bestFitness: number;
  avgFitness: number;
  bestChromosome: number[]; // 0/1 on candidate members
}

export interface GAResult {
  bestFitness: number[]; // per generation
  avgFitness: number[];
  finalChromosome: number[];
  finalForceDensities: number[]; // aligned with active members in final topology
  finalMemberOrder: { id: string; type: 'strut' | 'cable' }[];
  converged: boolean;
  feasible: boolean;
  selfStressDim: number;
}

export interface StabilityReport {
  infinitesimallyRigid: boolean;
  prestressStable: boolean;
  rankA: number;
  expectedRank: number;
  nullspaceDim: number;
  verdict: 'stable' | 'unstable' | 'uncertain';
}
