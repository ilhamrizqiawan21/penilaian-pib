"use client";
import {ErrorState,PageHeader} from "@/app/ui";

export default function Error({reset}:{reset:()=>void}){
  return <main className="app dashboard-page"><PageHeader title="Beranda"/><ErrorState message="Ringkasan beranda belum dapat dimuat. Silakan coba lagi." onRetry={reset}/></main>;
}
