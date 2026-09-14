import { Cookie, FileText, Receipt, Shield } from "lucide-react";
import Link from "next/link";

const legalLinks = [
  { name: "Términos legales", href: "/terminos-legales", icon: FileText },
  { name: "Privacidad", href: "/privacidad", icon: Shield },
  { name: "Cookies", href: "/cookies", icon: Cookie },
  { name: "Pagos y renovaciones", href: "/pagos-y-renovaciones", icon: Receipt },
] as const;

export default function PublicFooter() {
  return (
    <footer className="border-t border-border bg-background px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="relative mb-6 flex flex-col items-center md:flex-row md:justify-center">
          <nav aria-label="Enlaces legales">
            <ul className="flex flex-wrap justify-center gap-x-6 gap-y-3">
              {legalLinks.map(({ name, href, icon: Icon }) => (
                <li key={name}>
                  <Link
                    href={href}
                    className="group flex items-center gap-1.5 rounded-sm text-small text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <Icon
                      size={14}
                      className="text-muted group-hover:text-foreground"
                    />
                    <span>{name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="border-t border-border pt-4 text-center">
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} EduNivel. Todos los derechos reservados.
          </p>
          <p className="mt-1 text-xs text-muted">
            EduNivel es propiedad de Eric V. Brenes Sánchez · Desarrollado por YeustinLR ·
            Sin uso comercial sin autorización.
          </p>
        </div>
      </div>
    </footer>
  );
}
