import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useRef } from 'react';
import { useStore } from '../store';
import { downloadText } from '../core/export';

export default function ConvergenceChart() {
  const history = useStore((s) => s.gaRun.history);
  const containerRef = useRef<HTMLDivElement>(null);

  const savePng = () => {
    const svg = containerRef.current?.querySelector('svg');
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const svgBlob = new Blob([source], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = svg.clientWidth * 2;
      canvas.height = svg.clientHeight * 2;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#121826';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'convergence.png';
        a.click();
      });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const csv = () => {
    const rows = ['generation,best,avg', ...history.map((h) => `${h.gen},${h.best},${h.avg}`)].join('\n');
    downloadText('convergence.csv', rows, 'text/csv');
  };

  return (
    <div className="section">
      <div className="section-title">
        収束グラフ
        <span className="ml-auto flex gap-1">
          <button className="btn text-[10px] py-0.5 px-1" onClick={savePng} disabled={history.length === 0}>
            PNG
          </button>
          <button className="btn text-[10px] py-0.5 px-1" onClick={csv} disabled={history.length === 0}>
            CSV
          </button>
        </span>
      </div>
      <div ref={containerRef} className="h-36 w-full">
        {history.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[11px] text-slate-500">
            GA 未実行
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis dataKey="gen" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip
                contentStyle={{
                  background: '#0b0f17',
                  border: '1px solid #2a3447',
                  fontSize: 11,
                }}
              />
              <Line
                type="monotone"
                dataKey="best"
                stroke="#6ee7ff"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="avg"
                stroke="#475569"
                strokeWidth={1}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
