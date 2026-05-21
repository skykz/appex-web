import review1 from "@/assets/review-1.jpg";
import review2 from "@/assets/review-2.jpg";
import review3 from "@/assets/review-3.jpg";
import review4 from "@/assets/review-4.jpg";
import review5 from "@/assets/review-5.jpg";
import review6 from "@/assets/review-6.jpg";

const reviews = [
  {
    name: "Jesahavila Max",
    date: "November 05, 2024",
    img: review1,
    text: "The company's reputation well respected. I think this company is really a well run business. By reading all its course's contents, I'm really impressed. I see a lot of successful business ideas and steps mentioned in the content.",
  },
  {
    name: "Briana",
    date: "December 04, 2024",
    img: review2,
    text: "Why is freelancing a good source of income? This company is great for people who are looking to find more income but aren't sure where to start. They have step by step lessons that guide you through the process from beginning to the end.",
  },
  {
    name: "Mahta Teimourian",
    date: "November 07, 2024",
    img: review3,
    text: "Absolutely recommended. It's wonderful how you teach all the crucial steps for Freelancing work! You make sure every beginner learns and same time your content has new ideas and important tips for people whom already in business!",
  },
  {
    name: "Sarah Chen",
    date: "January 12, 2025",
    img: review4,
    text: "I was skeptical at first, but the hands-on approach won me over. Built my first AI workflow in under 20 minutes. Now I'm earning $800/month automating tasks for local businesses. The community support is amazing too.",
  },
  {
    name: "Carlos Rivera",
    date: "February 18, 2025",
    img: review5,
    text: "Game changer for my career. I went from zero tech knowledge to building AI agents for clients in just 6 weeks. The step-by-step approach makes complex concepts feel simple. Highly recommend for anyone looking to pivot.",
  },
  {
    name: "Priya Sharma",
    date: "March 02, 2025",
    img: review6,
    text: "As a stay-at-home mom, I needed something flexible. Appex gave me the skills to earn from home on my own schedule. The projects are practical and clients actually pay for them. Best investment I've made.",
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
          REVIEWS
        </p>
        <h2
          className="text-foreground font-extrabold leading-tight tracking-tight"
          style={{ fontSize: "clamp(28px, 4vw, 52px)" }}
        >
          They learned <span className="text-primary">AI</span>. You can too.
        </h2>
      </div>

      {/* Auto-scrolling carousel */}
      <div className="group">
        <div className="flex gap-4 md:gap-5 animate-marquee-slow group-hover:[animation-play-state:paused] pl-4 md:pl-5">
          {doubled.map((r, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[280px] md:w-[360px] bg-card border border-border rounded-2xl p-5 md:p-7"
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

      <div className="text-center mt-8 md:mt-10 px-4">
        <a
          href="#"
          className="inline-flex items-center gap-2 border border-border rounded-full px-6 py-2.5 text-sm text-foreground hover:bg-card transition-colors font-body"
        >
          Read more
        </a>
      </div>
    </section>
  );
}
