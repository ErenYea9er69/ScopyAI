export function SocialProof() {
  const items = [
    { text: "12,847 reports generated", color: "bg-accent-4" },
    { text: "340 niches analysed today", color: "bg-accent" },
    { text: "Used by founders in 48 countries", color: "bg-accent-2" },
    { text: "96% user satisfaction", color: "bg-accent-5" },
    { text: "Avg. 18 min saved per research cycle", color: "bg-accent-3" },
  ];

  // Double the items to allow infinite scroll
  const doubledItems = [...items, ...items];

  return (
    <div className="overflow-hidden border-y border-border py-2.5 mb-10 w-full relative">
      <div className="flex gap-12 animate-[ticker_20s_linear_infinite] whitespace-nowrap min-w-max">
        {doubledItems.map((item, i) => (
          <span key={i} className="font-mono text-[12px] text-muted flex items-center gap-2">
            <span className={`w-[5px] h-[5px] rounded-full ${item.color}`}></span>
            {item.text}
          </span>
        ))}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-50% - 24px)); }
        }
      `}} />
    </div>
  );
}
