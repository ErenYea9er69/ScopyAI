export function MoatGrid() {
  const moats = [
    { title: "Data advantage", desc: "Proprietary dataset built via user interaction that gets harder to clone over time." },
    { title: "Workflow deep-integration", desc: "Becoming the system-of-record vs a nice-to-have tool." },
    { title: "Network effect blueprint", desc: "Every new user adds value for every existing user." },
    { title: "Regulatory moat strategy", desc: "Using compliance as a feature to box out fast-moving startups." },
    { title: "Community moat playbook", desc: "Building a tribe around a shared belief system, not just a product." },
    { title: "Switching cost architecture", desc: "Making it technically or socially painful to leave for a cheaper clone." },
  ];

  return (
    <div className="mb-14 text-left">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[14px]">
        {moats.map((m, i) => (
          <div key={i} className="bg-surface border-l-[3px] border-l-accent rounded-r-[12px] p-4 px-5 transition-transform hover:-translate-y-0.5">
            <h4 className="text-[14px] font-medium text-text mb-1.5">{m.title}</h4>
            <p className="text-[12px] text-muted-2 leading-[1.5]">{m.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
