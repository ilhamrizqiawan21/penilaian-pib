import type {NextConfig} from "next";
const config:NextConfig={serverExternalPackages:["better-sqlite3"],distDir:process.env.NODE_ENV==="production"?".next-prod":".next"};
export default config;
