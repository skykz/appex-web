import testimonial1 from "@/assets/testimonial-1.jpg";
import testimonial2 from "@/assets/testimonial-2.jpg";
import testimonial3 from "@/assets/testimonial-3.jpg";
import testimonial4 from "@/assets/testimonial-4.jpg";
import testimonial5 from "@/assets/testimonial-5.jpg";

const testimonials = [
  {
    img: testimonial1,
    role: "Housewife → now runs an AI content agency",
    name: "Sarah",
    quote: "\"...the best part is I don't have to choose between being there for my kids and having my own career\"",
    built: "AI Content Autopilot",
  },
  {
    img: testimonial2,
    role: "Business owner → saves 10h/week with AI agents",
    name: "Mike",
    quote: "\"It's saving me about 10 hours a week and I've already seen my response rates jump.\"",
    built: "AI Customer Support Bot",
  },
  {
    img: testimonial3,
    role: "Ex-office worker → now earns $2,800/mo with AI agents",
    name: "Ella",
    quote: "\"Now I'm working for myself, I set my own hours, and I'm making more than I did at my desk job.\"",
    built: "AI Marketing Manager",
  },
  {
    img: testimonial4,
    role: "Ex-uber driver → now sells AI sales agents to coaches",
    name: "Jamie",
    quote: "\"...for the first time, I'm actually excited about what I do.\"",
    built: "AI Sales Agent",
  },
  {
    img: testimonial5,
    role: "Stay-at-home mom → built 3 booking bots for local salons",
    name: "Anna",
    quote: "\"I built my first bot during nap time. Now I have 3 paying clients and work on my own schedule.\"",
    built: "WhatsApp Booking Bot",
  },
];

const doubled = [...testimonials, ...testimonials];

export default function VideoTestimonials() {
  return (
    <section className="bg-card py-16 md:py-24 overflow-hidden">
      {/* Header */}
      <div className="max-w-5xl mx-auto px-4 md:px-10 mb-10 md:mb-14">
        <div className="flex items-center gap-2 mb-3 md:mb-4">
          <span className="w-2 h-2 rounded-full bg-primary inline-block" />
          <span className="text-primary uppercase text-[11px] tracking-[0.2em] font-semibold font-body">
            Real people. Real income.
          </span>
        </div>
        <h2
          className="text-foreground font-extrabold leading-[1.05] mb-3 md:mb-4 tracking-tight"
          style={{ fontSize: "clamp(28px, 5vw, 64px)" }}
        >
          A growing community of{" "}
          <span className="text-primary">AI earners</span>
        </h2>
        <p className="text-muted-foreground text-[14px] md:text-[16px] font-body">
          Hear directly from people who started exactly where you are.
        </p>
      </div>

      {/* Carousel */}
      <div className="group relative mb-10 md:mb-14">
        <div className="absolute left-0 top-0 bottom-0 w-8 md:w-16 bg-gradient-to-r from-card to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 md:w-16 bg-gradient-to-l from-card to-transparent z-10 pointer-events-none" />

        <div className="flex gap-4 md:gap-5 animate-marquee-slow group-hover:[animation-play-state:paused] pl-4 md:pl-5">
          {doubled.map((t, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[220px] md:w-[280px] bg-background border border-border rounded-2xl overflow-hidden"
            >
              <div className="relative">
                <img
                  src={t.img}
                  alt={`${t.role} – ${t.name}`}
                  className="w-full aspect-[3/4] object-cover"
                  loading="lazy"
                  width={512}
                  height={800}
                />
                <button className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20">
                    <svg className="w-5 h-5 md:w-6 md:h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </button>
                <div className="absolute top-3 right-3 w-7 h-7 md:w-8 md:h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                  </svg>
                </div>
              </div>

              <div className="p-4 md:p-5">
                <p className="text-foreground text-[13px] md:text-[14px] font-semibold mb-1.5 md:mb-2 leading-snug">
                  {t.role}
                </p>
                <p className="text-muted-foreground text-[12px] md:text-[13px] leading-relaxed font-body mb-2">
                  {t.quote}
                </p>
                <span className="inline-block text-[10px] md:text-[11px] font-semibold uppercase tracking-wider bg-primary/15 text-primary border border-primary/25 rounded-full px-3 py-1">
                  Built: {t.built}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Join them button */}
      <div className="text-center px-4">
        <a
          href="/quiz"
          className="w-full sm:w-auto inline-flex justify-center bg-gradient-primary text-white rounded-xl px-10 py-4 text-base md:text-lg font-semibold hover:opacity-90 hover:-translate-y-px transition-all font-body"
        >
          Join them →
        </a>
      </div>
    </section>
  );
}
