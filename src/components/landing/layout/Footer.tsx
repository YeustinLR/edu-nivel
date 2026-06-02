import Link from 'next/link';
import { GraduationCap, Shield, Cookie, Receipt, FileText } from 'lucide-react';

export default function Footer(): React.ReactElement {
  const legalLinks = [
    { name: "Términos Legales", href: "/terminos-legales", icon: FileText },
    { name: "Privacidad", href: "/privacidad", icon: Shield },
    { name: "Cookies", href: "/cookies", icon: Cookie },
    { name: "Reembolsos", href: "/reembolsos", icon: Receipt },
  ];

  return (
    <footer className="border-t border-white/10 bg-gray-950 px-6 py-12">
      <div className="mx-auto max-w-6xl">
          {/* Logo + links legales */}
          <div className="relative mb-8 flex items-center justify-center">
            {/* Logo */}
            <div className="absolute left-0 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-500">
                <GraduationCap size={16} className="text-gray-900" strokeWidth={2.5} />
              </div>
              <span className="font-fraunces text-h3 font-bold">
                Edu<span className="text-yellow-500">Nivel</span>
              </span>
            </div>

            {/* Links legales horizontales */}
            <nav aria-label="Enlaces legales">
              <ul className="flex flex-wrap justify-center gap-x-6 gap-y-3">
              {legalLinks.map(({ name, href, icon: Icon }) => (
                <li key={name}>
                  <Link 
                    href={href}
                    className="group flex items-center gap-1.5 text-small text-gray-400 transition-colors hover:text-yellow-400"
                  >
                    <Icon size={14} className="text-gray-600 group-hover:text-yellow-400" />
                    <span>{name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Copyright simplificado */}
        <div className="border-t border-white/5 pt-6 text-center">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} EduNivel · Eric V. Brenes Sánchez
          </p>
          <p className="mt-1 text-[10px] text-gray-700">
            Design by YeustinLR · Developed by EricBrenes · No commercial use without permission
          </p>
        </div>
      </div>
    </footer>
  );
}