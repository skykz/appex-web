import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Certificate from "@/components/landing/Certificate";
import RoleTicker from "@/components/landing/RoleTicker";
import SocialProof from "@/components/landing/SocialProof";
import Features from "@/components/landing/Features";
import Projects from "@/components/landing/Projects";
import HowItWorks from "@/components/landing/HowItWorks";
import WhoItsFor from "@/components/landing/WhoItsFor";
import Reviews from "@/components/landing/Reviews";
import FAQ from "@/components/landing/FAQ";
import Footer from "@/components/landing/Footer";
import { useScrollDepth } from "@/hooks/use-scroll-depth";

export default function Index() {
  // Reports 25/50/75/100% reach, so a landing→quiz drop can be traced to people
  // never getting past the hero rather than guessed at.
  useScrollDepth();

  return (
    <div className="overflow-x-hidden w-full max-w-[100vw]">
      <Navbar />
      <Hero />
      <RoleTicker />
      <Features />
      <SocialProof />
      <Certificate />
      <Projects />
      <HowItWorks />
      <WhoItsFor />
      <Reviews />
      <FAQ />
      <Footer />
    </div>
  );
}
