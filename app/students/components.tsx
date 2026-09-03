"use client";

export function StudentTemplateButton(){
  return <a className="button" href="/api/students/template" download>Unduh template</a>;
}

export function StudentImportButton({onChange,disabled=false}:{onChange:(event:React.ChangeEvent<HTMLInputElement>)=>void;disabled?:boolean}){
  return <label className={`button${disabled?" disabled":""}`}>
    Pilih file impor
    <input hidden type="file" accept=".csv,.txt,.xlsx" onChange={onChange} disabled={disabled}/>
  </label>;
}
