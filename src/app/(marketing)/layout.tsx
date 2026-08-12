import PublicFooter from "@/components/layout/PublicFooter";
import PublicNavbar from "@/components/layout/PublicNavbar";

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <PublicNavbar />
      <main className="min-h-screen bg-background text-foreground overflow-x-hidden">
        {children}
      </main>
      <PublicFooter />
    </>
  );
}
