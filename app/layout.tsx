import "@fontsource-variable/inter";
import "./globals.css";
import "./sidebar-fixes.css";
import "./navigation.css";
import OfflineIndicator from "./offline-indicator";
import AppLayout from "./app-layout";
import {ToastProvider} from "./ui";
import NavigationProgress from "./navigation-progress";
export const metadata={title:"PIB Penilaian",description:"Penilaian Praktik Ibadah"};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="id"><body><ToastProvider><NavigationProgress/><OfflineIndicator/><AppLayout>{children}</AppLayout></ToastProvider></body></html>}
