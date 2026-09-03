"use client";
import { usePathname } from "next/navigation";
import Sidebar from "./sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path === "/" || path === "/login" || path === "/setup") return <div className="public-content">{children}</div>;
  return <><Sidebar /><div className="content">{children}</div></>;
}
