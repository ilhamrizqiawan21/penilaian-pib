import Image from "next/image";
export default function BrandLogo({className=""}:{className?:string}){
  return <Image src="/images/android-chrome-192x192.png" alt="Logo PIB" width={192} height={192} className={"brand-logo "+className} unoptimized/>;
}
