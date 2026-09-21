import {hasValidOrigin} from "@/lib/request-origin";
import {NextResponse} from "next/server";import type {NextRequest} from "next/server";

// Aplikasi ini hanya dipakai di laptop lokal. Origin guard tetap dipertahankan
// untuk mencegah write request lintas situs, tetapi tidak ada login/session gate.
export function middleware(request:NextRequest){if(request.method!=="GET"&&request.method!=="HEAD"&&request.method!=="OPTIONS"&&!hasValidOrigin(request))return NextResponse.json({error:"Origin request tidak valid"},{status:403});return NextResponse.next()}
export const config={matcher:["/dashboard/:path*","/master-data/:path*","/assessment/:path*","/recap/:path*","/reports/:path*","/students/:path*","/classes/:path*","/api/:path*"]};
