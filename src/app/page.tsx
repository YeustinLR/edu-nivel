import Navbar from "@/components/landing/layout/Navbar";
import Footer from "@/components/landing/layout/Footer";

import Hero from "@/components/landing/hero/Hero";
import Features from "@/components/landing/sections/Features";
import Levels from "@/components/landing/sections/Levels";
import Pricing from "@/components/landing/pricing/Pricing";
import Testimonials from "@/components/landing/sections/Testimonials";
import FAQ from "@/components/landing/faq/FAQ";
import FinalCTA from "@/components/landing/sections/FinalCTA";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />

      <Hero />

      <Features /> 

      <Levels />

      <Pricing />

      <Testimonials />

      {/*<FAQ />

      */}<FinalCTA />            

      <Footer />
    </main>
  );
}