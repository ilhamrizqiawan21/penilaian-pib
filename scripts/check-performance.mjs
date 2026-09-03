import {access,readdir,stat} from "node:fs/promises";
import path from "node:path";
async function exists(target){try{await access(target);return true}catch{return false}}
async function walk(dir){let total=0;for(const item of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())total+=await walk(file);else if(!file.endsWith(".map"))total+=(await stat(file)).size}return total}
const preferred=path.join(process.cwd(),".next-prod","static");
const fallback=path.join(process.cwd(),".next","static");
const dir=await exists(preferred)?preferred:fallback;
if(!await exists(dir)){console.error("Build belum tersedia. Jalankan npm run build terlebih dahulu.");process.exit(1)}
const bytes=await walk(dir),dist=path.basename(path.dirname(dir));
console.log(`Client browser assets (${dist}, source map excluded): ${(bytes/1024/1024).toFixed(2)} MB`);
if(bytes>5*1024*1024){console.error("Client browser assets melewati baseline 5 MB");process.exitCode=1}
