import HeroContent from "./HeroContent";
import HeroMockup from "./HeroMockup";

export default function Hero() {
  return (
    <section id="inicio" className="hero-bg pt-28 pb-16 md:pb-20 px-5 lg:px-8 relative overflow-hidden">
      <div className="absolute top-16 right-0 w-[500px] h-[500px] rounded-full bg-secondary/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-success/6 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <HeroContent />
        <HeroMockup />
      </div>
    </section>
  );
}
