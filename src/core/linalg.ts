import { Matrix, SingularValueDecomposition, EigenvalueDecomposition } from 'ml-matrix';

/**
 * Compute a basis for the null space of A using SVD.
 * Returns an array of column vectors (each length = A.columns).
 */
export function nullspace(A: Matrix, tol?: number): number[][] {
  if (A.rows === 0 || A.columns === 0) return [];
  const svd = new SingularValueDecomposition(A, { autoTranspose: true });
  const s = svd.diagonal;
  const V = svd.rightSingularVectors; // columns are right singular vectors
  const smax = s.length ? Math.max(...s) : 0;
  const eps = tol ?? Math.max(A.rows, A.columns) * smax * 1e-12;

  const cols: number[][] = [];
  // Any right-singular vector whose corresponding singular value is ~0
  // is in the nullspace. Also include the extra V columns beyond length(s).
  for (let i = 0; i < V.columns; i++) {
    const sv = i < s.length ? s[i] : 0;
    if (sv <= eps) {
      const col: number[] = [];
      for (let r = 0; r < V.rows; r++) col.push(V.get(r, i));
      cols.push(col);
    }
  }
  return cols;
}

/**
 * Numerical rank of A via SVD.
 */
export function rank(A: Matrix, tol?: number): number {
  if (A.rows === 0 || A.columns === 0) return 0;
  const svd = new SingularValueDecomposition(A, { autoTranspose: true });
  const s = svd.diagonal;
  const smax = s.length ? Math.max(...s) : 0;
  const eps = tol ?? Math.max(A.rows, A.columns) * smax * 1e-12;
  return s.filter((v) => v > eps).length;
}

/**
 * Smallest eigenvalue of a symmetric matrix.
 */
export function smallestEigenvalue(M: Matrix): number {
  const eig = new EigenvalueDecomposition(M, { assumeSymmetric: true });
  const reals = eig.realEigenvalues;
  return reals.length ? Math.min(...reals) : 0;
}

export { Matrix };
