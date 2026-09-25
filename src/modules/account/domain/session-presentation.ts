export function describeSession(userAgent: string | null) {
  if (!userAgent) return "Dispositivo desconocido";

  const browser = userAgent.includes("Edg/")
    ? "Microsoft Edge"
    : userAgent.includes("Firefox/")
      ? "Firefox"
      : userAgent.includes("Chrome/") || userAgent.includes("CriOS/")
        ? "Chrome"
        : userAgent.includes("Safari/")
          ? "Safari"
          : "Navegador desconocido";

  const system = /iPhone|iPad|iPod/.test(userAgent)
    ? "iOS"
    : userAgent.includes("Android")
      ? "Android"
      : userAgent.includes("Windows")
        ? "Windows"
        : userAgent.includes("Mac OS X")
          ? "macOS"
          : userAgent.includes("Linux")
            ? "Linux"
            : null;

  return system ? `${browser} en ${system}` : browser;
}

