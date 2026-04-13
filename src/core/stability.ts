import { Matrix, nullspace, rank, smallestEigenvalue } from './linalg';
import type { Node } from '../types';
import { buildEquilibriumMatrix } from './equilibrium';
import type { StabilityReport } from '../types';

/**
 * Infinitesimal rigidity:
 *   rank(A) = 3|V| - 6     (3D, free of rigid-body motion)
 *
 * Prestress stability:
 *   The quadratic form of the tangent stiffness restricted to the space of
 *   inextensional mechanisms is positive. We approximate this by checking
 *   the smallest eigenvalue of the geometric stiffness
 *     K_G = sum_e q_e * b_e * b_e^T / L_e
 *   projected onto the mechanism subspace (the null space of the rigidity
 *   matrix orthogonal to rigid body motions).
 *
 * For simplicity we compute K_G in full 3|V| space and check the sign of
 * eigenvalues after removing rigid-body modes via projection on the
 * mechanism subspace.
 */
export function checkStability(
  nodes: Node[],
  activeMembers: { id: string; nodeA: string; nodeB: string }[],
  forceDensities: number[]
): StabilityReport {
  const memberObjs = activeMembers.map((m) => ({
    id: m.id,
    nodeA: m.nodeA,
    nodeB: m.nodeB,
    type: 'candidate' as const,
  }));
  const { A, nodeIndex, lengths } = buildEquilibriumMatrix(nodes, memberObjs);
  const n3 = 3 * nodes.length;
  const rA = rank(A);
  const expected = Math.max(0, n3 - 6);
  const infRigid = rA >= expected;

  // Geometric stiffness (n3 x n3)
  const KG = Matrix.zeros(n3, n3);
  for (let e = 0; e < activeMembers.length; e++) {
    const m = activeMembers[e];
    const i = nodeIndex.get(m.nodeA)!;
    const j = nodeIndex.get(m.nodeB)!;
    const q = forceDensities[e] ?? 0;
    const L = lengths[e];
    if (L < 1e-12) continue;
    // Block: q * [[I, -I], [-I, I]] (with each I being 3x3)
    // This matches the force-density "branch" stiffness contribution.
    for (let k = 0; k < 3; k++) {
      const ii = 3 * i + k;
      const jj = 3 * j + k;
      KG.set(ii, ii, KG.get(ii, ii) + q);
      KG.set(jj, jj, KG.get(jj, jj) + q);
      KG.set(ii, jj, KG.get(ii, jj) - q);
      KG.set(jj, ii, KG.get(jj, ii) - q);
    }
  }

  // Mechanism subspace: null space of A^T (size n3) excluding 6 rigid body modes.
  // We take the null space of A^T (note: A is the equilibrium matrix, which
  // equals the rigidity matrix transposed up to scaling). Here our A has
  // rows = 3|V|, cols = |E|, and left null space = null(A^T) are the
  // "incompatible load" modes. The mechanism modes are null(A_rig) where
  // A_rig is |E| x 3|V|, i.e. our A transposed.
  const Arig = A.transpose();
  const mechs = nullspace(Arig); // vectors in R^{3|V|}

  // Remove rigid-body modes by Gram-Schmidt against a canonical RB basis.
  const rbBasis = rigidBodyBasis(nodes);
  const orth = orthogonalize(mechs, rbBasis);

  let prestressStable = true;
  if (orth.length > 0) {
    // Build M = Y^T * KG * Y, check min eigenvalue > 0
    const Y = Matrix.from1DArray(n3, orth.length, flatColumns(orth));
    const YtKGY = Y.transpose().mmul(KG).mmul(Y);
    // Symmetrize
    const Sym = YtKGY.add(YtKGY.transpose()).mul(0.5);
    const lam = smallestEigenvalue(Sym);
    prestressStable = lam > -1e-8;
  }

  let verdict: 'stable' | 'unstable' | 'uncertain' = 'uncertain';
  if (infRigid && prestressStable) verdict = 'stable';
  else if (!infRigid && !prestressStable) verdict = 'unstable';
  else verdict = 'uncertain';

  return {
    infinitesimallyRigid: infRigid,
    prestressStable,
    rankA: rA,
    expectedRank: expected,
    nullspaceDim: nullspace(A).length,
    verdict,
  };
}

function rigidBodyBasis(nodes: Node[]): number[][] {
  const n = nodes.length;
  const n3 = 3 * n;
  const basis: number[][] = [];
  // Translations
  for (let k = 0; k < 3; k++) {
    const v = new Array(n3).fill(0);
    for (let i = 0; i < n; i++) v[3 * i + k] = 1;
    basis.push(v);
  }
  // Rotations (cross products e_k x r_i)
  for (let k = 0; k < 3; k++) {
    const v = new Array(n3).fill(0);
    for (let i = 0; i < n; i++) {
      const r = nodes[i].position;
      // e_k x r
      const ex = k === 0 ? 1 : 0;
      const ey = k === 1 ? 1 : 0;
      const ez = k === 2 ? 1 : 0;
      v[3 * i + 0] = ey * r[2] - ez * r[1];
      v[3 * i + 1] = ez * r[0] - ex * r[2];
      v[3 * i + 2] = ex * r[1] - ey * r[0];
    }
    basis.push(v);
  }
  return basis;
}

function orthogonalize(vectors: number[][], against: number[][]): number[][] {
  // Orthonormalize `against` first
  const antiBasis = gramSchmidt(against);
  const result: number[][] = [];
  for (const v0 of vectors) {
    let v = v0.slice();
    for (const u of antiBasis) {
      const coeff = dot(v, u);
      for (let i = 0; i < v.length; i++) v[i] -= coeff * u[i];
    }
    // Orthogonalize against already-accepted
    for (const u of result) {
      const coeff = dot(v, u);
      for (let i = 0; i < v.length; i++) v[i] -= coeff * u[i];
    }
    const nrm = Math.sqrt(dot(v, v));
    if (nrm > 1e-8) {
      for (let i = 0; i < v.length; i++) v[i] /= nrm;
      result.push(v);
    }
  }
  return result;
}

function gramSchmidt(vectors: number[][]): number[][] {
  const result: number[][] = [];
  for (const v0 of vectors) {
    let v = v0.slice();
    for (const u of result) {
      const coeff = dot(v, u);
      for (let i = 0; i < v.length; i++) v[i] -= coeff * u[i];
    }
    const nrm = Math.sqrt(dot(v, v));
    if (nrm > 1e-8) {
      for (let i = 0; i < v.length; i++) v[i] /= nrm;
      result.push(v);
    }
  }
  return result;
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function flatColumns(cols: number[][]): number[] {
  // Matrix.from1DArray expects row-major; convert column-major cols into
  // row-major [rows x cols].
  const rows = cols[0].length;
  const c = cols.length;
  const out = new Array(rows * c).fill(0);
  for (let r = 0; r < rows; r++) {
    for (let j = 0; j < c; j++) {
      out[r * c + j] = cols[j][r];
    }
  }
  return out;
}
