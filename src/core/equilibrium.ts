import { Matrix, nullspace, rank } from './linalg';
import type { Node, Member } from '../types';

/**
 * Build the equilibrium matrix A (3|V| x |E|) based on the Force Density
 * formulation. Each column corresponds to a member; each triplet of rows
 * corresponds to the x, y, z equilibrium of a single node.
 *
 *   A[3i + k, e] = (x_k(i) - x_k(j)) / L_ij     for member e = (i,j), node i
 *   A[3j + k, e] = (x_k(j) - x_k(i)) / L_ij     for node j
 *
 * The self-stress w satisfies A w = 0.
 */
export function buildEquilibriumMatrix(
  nodes: Node[],
  members: Member[]
): { A: Matrix; nodeIndex: Map<string, number>; lengths: number[] } {
  const nodeIndex = new Map<string, number>();
  nodes.forEach((n, i) => nodeIndex.set(n.id, i));

  const rows = 3 * nodes.length;
  const cols = members.length;
  const A = Matrix.zeros(rows, cols);
  const lengths: number[] = new Array(cols).fill(0);

  for (let e = 0; e < members.length; e++) {
    const m = members[e];
    const i = nodeIndex.get(m.nodeA);
    const j = nodeIndex.get(m.nodeB);
    if (i === undefined || j === undefined) continue;
    const pi = nodes[i].position;
    const pj = nodes[j].position;
    const dx = pi[0] - pj[0];
    const dy = pi[1] - pj[1];
    const dz = pi[2] - pj[2];
    const L = Math.hypot(dx, dy, dz);
    lengths[e] = L;
    if (L < 1e-12) continue;
    A.set(3 * i + 0, e, dx / L);
    A.set(3 * i + 1, e, dy / L);
    A.set(3 * i + 2, e, dz / L);
    A.set(3 * j + 0, e, -dx / L);
    A.set(3 * j + 1, e, -dy / L);
    A.set(3 * j + 2, e, -dz / L);
  }

  return { A, nodeIndex, lengths };
}

/**
 * Find a self-stress vector w (length |E|) for the given members such that:
 *   - struts have negative q (compression)
 *   - cables have positive q (tension)
 *
 * Strategy:
 *   1. Compute the null space of A.
 *   2. If dim=1, return the unique vector (sign-adjusted).
 *   3. If dim>1, try to find a linear combination that satisfies the sign
 *      constraints via a small LP-like least-squares heuristic on the basis.
 *   4. If none can be found, return the first basis vector with a feasibility
 *      flag of false.
 */
export function findSelfStress(
  nodes: Node[],
  members: { id: string; nodeA: string; nodeB: string; sign: 1 | -1 }[]
): { w: number[]; feasible: boolean; nullspaceDim: number } {
  if (members.length === 0) {
    return { w: [], feasible: false, nullspaceDim: 0 };
  }
  const memberObjs = members.map((m) => ({
    id: m.id,
    nodeA: m.nodeA,
    nodeB: m.nodeB,
    type: 'candidate' as const,
  }));
  const { A } = buildEquilibriumMatrix(nodes, memberObjs);
  const ns = nullspace(A);
  const dim = ns.length;
  if (dim === 0) {
    return { w: new Array(members.length).fill(0), feasible: false, nullspaceDim: 0 };
  }

  const signs = members.map((m) => m.sign);

  // Try each basis vector first (and its negation)
  const tryVector = (v: number[]): number[] | null => {
    const tol = 1e-6;
    let ok = true;
    for (let i = 0; i < v.length; i++) {
      if (signs[i] === 1 && v[i] < -tol) {
        ok = false;
        break;
      }
      if (signs[i] === -1 && v[i] > tol) {
        ok = false;
        break;
      }
      if (Math.abs(v[i]) < tol && false) {
        // allow zeros
      }
    }
    if (ok) return v;
    return null;
  };

  for (const basis of ns) {
    const pos = basis.slice();
    const neg = basis.map((x) => -x);
    const t1 = tryVector(pos);
    if (t1) return { w: normalize(t1), feasible: true, nullspaceDim: dim };
    const t2 = tryVector(neg);
    if (t2) return { w: normalize(t2), feasible: true, nullspaceDim: dim };
  }

  if (dim > 1) {
    // Random combinations in the null space looking for a feasible one.
    for (let tries = 0; tries < 200; tries++) {
      const coeffs = ns.map(() => Math.random() * 2 - 1);
      const combo = combineBasis(ns, coeffs);
      let feas = tryVector(combo);
      if (!feas) feas = tryVector(combo.map((x) => -x));
      if (feas) return { w: normalize(feas), feasible: true, nullspaceDim: dim };
    }
  }

  // No feasible combination — return the first basis for reference.
  return { w: normalize(ns[0]), feasible: false, nullspaceDim: dim };
}

function combineBasis(basis: number[][], coeffs: number[]): number[] {
  const len = basis[0].length;
  const out = new Array(len).fill(0);
  for (let i = 0; i < basis.length; i++) {
    for (let j = 0; j < len; j++) out[j] += coeffs[i] * basis[i][j];
  }
  return out;
}

function normalize(v: number[]): number[] {
  const m = Math.max(...v.map((x) => Math.abs(x)));
  if (m < 1e-12) return v.slice();
  return v.map((x) => x / m);
}

export { rank };
