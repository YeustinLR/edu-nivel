import Navbar from "@/modules/marketing/components/layout/Navbar";
import Footer from "@/modules/marketing/components/layout/Footer";

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background text-foreground overflow-x-hidden">
        {children}
      </main>
      <Footer />
    </>
  );
}
