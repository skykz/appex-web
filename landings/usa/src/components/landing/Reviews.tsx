import review1 from "@/assets/review-1.jpg";
import review2 from "@/assets/review-2.jpg";
import review3 from "@/assets/review-3.jpg";
import review4 from "@/assets/review-4.jpg";
import review5 from "@/assets/review-5.jpg";
import review6 from "@/assets/review-6.jpg";

const reviews = [
  {
    name: "Daniel R.",
    date: "Freelance marketer",
    img: review1,
    text: "I went from never touching automation to shipping a working AI support bot for my first client in under a month. The lessons are practical with zero fluff.",
  },
  {
    name: "Aisha K.",
    date: "Career changer",
    img: review2,
    text: "I was stuck in a job with no growth. Appex gave me a clear plan I could follow after work, and now I have real AI skills that keep me relevant.",
  },
  {
    name: "Marcus T.",
    date: "Small business owner",
    img: review3,
    text: "We replaced hours of manual follow-up with an AI agent I built myself. I didn't write a single line of code to do it.",
  },
  {
    name: "Priya S.",
    date: "Virtual assistant",
    img: review4,
    text: "Learning AI automation gave me a whole new set of skills and the confidence to use them. The certification gave me real credibility, and my work has leveled up.",
  },
  {
    name: "Tom B.",
    date: "Sales professional",
    img: review5,
    text: "The outreach system I built from the course books meetings while I sleep. Easily the best skill investment I've made this year.",
  },
  {
    name: "Elena V.",
    date: "Student",
    img: review6,
    text: "I started with no experience at all. Now I have a portfolio of AI agents and skills employers actually want before I've even graduated.",
  },
];

const doubled = [...reviews, ...reviews];

const Stars = () => (
  <div className="flex gap-0.5">
    {[...Array(5)].map((_, i) => (
      <svg key={i} className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))}
  </div>
);

export default function Reviews() {
  return (
    <section id="reviews" className="bg-background py-16 md:py-24 overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 md:px-10 text-center mb-10 md:mb-14">
        <p className="text-primary uppercase text-[11px] tracking-[0.15em] font-semibold mb-3 font-body">
          Loved by learners
        </p>
        <h2
          className="text-foreground font-extrabold leading-tight tracking-tight"
          style={{ fontSize: "clamp(28px, 4vw, 52px)" }}
        >
          Results our community is <span className="text-primary">proud of</span>
        </h2>
        <p className="text-muted-foreground text-[14px] md:text-[16px] mt-4 font-body max-w-xl mx-auto">
          Real stories from learners who are putting Claude to work every day.
        </p>
      </div>

      {/* Mobile: swipeable scroll | Desktop: faster auto-marquee */}
      <div className="group">
        <div
          className="flex gap-4 md:gap-5 pl-4 md:pl-5 overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:animate-marquee md:group-hover:[animation-play-state:paused] pb-4 md:pb-0"
        >
          {doubled.map((r, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[300px] md:w-[360px] bg-card border border-border rounded-2xl p-5 md:p-7 snap-center md:snap-none"
            >
              <div className="flex items-center gap-3 mb-3 md:mb-4">
                <img
                  src={r.img}
                  alt={r.name}
                  className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover"
                  loading="lazy"
                  width={512}
                  height={512}
                />
                <div>
                  <p className="text-foreground text-[13px] md:text-sm font-semibold">{r.name}</p>
                  <p className="text-muted-foreground text-[11px] md:text-xs">{r.date}</p>
                </div>
              </div>

              <Stars />

              <p className="text-muted-foreground text-[13px] md:text-[15px] leading-relaxed mt-3 md:mt-4 font-body">
                {r.text}
              </p>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}
