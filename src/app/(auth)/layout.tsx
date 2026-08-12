import PublicFooter from "@/components/layout/PublicFooter";
import PublicNavbar from "@/components/layout/PublicNavbar";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <PublicNavbar />
      <main className="min-h-[100svh] bg-surface px-4 pb-6 pt-20 sm:px-5">
        <div className="mx-auto flex min-h-[calc(100svh-6.5rem)] w-full max-w-2xl flex-col justify-center">
          {children}
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
