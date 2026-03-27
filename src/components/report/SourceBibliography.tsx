import type { FullReport } from '@/types/report';

export function SourceBibliography({ report }: { report: FullReport }) {
  if (!report.sources.length) return null;

  const grouped = {
    high: report.sources.filter(s => s.confidence === 'high'),
    medium: report.sources.filter(s => s.confidence === 'medium'),
    low: report.sources.filter(s => s.confidence === 'low'),
  };

  return (
    <div className="mb-7">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-[30px] h-[30px] rounded-lg bg-accent-2/10 flex items-center justify-center text-[14px]">📚</div>
        <h2 className="text-[15px] font-medium">Source Bibliography ({report.sources.length} sources)</h2>
      </div>

      <div className="bg-surface border border-border rounded-[16px] p-5 space-y-4">
        {Object.entries(grouped).map(([level, sources]) => {
          if (!sources.length) return null;
          const dotColor = level === 'high' ? 'bg-accent-4' : level === 'medium' ? 'bg-accent-5' : 'bg-brand-red';
          return (
            <div key={level}>
              <div className="text-[11px] font-mono uppercase tracking-[0.06em] text-muted mb-2 flex items-center gap-1.5">
                <span className={`w-[5px] h-[5px] rounded-full ${dotColor}`} />
                {level} confidence ({sources.length})
              </div>
              <div className="space-y-1">
                {sources.map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-[12px] text-accent-2 hover:underline truncate max-w-full"
                    title={s.title}
                  >
                    {s.title}
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
