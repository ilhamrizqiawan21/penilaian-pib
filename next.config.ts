import type {NextConfig} from "next";
const config:NextConfig={serverExternalPackages:["better-sqlite3"],distDir:".next-prod",async headers(){return [{source:"/:path*",headers:[{key:"X-Content-Type-Options",value:"nosniff"},{key:"X-Frame-Options",value:"SAMEORIGIN"},{key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},{key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"}]}]}};
export default config;
