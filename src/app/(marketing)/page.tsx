import Hero from "@/modules/marketing/components/hero/Hero";
import Features from "@/modules/marketing/components/sections/Features";
import Levels from "@/modules/marketing/components/sections/Levels";
import Pricing from "@/modules/marketing/components/pricing/Pricing";
import Testimonials from "@/modules/marketing/components/sections/Testimonials";
import FinalCTA from "@/modules/marketing/components/sections/FinalCTA";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <Levels />
      <Pricing />
      <Testimonials />
      <FinalCTA />
    </>
  );
}