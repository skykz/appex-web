import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import RoleTicker from "@/components/landing/RoleTicker";
import VideoSection from "@/components/landing/VideoSection";
import SocialProof from "@/components/landing/SocialProof";
import Features from "@/components/landing/Features";
import Projects from "@/components/landing/Projects";
import HowItWorks from "@/components/landing/HowItWorks";
import WhoItsFor from "@/components/landing/WhoItsFor";
import Certificate from "@/components/landing/Certificate";
import Reviews from "@/components/landing/Reviews";
import VideoTestimonials from "@/components/landing/VideoTestimonials";
import FAQ from "@/components/landing/FAQ";
import Footer from "@/components/landing/Footer";

export default function Index() {
  return (
    <>
      <Navbar />
      <Hero />
      <RoleTicker />
      <VideoSection />
      <SocialProof />
      <Features />
      <Projects />
      <HowItWorks />
      <WhoItsFor />
      <Certificate />
      <Reviews />
      <VideoTestimonials />
      <FAQ />
      <Footer />
    </>
  );
}
