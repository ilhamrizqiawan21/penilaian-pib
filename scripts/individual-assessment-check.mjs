// Run with PLAYWRIGHT_MODULE pointing to an existing Playwright installation.
// All API requests are intercepted: this never writes application data.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({executablePath:process.env.CHROME_BIN || '/opt/google/chrome/chrome',headless:true});
const base = process.env.PIB_TEST_URL || 'https://penilaian-pib.test';
let failed = 0;
async function scenario(name, test) {
  const context = await browser.newContext({ignoreHTTPSErrors:true,serviceWorkers:'block'});
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const state = {failure:0,delay:0,patches:0,writes:0};
  const sessions = new Map();
  const session = id => {
    if (!sessions.has(id)) sessions.set(id,{id,student_id:id,status:'ACTIVE',items:[
      {id:1,assessment_id:901,title:'Materi Uji A',score:null,mistakes:null,updated_at:null},
      {id:2,assessment_id:902,title:'Materi Uji B',score:null,mistakes:null,updated_at:null},
      {id:3,assessment_id:903,title:'Materi Uji C',score:86,mistakes:4,updated_at:'v0'},
    ]});
    return sessions.get(id);
  };
  await page.route('**/api/**',async route=>{
    const req=route.request(),u=new URL(req.url());let data={};
    switch(u.pathname){
      case '/api/classes':data=[{id:701,name:'Kelas Uji',academic_year_id:601,academic_year_name:'2026/2027',semester:'Ganjil'}];break;
      case '/api/chapters':data=[{id:501,title:'Bab Uji',academic_year_id:601}];break;
      case '/api/students':data=[{id:801,name:'Siswa Uji A'},{id:802,name:'Siswa Uji B'}];break;
      case '/api/subchapters':data=[{id:401,title:'Subbab Uji'}];break;
      case '/api/assessments':data=session(801).items.map(x=>({id:x.assessment_id,title:x.title}));break;
      case '/api/individual-sessions':{
        const body=req.method()==='GET'?null:req.postDataJSON();
        data=session(Number(body?.studentId || body?.id || u.searchParams.get('studentId')));
        if(req.method()==='PATCH'){
          state.patches++;
          if(data.status!=='ACTIVE')return route.fulfill({status:404,json:{error:'Sesi aktif tidak ditemukan'}});
          data.status=body.status;
        }
        break;
      }
      case '/api/sync':{
        state.writes++;
        if(state.delay)await new Promise(r=>setTimeout(r,state.delay));
        if(state.failure)return route.fulfill({status:state.failure,json:{error:state.failure===409?'Konflik data':'Server sementara gagal'}});
        const p=req.postDataJSON().payload, row=session(p.studentId);
        data={mistakes:p.mistakes,score:p.mistakes===null?null:90-p.mistakes,updatedAt:'v'+state.writes};
        row.items=row.items.map(x=>x.assessment_id===p.assessmentId?{...x,mistakes:data.mistakes,score:data.score,updated_at:data.updatedAt}:x);
        break;
      }
      case '/api/settings':data={schoolName:'Sekolah Uji',teacherName:'Guru Uji'};break;
      default:return route.fulfill({status:404,json:{error:'Unmocked API'}});
    }
    await route.fulfill({json:data});
  });
  const input = letter=>page.getByRole('textbox',{name:'Jumlah kesalahan Materi Uji '+letter,exact:true});
  const save = letter=>page.getByRole('button',{name:'Simpan nilai Materi Uji '+letter,exact:true});
  async function choose(){
    await page.selectOption('#individual-class','701');await page.selectOption('#individual-student','801');
    await page.selectOption('#individual-chapter','501');await page.selectOption('#individual-subchapter','401');
    await input('A').waitFor();
  }
  try{
    await page.goto(base+'/individual-assessment');await choose();
    await test({page,input,save,state,session,choose});
    console.log('PASS',name);
  }catch(error){failed++;console.error('FAIL',name,error.message)}
  finally{await context.close()}
}
try{
  await scenario('saving A preserves unsaved B',async({page,input,save})=>{
    await input('A').fill('2');await input('B').fill('5');await save('A').click();await page.waitForLoadState('networkidle');
    assert.equal(await input('B').inputValue(),'5');
  });
  await scenario('draft survives student change and reload',async({page,input,choose})=>{
    await input('B').fill('7');await page.selectOption('#individual-student','802');await page.waitForLoadState('networkidle');
    await page.selectOption('#individual-student','801');await page.waitForLoadState('networkidle');assert.equal(await input('B').inputValue(),'7');
    await page.reload();await choose();assert.equal(await input('B').inputValue(),'7');
  });
  await scenario('bulk save preserves invalid input',async({page,input,state})=>{
    await input('A').fill('2');await input('B').fill('91');await page.getByRole('button',{name:'Simpan Semua Nilai',exact:true}).click();await page.waitForLoadState('networkidle');
    assert.equal(await input('B').inputValue(),'91');assert.equal(state.writes,1);assert.equal(await input('B').getAttribute('aria-invalid'),'true');
  });
  await scenario('perfect action preserves existing scores and drafts',async({page,input})=>{
    await input('B').fill('5');await page.getByRole('button',{name:/Isi yang belum dinilai dengan 90/}).click();
    assert.equal(await input('A').inputValue(),'0');assert.equal(await input('B').inputValue(),'5');assert.equal(await input('C').inputValue(),'4');
  });
  await scenario('saving locks editing and context',async({page,input,save,state})=>{
    state.delay=500;await input('A').fill('2');await save('A').click();
    assert.equal(await input('B').isDisabled(),true);assert.equal(await page.locator('#individual-student').isDisabled(),true);
    await page.waitForLoadState('networkidle');
  });
  await scenario('failed bulk save keeps draft and stays on student',async({page,input,state})=>{
    state.failure=500;await input('A').fill('3');await page.getByRole('button',{name:/Simpan & siswa berikutnya/}).click();await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('#individual-student').inputValue(),'801');assert.equal(await input('A').inputValue(),'3');
    assert.ok(await page.getByText('Menunggu sinkronisasi',{exact:true}).count());
  });
  await scenario('completed session can be corrected without completing twice',async({page,input,state})=>{
    await input('A').fill('2');await input('B').fill('3');await page.getByRole('button',{name:'Simpan Semua Nilai',exact:true}).click();await page.waitForLoadState('networkidle');
    await input('A').fill('4');await page.getByRole('button',{name:'Simpan Semua Nilai',exact:true}).click();await page.waitForLoadState('networkidle');assert.equal(state.patches,1);
  });
  await scenario('conflict survives reload and can be restored explicitly',async({page,input,save,state,choose})=>{
    state.failure=409;await input('A').fill('6');await save('A').click();await page.waitForLoadState('networkidle');
    assert.equal(await input('A').inputValue(),'6');assert.equal(await input('A').isDisabled(),true);
    await page.reload();await choose();assert.equal(await input('A').inputValue(),'6');
    await page.getByRole('button',{name:'Kembalikan nilai Materi Uji A',exact:true}).click();
    await page.getByRole('button',{name:'Kembalikan nilai',exact:true}).click();await page.waitForLoadState('networkidle');
    assert.equal(await input('A').inputValue(),'');assert.equal(await input('A').isDisabled(),false);
  });
  await scenario('successful save and next uses correct student',async({page,input,state,session})=>{
    await input('A').fill('8');await page.getByRole('button',{name:/Simpan & siswa berikutnya/}).click();await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('#individual-student').inputValue(),'802');assert.equal(session(801).items[0].mistakes,8);assert.equal(await input('A').inputValue(),'');assert.equal(state.writes,1);
  });
  await scenario('blocked local storage retains input and warns before navigation',async({page,input})=>{
    await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('Storage unavailable','QuotaExceededError')}});
    await input('A').fill('9');assert.equal(await input('A').inputValue(),'9');
    let warned=false;page.once('dialog',async dialog=>{warned=true;await dialog.dismiss()});
    await page.selectOption('#individual-student','802');assert.equal(warned,true);assert.equal(await page.locator('#individual-student').inputValue(),'801');assert.equal(await input('A').inputValue(),'9');
  });
  await scenario('mobile controls fit within viewport',async({page,input})=>{
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.setViewportSize({width:320,height:850});
    await page.waitForFunction(()=>document.querySelector('.content').getBoundingClientRect().left===0);
    await input('A').fill('2');
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:'/tmp/pib-individual-mobile.png',fullPage:true});
    const bounds=await input('A').boundingBox();assert.ok(bounds.width>=24);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  });
}finally{await browser.close()}
if(failed)process.exitCode=1;
