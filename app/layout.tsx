import "@fontsource-variable/inter";
import "./globals.css";
import "./sidebar-fixes.css";
import "./navigation.css";
import "./branding.css";
import OfflineIndicator from "./offline-indicator";
import AppLayout from "./app-layout";
import {ToastProvider} from "./ui";
import NavigationProgress from "./navigation-progress";
export const metadata={title:"PIB Penilaian",description:"Penilaian Praktik Ibadah",manifest:"/manifest.webmanifest",icons:{icon:[{url:"/images/favicon.ico"},{url:"/images/favicon-32x32.png",sizes:"32x32",type:"image/png"},{url:"/images/favicon-16x16.png",sizes:"16x16",type:"image/png"}],apple:[{url:"/images/apple-touch-icon.png",sizes:"180x180",type:"image/png"}]}};
const sidebarInit=`try{document.documentElement.dataset.sidebar=localStorage.getItem("pib-sidebar-collapsed")==="1"?"collapsed":"expanded"}catch(e){document.documentElement.dataset.sidebar="expanded"}`;
export default function Layout({children}:{children:React.ReactNode}){return <html lang="id"><head><script dangerouslySetInnerHTML={{__html:sidebarInit}}/></head><body><ToastProvider><NavigationProgress/><OfflineIndicator/><AppLayout>{children}</AppLayout></ToastProvider></body></html>}
