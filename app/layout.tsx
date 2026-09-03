import "./globals.css";
import OfflineIndicator from "./offline-indicator";
import AppLayout from "./app-layout";
export const metadata={title:"PIB Penilaian",description:"Penilaian Praktik Ibadah"};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="id"><body><OfflineIndicator/><AppLayout>{children}</AppLayout></body></html>}
