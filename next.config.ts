import type {NextConfig} from "next";
// Build untuk paket Electron (PIB_STANDALONE=1) memakai folder terpisah agar .next-prod milik launcher tidak berubah.
const standalone=process.env.PIB_STANDALONE==="1";
const config:NextConfig={serverExternalPackages:["better-sqlite3"],distDir:standalone?".next-electron":".next-prod",...(standalone?{output:"standalone" as const,outputFileTracingRoot:process.cwd()}:{}),async headers(){return [{source:"/:path*",headers:[{key:"X-Content-Type-Options",value:"nosniff"},{key:"X-Frame-Options",value:"SAMEORIGIN"},{key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},{key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"}]}]}};
export default config;
