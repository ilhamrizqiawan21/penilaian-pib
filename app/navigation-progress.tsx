"use client";

import {usePathname} from "next/navigation";
import {useEffect, useRef, useState} from "react";

export default function NavigationProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const fallback = useRef<number | null>(null);

  useEffect(() => {
    const finish = window.setTimeout(() => setActive(false), 220);
    return () => window.clearTimeout(finish);
  }, [pathname]);

  useEffect(() => {
    const start = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.href === window.location.href || destination.pathname.startsWith("/api/")) return;
      setActive(true);
      if (fallback.current) window.clearTimeout(fallback.current);
      fallback.current = window.setTimeout(() => setActive(false), 5000);
    };
    document.addEventListener("click", start, true);
    return () => {
      document.removeEventListener("click", start, true);
      if (fallback.current) window.clearTimeout(fallback.current);
    };
  }, []);

  return <div className={"route-progress" + (active ? " active" : "")} role="progressbar" aria-label="Membuka halaman" aria-hidden={!active}><span /></div>;
}
