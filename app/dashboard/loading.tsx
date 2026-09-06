import {LoadingState,PageHeader} from "@/app/ui";

export default function Loading(){
  return <main className="app dashboard-page"><PageHeader title="Beranda" description="Menyiapkan ringkasan ruang kerja Anda."/><LoadingState label="Memuat ringkasan beranda"/></main>;
}
