import type { FullReport } from '@/types/report';

export function RiskRadarLive({ report }: { report: FullReport }) {
  const l3 = report.layers.layer3;
  if (!l3) return null;

  // Extract scores from layer 3 data
  const aiRisk = l3.aiDisruptionRisk?.score ?? 5;
  const saturation = (l3.saturationScore?.percentage ?? 50) / 10;
  const platform = l3.platformDependency?.score ?? 5;
  const regulatory = l3.legalMatrix?.length ? Math.min(l3.legalMatrix.length * 2, 10) : 3;
  const decay = l3.dyingTrendSignals?.length ? Math.min(l3.dyingTrendSignals.length * 2, 10) : 3;
  const gorilla = l3.gorillaCompetitors?.length ? Math.min(l3.gorillaCompetitors.length * 2.5, 10) : 4;

  // Convert 0-10 scores to polygon coordinates (hexagonal)
  const maxR = 90;
  const toPoint = (index: number, score: number) => {
    const angle = (Math.PI / 3) * index - Math.PI / 2;
    const r = (score / 10) * maxR;
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
  };

  const scores = [aiRisk, saturation, platform, regulatory, decay, gorilla];
  const points = scores.map((s, i) => toPoint(i, s));
  const polygon = points.map(p => `${p.x},${p.y}`).join(' ');

  const labels = [
    { label: 'AI Risk', score: aiRisk },
    { label: 'Saturation', score: saturation },
    { label: 'Platform', score: platform },
    { label: 'Regulatory', score: regulatory },
    { label: 'Decay', score: decay },
    { label: 'Gorilla', score: gorilla },
  ];

  const labelPositions = [
    { x: 0, y: -100, anchor: 'middle' },
    { x: 95, y: -45, anchor: 'start' },
    { x: 95, y: 50, anchor: 'start' },
    { x: 0, y: 108, anchor: 'middle' },
    { x: -95, y: 50, anchor: 'end' },
    { x: -95, y: -45, anchor: 'end' },
  ];

  return (
    <div className="mb-7">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-[30px] h-[30px] rounded-lg bg-accent-3/10 flex items-center justify-center text-[14px]">📡</div>
        <h2 className="text-[15px] font-medium">Risk Radar — 6-Axis Threat Map</h2>
      </div>

      <div className="bg-surface border border-border rounded-[16px] p-6 flex flex-col md:flex-row gap-8 items-center">
        <svg className="shrink-0" width="220" height="220" viewBox="0 0 220 220">
          <g transform="translate(110,110)">
            {/* Grid rings */}
            {[90, 60, 30].map(r => (
              <polygon key={r}
                points={Array.from({length: 6}, (_, i) => {
                  const a = (Math.PI / 3) * i - Math.PI / 2;
                  return `${Math.cos(a)*r},${Math.sin(a)*r}`;
                }).join(' ')}
                fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"
              />
            ))}
            {/* Axis lines */}
            {Array.from({length: 3}, (_, i) => {
              const a1 = (Math.PI/3)*i - Math.PI/2;
              const a2 = a1 + Math.PI;
              return <line key={i} x1={Math.cos(a1)*90} y1={Math.sin(a1)*90} x2={Math.cos(a2)*90} y2={Math.sin(a2)*90} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>;
            })}
            {/* Data polygon */}
            <polygon points={polygon} fill="rgba(200,242,100,0.08)" stroke="#C8F264" strokeWidth="1.5" />
            {/* Data points */}
            {points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={['#C8F264','#F4C84A','#FF4A6B','#4AF4B8','#7C6FFF','#FF6B4A'][i]} />
            ))}
            {/* Labels */}
            {labels.map((l, i) => (
              <text key={i} x={labelPositions[i].x} y={labelPositions[i].y}
                textAnchor={labelPositions[i].anchor as any}
                className="fill-muted text-[9px] font-mono">
                {l.label} ({l.score.toFixed(0)})
              </text>
            ))}
          </g>
        </svg>

        <div className="flex-1 space-y-2">
          {labels.map((l, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: ['#C8F264','#F4C84A','#FF4A6B','#4AF4B8','#7C6FFF','#FF6B4A'][i] }} />
              <span className="text-[12px] text-muted-2 flex-1">{l.label}</span>
              <span className="font-mono text-[12px] text-text">{l.score.toFixed(1)}/10</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
