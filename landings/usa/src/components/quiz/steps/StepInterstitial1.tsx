import { useQuiz } from "@/contexts/QuizContext";
import ContinueButton from "../ContinueButton";
import p1 from "@/assets/testimonial-1.jpg";
import p2 from "@/assets/testimonial-3.jpg";
import p3 from "@/assets/testimonial-4.jpg";
import p4 from "@/assets/testimonial-5.jpg";

export default function StepInterstitial1() {
  const { nextStep } = useQuiz();

  const photos = [p1, p2, p3, p4];

  return (
    <div className="text-center">
      <h2 className="text-[26px] font-extrabold mb-3" style={{ color: '#111' }}>
        We know how to help you!
      </h2>
      <p className="text-[15px] mb-8 leading-relaxed max-w-md mx-auto" style={{ color: '#666' }}>
        Appex will teach you step-by-step how to make money online using AI and help you enhance your potential!
      </p>

      {/* Photo collage */}
      <div className="w-full max-w-sm mx-auto rounded-2xl overflow-hidden mb-6" style={{ background: '#F5F5F5' }}>
        <div className="grid grid-cols-2 gap-1.5 p-1.5">
          {photos.map((src, i) => (
            <div key={i} className="aspect-square rounded-xl overflow-hidden">
              <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>
        <p className="text-[14px] font-medium pb-5 pt-1" style={{ color: '#666' }}>
          Real people. Real results. Your turn next.
        </p>
      </div>

      <ContinueButton onClick={nextStep} />
    </div>
  );
}
