import type { Node, Member } from '../types';

export interface Snapshot {
  version: 1;
  nodes: Node[];
  members: Member[];
}

export function toJSON(nodes: Node[], members: Member[]): string {
  const snap: Snapshot = { version: 1, nodes, members };
  return JSON.stringify(snap, null, 2);
}

export function fromJSON(text: string): Snapshot {
  const obj = JSON.parse(text);
  if (!obj || obj.version !== 1 || !Array.isArray(obj.nodes) || !Array.isArray(obj.members)) {
    throw new Error('Invalid TensegrityLab JSON');
  }
  return obj as Snapshot;
}

/**
 * Export members as a line-only Wavefront OBJ. Each member becomes an `l`
 * segment between the two node vertices.
 */
export function toOBJ(nodes: Node[], members: Member[]): string {
  const lines: string[] = ['# TensegrityLab export'];
  const idx = new Map<string, number>();
  nodes.forEach((n, i) => {
    idx.set(n.id, i + 1); // OBJ is 1-indexed
    lines.push(`v ${n.position[0].toFixed(6)} ${n.position[1].toFixed(6)} ${n.position[2].toFixed(6)}`);
  });
  for (const m of members) {
    if (m.type === 'removed') continue;
    const a = idx.get(m.nodeA);
    const b = idx.get(m.nodeB);
    if (a && b) lines.push(`l ${a} ${b}`);
  }
  return lines.join('\n');
}

export function downloadText(filename: string, text: string, mime = 'text/plain'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
