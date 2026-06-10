import avatar1 from "@/assets/avatar-1.jpg";
import avatar2 from "@/assets/avatar-2.jpg";
import avatar3 from "@/assets/avatar-3.jpg";
import avatar4 from "@/assets/avatar-4.jpg";

const avatars = [avatar1, avatar2, avatar3, avatar4];

export default function SocialProof() {
  return (
    <section className="bg-background py-16 md:py-24 px-4 md:px-10 overflow-hidden">
      <div className="max-w-5xl mx-auto">
        {/* Big headline with real avatar photos */}
        <div className="text-center mb-12 md:mb-20">
          <h2
            className="text-foreground font-extrabold leading-[1.0] tracking-tight"
            style={{ fontSize: "clamp(32px, 6vw, 80px)" }}
          >
            <span className="inline-flex items-center gap-2 md:gap-4 flex-wrap justify-center">
              Global
              <img src={avatars[0]} alt="" className="w-10 h-10 md:w-20 md:h-20 rounded-full object-cover shadow-lg" loading="lazy" width={512} height={512} />
              learners
            </span>
            <br />
            <span className="inline-flex items-center gap-2 md:gap-4 flex-wrap justify-center">
              <img src={avatars[1]} alt="" className="w-10 h-10 md:w-20 md:h-20 rounded-full object-cover shadow-lg" loading="lazy" width={512} height={512} />
              mastering
            </span>
            <br />
            <span className="inline-flex items-center gap-2 md:gap-4 flex-wrap justify-center">
              <img src={avatars[2]} alt="" className="w-10 h-10 md:w-20 md:h-20 rounded-full object-cover shadow-lg" loading="lazy" width={512} height={512} />
              <span className="text-primary">Claude</span>
              <img src={avatars[3]} alt="" className="w-10 h-10 md:w-20 md:h-20 rounded-full object-cover shadow-lg" loading="lazy" width={512} height={512} />
            </span>
          </h2>
        </div>

        {/* 3 stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 items-stretch">
          <div className="bg-gradient-to-br from-primary to-amber-500 rounded-2xl p-6 md:p-10 text-white">
            <p className="text-4xl md:text-6xl font-extrabold mb-3 md:mb-5 leading-none">30–60</p>
            <p className="font-semibold text-sm md:text-base mb-2">Days from zero to your first AI income</p>
            <p className="text-white/75 text-xs md:text-sm leading-relaxed">
              Most learners land their first paid AI project within 30–60 days of starting Appex.
            </p>
          </div>

          <div className="bg-gradient-to-br from-primary to-amber-500 rounded-2xl p-6 md:p-10 text-white relative z-10 shadow-2xl shadow-primary/30">
            <p className="text-4xl md:text-6xl font-extrabold mb-3 md:mb-5 leading-none">92%</p>
            <p className="font-semibold text-sm md:text-base mb-2">Built their first AI workflow</p>
            <p className="text-white/75 text-xs md:text-sm leading-relaxed">
              Most learners ship a working Claude workflow within their first sessions on Appex.
            </p>
          </div>

          <div className="bg-gradient-to-br from-primary to-amber-500 rounded-2xl p-6 md:p-10 text-white">
            <p className="text-4xl md:text-6xl font-extrabold mb-3 md:mb-5 leading-none">4.8/5</p>
            <p className="font-semibold text-sm md:text-base mb-2">Average student rating</p>
            <p className="text-white/75 text-xs md:text-sm leading-relaxed">
              Loved by learners for practical, no-fluff lessons that genuinely change how they work.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
