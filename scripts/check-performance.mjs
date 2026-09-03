import {readdir,stat} from "node:fs/promises";import path from "node:path";
const dist=process.env.NODE_ENV==="production"?".next-prod":".next";
async function walk(dir){let total=0;for(const item of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())total+=await walk(file);else if(!file.endsWith(".map"))total+=(await stat(file)).size}return total}
const dir=path.join(process.cwd(),dist,"static");const bytes=await walk(dir);console.log(`Client browser assets (${dist}, source map excluded): ${(bytes/1024/1024).toFixed(2)} MB`);if(bytes>5*1024*1024){console.error("Client browser assets melewati baseline 5 MB");process.exitCode=1}
