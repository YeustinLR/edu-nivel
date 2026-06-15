import Navbar from "@/modules/marketing/components/layout/Navbar";
import Footer from "@/modules/marketing/components/layout/Footer";

import Hero from "@/modules/marketing/components/hero/Hero";
import Features from "@/modules/marketing/components/sections/Features";
import Levels from "@/modules/marketing/components/sections/Levels";
import Pricing from "@/modules/marketing/components/pricing/Pricing";
import Testimonials from "@/modules/marketing/components/sections/Testimonials";
import FinalCTA from "@/modules/marketing/components/sections/FinalCTA";

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