"use client";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {useEffect,useRef,useState} from "react";
import {api,errorMessage} from "@/lib/client-api";
import {House,SquarePen,ChartColumn,School,LayoutGrid,Users,BookOpen,Download,UserRound,Menu,LogOut,X} from "lucide-react";

const groups = [
  ["Kerja harian", [["/dashboard", "Beranda", "home"], ["/assessment", "Penilaian", "edit"], ["/recap", "Rekap", "chart"]]],
  ["Kelola data", [["/master-data", "Sekolah & tahun", "school"], ["/classes", "Kelas", "grid"], ["/students", "Siswa", "users"], ["/master-data/curriculum", "Materi", "book"]]],
  ["Laporan", [["/reports", "Ekspor & backup", "download"], ["/account", "Akun", "user"]]],
] as const;
const mobile = groups[0][1];
const active = (path:string, href:string) => path === href || (href !== "/master-data" && path.startsWith(`${href}/`));
const icons={home:House,edit:SquarePen,chart:ChartColumn,school:School,grid:LayoutGrid,users:Users,book:BookOpen,download:Download,user:UserRound,more:Menu,logout:LogOut,close:X};
function NavIcon({name}:{name:keyof typeof icons}){const Icon=icons[name];return <Icon size={20} strokeWidth={1.7} aria-hidden="true"/>}

export default function Sidebar() {
  const path = usePathname(), router = useRouter();
  const [busy,setBusy] = useState(false), [error,setError] = useState("");
  const [collapsed,setCollapsed] = useState(false), [ready,setReady] = useState(false);
  const [moreOpen,setMoreOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const moreButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    try { setCollapsed(localStorage.getItem("pib-sidebar-collapsed") === "1"); } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.sidebar = collapsed ? "collapsed" : "expanded";
    try { localStorage.setItem("pib-sidebar-collapsed", collapsed ? "1" : "0"); } catch {}
    return () => { delete document.documentElement.dataset.sidebar; };
  }, [collapsed,ready]);
  useEffect(() => { setMoreOpen(false); }, [path]);
  useEffect(() => {
    const screen = window.matchMedia("(min-width: 701px)");
    const closeOnDesktop = () => { if (screen.matches) setMoreOpen(false); };
    screen.addEventListener("change", closeOnDesktop);
    return () => screen.removeEventListener("change", closeOnDesktop);
  }, []);
  useEffect(() => {
    const box = dialog.current;
    if (!moreOpen || !box) return;
    box.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      box.close();
      document.body.style.overflow = previousOverflow;
      moreButton.current?.focus();
    };
  }, [moreOpen]);
  async function logout() {
    setBusy(true); setError("");
    try {
      await api("/api/auth/logout", {method:"POST"});
      setMoreOpen(false); router.replace("/login"); router.refresh();
    } catch (e) { setError(errorMessage(e)); setBusy(false); }
  }
  const moreActive = !mobile.some(([href]) => active(path, href));
  return <>
    <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
      <div className="brand">PIB<span>Penilaian guru · lokal</span></div>
      <button className="sidebar-toggle" type="button" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? "Buka sidebar" : "Tutup sidebar"} aria-expanded={!collapsed} title={collapsed ? "Buka sidebar" : "Tutup sidebar"}><i/><i/><i/></button>
      <nav aria-label="Navigasi utama">
        {groups.map(([label,items]) => <div key={label}>
          <p className="nav-label">{label}</p>
          {items.map(([href,name,icon]) => <Link className={active(path,href) ? "active" : ""} aria-label={name} title={collapsed ? name : undefined} aria-current={active(path,href) ? "page" : undefined} href={href} key={href}>
            <span className="nav-icon"><NavIcon name={icon}/></span><span className="nav-text">{name}</span>
          </Link>)}
        </div>)}
        {error && <p className="alert error" role="alert">{error}</p>}
        <button className="logout" onClick={logout} disabled={busy} aria-label="Keluar aplikasi" title={collapsed ? "Keluar aplikasi" : undefined}><span className="nav-icon"><NavIcon name="logout"/></span><span className="nav-text">{busy ? "Keluar…" : "Keluar aplikasi"}</span></button>
      </nav>
    </aside>
    <nav className="mobile-nav" aria-label="Navigasi utama">
      {mobile.map(([href,label,icon]) => <Link className={active(path,href) ? "active" : ""} aria-current={active(path,href) ? "page" : undefined} href={href} key={href}><NavIcon name={icon}/><span>{label}</span></Link>)}
      <button ref={moreButton} type="button" className={moreOpen || moreActive ? "active" : ""} aria-haspopup="dialog" aria-expanded={moreOpen} aria-controls="mobile-more-menu" onClick={() => setMoreOpen(true)}><NavIcon name="more"/><span>Lainnya</span></button>
    </nav>
    <dialog ref={dialog} id="mobile-more-menu" className="mobile-menu" aria-labelledby="mobile-menu-title" onCancel={event => { event.preventDefault(); setMoreOpen(false); }} onClick={event => {
      if (event.target === event.currentTarget) {
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setMoreOpen(false);
      }
    }}>
      <header className="mobile-menu-header"><div><p className="eyebrow">PIB Penilaian</p><h2 id="mobile-menu-title">Semua menu</h2></div><button type="button" className="icon-button" aria-label="Tutup menu" onClick={() => setMoreOpen(false)}><NavIcon name="close"/></button></header>
      <nav aria-label="Semua menu aplikasi">{groups.map(([label,items]) => <section className="mobile-menu-group" key={label}><h3>{label}</h3><div>{items.map(([href,name,icon]) => <Link href={href} key={href} className={active(path,href) ? "active" : ""} aria-current={active(path,href) ? "page" : undefined} onClick={() => setMoreOpen(false)}><NavIcon name={icon}/><span>{name}</span>{active(path,href) && <span className="sr-only">Halaman saat ini</span>}</Link>)}</div></section>)}</nav>
      {error && <p className="alert error" role="alert">{error}</p>}
      <button className="mobile-menu-logout" type="button" onClick={logout} disabled={busy}><NavIcon name="logout"/>{busy ? "Keluar…" : "Keluar aplikasi"}</button>
    </dialog>
  </>;
}
