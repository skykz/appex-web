import review1 from "@/assets/review-1.jpg";
import review2 from "@/assets/review-2.jpg";
import review3 from "@/assets/review-3.jpg";
import review4 from "@/assets/review-4.jpg";
import review5 from "@/assets/review-5.jpg";
import review6 from "@/assets/review-6.jpg";
import testimonial1 from "@/assets/testimonial-1.jpg";
import testimonial2 from "@/assets/testimonial-2.jpg";
import testimonial3 from "@/assets/testimonial-3.jpg";
import testimonial4 from "@/assets/testimonial-4.jpg";
import testimonial5 from "@/assets/testimonial-5.jpg";

interface Review {
  name: string;
  date: string;
  img: string;
  rating: number;
  text: string;
}

const reviews: Review[] = [
  {
    name: "Daniel R.",
    date: "3 weeks ago",
    img: review1,
    rating: 5,
    text: "honestly wasn't sure this would be worth it but it was. built a little AI bot that answers my client's support emails and it actually works. took me about 3 weeks going at it after work.",
  },
  {
    name: "Aisha K.",
    date: "1 month ago",
    img: review2,
    rating: 5,
    text: "I'm not techy at all so I was nervous. the steps are broken down enough that I could keep up. still using my notes from the automation module honestly, that part was gold.",
  },
  {
    name: "Marcus T.",
    date: "2 months ago",
    img: review3,
    rating: 5,
    text: "Runs my follow-ups now so I stopped doing them by hand. Didn't write any code which I still can't believe. Wish the video audio was a bit louder in a couple lessons but no big deal.",
  },
  {
    name: "Priya S.",
    date: "2 weeks ago",
    img: review4,
    rating: 4,
    text: "Good course, learned a lot and the cert helped me land 2 new VA clients. Some lessons felt a little basic for me but the automation ones made up for it. Would recommend to a friend.",
  },
  {
    name: "Tom B.",
    date: "1 month ago",
    img: review5,
    rating: 5,
    text: "the outreach setup i built books calls while im asleep, no joke. i check the calendar in the morning and there's meetings on it. best money i've spent on myself this year.",
  },
  {
    name: "Elena V.",
    date: "3 weeks ago",
    img: review6,
    rating: 5,
    text: "started with literally zero experience. still a student. i've got like 4 small AI projects i can show now which is more than most people i graduate with. thank you 🙏",
  },
  {
    name: "James W.",
    date: "1 week ago",
    img: testimonial4,
    rating: 5,
    text: "Was skeptical about another online course tbh. But this one actually made me DO things instead of just watching. Built my first workflow by day 4.",
  },
  {
    name: "Sofia M.",
    date: "2 months ago",
    img: testimonial1,
    rating: 5,
    text: "My manager noticed the reports I automated and asked me to teach the team lol. Didn't expect that. Worth every penny and I don't say that lightly.",
  },
  {
    name: "Chris P.",
    date: "3 weeks ago",
    img: testimonial5,
    rating: 4,
    text: "Solid content, no fluff which I appreciated. Went a bit fast in the middle section so I had to rewatch, but the community helped when I got stuck. Happy overall.",
  },
  {
    name: "Nadia H.",
    date: "1 month ago",
    img: testimonial2,
    rating: 5,
    text: "I do freelance admin work and this basically doubled what I can charge. Clients think I'm some kind of wizard now 😂 really glad I gave it a shot.",
  },
  {
    name: "Ryan K.",
    date: "5 days ago",
    img: testimonial3,
    rating: 5,
    text: "Quit doom-scrolling job boards and actually built skills instead. Have a portfolio now. The step-by-step layout kept me from getting overwhelmed which is usually my problem.",
  },
  {
    name: "Lauren D.",
    date: "2 weeks ago",
    img: review2,
    rating: 5,
    text: "Came back to work after maternity leave feeling out of the loop with all the AI stuff. This got me caught up fast. Fit it around nap times which was the only way it was happening.",
  },
];

const doubled = [...reviews, ...reviews];

const Stars = ({ rating = 5 }: { rating?: number }) => (
  <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
    {[...Array(5)].map((_, i) => (
      <svg
        key={i}
        className={i < rating ? "w-4 h-4 text-primary" : "w-4 h-4 text-muted-foreground/25"}
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden
      >
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

      {/* Mobile: centered vertical stack — no horizontal swipe */}
      <div className="md:hidden flex flex-col items-center gap-4 px-4">
        {reviews.map((r, i) => (
          <div
            key={i}
            className="w-full max-w-[340px] bg-card border border-border rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <img
                src={r.img}
                alt={r.name}
                className="w-9 h-9 rounded-full object-cover"
                loading="lazy"
                width={512}
                height={512}
              />
              <div>
                <p className="text-foreground text-[13px] font-semibold">{r.name}</p>
                <p className="text-muted-foreground text-[11px]">{r.date}</p>
              </div>
            </div>

            <Stars rating={r.rating} />

            <p className="text-muted-foreground text-[13px] leading-relaxed mt-3 font-body">
              {r.text}
            </p>
          </div>
        ))}
      </div>

      {/* Desktop: auto-marquee */}
      <div className="hidden md:block group">
        <div
          className="flex gap-5 pl-5 overflow-visible animate-marquee group-hover:[animation-play-state:paused]"
        >
          {doubled.map((r, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[360px] bg-card border border-border rounded-2xl p-7"
            >
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={r.img}
                  alt={r.name}
                  className="w-10 h-10 rounded-full object-cover"
                  loading="lazy"
                  width={512}
                  height={512}
                />
                <div>
                  <p className="text-foreground text-sm font-semibold">{r.name}</p>
                  <p className="text-muted-foreground text-xs">{r.date}</p>
                </div>
              </div>

              <Stars rating={r.rating} />

              <p className="text-muted-foreground text-[15px] leading-relaxed mt-4 font-body">
                {r.text}
              </p>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}
