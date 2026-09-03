const base=process.env.PIB_URL||"http://127.0.0.1:3000";let passed=0;
async function check(name,path,status,options={}){const r=await fetch(base+path,options);if(r.status!==status)throw Error(`${name}: expected ${status}, got ${r.status}`);passed++;console.log(`ok - ${name}`);return r}
await check("API tanpa login ditolak","/api/students",401);
const login=await check("login valid","/api/auth/login",200,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:"guru@pib.local",password:"pib12345"})});
const cookie=login.headers.get("set-cookie")?.split(";")[0];if(!cookie)throw Error("cookie session tidak diterbitkan");
const headers={cookie};
for(const path of ["/api/academic-years","/api/classes","/api/students","/api/templates","/api/chapters","/api/subchapters","/api/assessments"])await check(`master ${path}`,path,200,{headers});
await check("scores memerlukan assessmentId","/api/scores",400,{headers});
await check("rekap","/api/recap",200,{headers});
await check("excel","/api/export",200,{headers});
await check("pdf","/api/pdf",200,{headers});
await check("backup","/api/backup",200,{headers});
await check("restore invalid ditolak","/api/restore",400,{method:"POST",headers:{...headers,"content-type":"application/json"},body:JSON.stringify({version:99,data:{}})});
console.log(`API smoke test lulus: ${passed} pemeriksaan`);
