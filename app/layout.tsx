import "./globals.css";
import "./sidebar-fixes.css";
import OfflineIndicator from "./offline-indicator";
import AppLayout from "./app-layout";
import {ToastProvider} from "./ui";
export const metadata={title:"PIB Penilaian",description:"Penilaian Praktik Ibadah"};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="id"><body><ToastProvider><OfflineIndicator/><AppLayout>{children}</AppLayout></ToastProvider></body></html>}
