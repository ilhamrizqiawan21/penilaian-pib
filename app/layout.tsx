import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "PIB — Penilaian Praktik Ibadah", description: "Aplikasi penilaian PIB lokal", manifest: "/manifest.webmanifest" };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="id" suppressHydrationWarning><body>{children}</body></html>; }
