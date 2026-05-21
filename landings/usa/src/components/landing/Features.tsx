export default function Features() {
  const features = [
    {
      icon: (
        <svg className="w-8 h-8 md:w-10 md:h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 7l-7 5 7 5V7z" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      ),
      title: "Online & Part-Time Friendly",
      desc: "Flexible program is designed to fit your lifestyle, so you can upskill without putting life on hold.",
    },
    {
      icon: (
        <svg className="w-8 h-8 md:w-10 md:h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <path d="M7 8h4M7 12h8" />
        </svg>
      ),
      title: "No Coding Required",
      desc: "The curriculum focuses on practical AI tools and workflows anyone can master, step by step.",
    },
    {
      icon: (
        <svg className="w-8 h-8 md:w-10 md:h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          <line x1="2" y1="12" x2="22" y2="12" />
        </svg>
      ),
      title: "Career Guarantee Included",
      desc: "Real career opportunities after completing the program or we'll refund your investment in full.",
    },
  ];

  return (
    <section className="bg-background relative py-0 px-4 md:px-10">
      {/* Corner plus marks */}
      <span className="absolute top-3 left-4 md:left-5 text-border text-lg select-none font-light">+</span>
      <span className="absolute top-3 right-4 md:right-5 text-border text-lg select-none font-light">+</span>
      <span className="absolute bottom-3 left-4 md:left-5 text-border text-lg select-none font-light">+</span>
      <span className="absolute bottom-3 right-4 md:right-5 text-border text-lg select-none font-light">+</span>

      <div className="max-w-6xl mx-auto border-t border-b border-dashed border-border">
        <div className="grid grid-cols-1 md:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`px-6 md:px-8 py-8 md:py-12 ${i < 2 ? "md:border-r md:border-dashed md:border-border" : ""} ${i > 0 ? "border-t md:border-t-0 border-dashed border-border" : ""}`}
            >
              <div className="text-primary mb-6 md:mb-8">{f.icon}</div>
              <h3 className="text-foreground font-bold text-base md:text-lg mb-2 tracking-tight">{f.title}</h3>
              <p className="text-muted-foreground text-[13px] md:text-[14px] leading-[1.7]">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
