"use client";
import Link from "next/link";
import {ReactNode,createContext,useCallback,useContext,useEffect,useId,useRef,useState} from "react";
import {Check,CheckCircle2,Inbox,Search,X} from "lucide-react";
type Toast={id:number;message:string};
const ToastContext=createContext<(message:string)=>void>(()=>{});
export function ToastProvider({children}:{children:ReactNode}) {
  const [items,setItems]=useState<Toast[]>([]);
  const timers=useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(()=>()=>timers.current.forEach(clearTimeout),[]);
  const show=useCallback((message:string)=>{
    const id=Date.now()+Math.random();
    setItems(x=>[...x.slice(-2),{id,message}]);
    timers.current.push(setTimeout(()=>setItems(x=>x.filter(t=>t.id!==id)),4500));
  },[]);
  return <ToastContext.Provider value={show}>{children}<div className="toast-region" aria-live="polite" aria-atomic="true">{items.map(t=><div className="toast" key={t.id}><CheckCircle2 size={17} aria-hidden="true"/>{t.message}<button type="button" className="ghost icon-button" style={{color:"inherit",minHeight:28,minWidth:28,padding:4}} aria-label="Tutup pemberitahuan" onClick={()=>setItems(x=>x.filter(item=>item.id!==t.id))}><X size={14}/></button></div>)}</div></ToastContext.Provider>;
}
export const useToast=()=>useContext(ToastContext);
export function PageHeader({eyebrow,title,description,children}:{eyebrow?:string;title:string;description?:string;children?:ReactNode}){return <header className="page-header"><div>{eyebrow&&<p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description&&<p className="subtitle">{description}</p>}</div>{children&&<div className="actions">{children}</div>}</header>}
export function Breadcrumb({items}:{items:{label:string;href?:string}[]}){return <nav className="breadcrumb" aria-label="Breadcrumb"><ol>{items.map((item,index)=><li key={index}>{item.href?<Link href={item.href}>{item.label}</Link>:<span aria-current="page">{item.label}</span>}</li>)}</ol></nav>}
export function Alert({children,type="info"}:{children:ReactNode;type?:"info"|"success"|"error"}){return <div className={"alert "+type} role={type==="error"?"alert":"status"}>{children}</div>}
export function EmptyState({title="Belum ada data",children,action}:{title?:string;children?:ReactNode;action?:ReactNode}){return <div className="empty"><span className="empty-icon"><Inbox size={22} aria-hidden="true"/></span><strong>{title}</strong>{children&&<p>{children}</p>}{action}</div>}
export function LoadingState({label="Memuat data"}:{label?:string}){return <div className="loading-stack" role="status" aria-busy="true"><span className="sr-only">{label}</span><div className="loading"/><div className="loading loading-short"/></div>}
export function ErrorState({message,onRetry}:{message:string;onRetry?:()=>void}){return <div className="error-state" role="alert"><strong>Data belum dapat dimuat</strong><p>{message}</p>{onRetry&&<button onClick={onRetry}>Coba lagi</button>}</div>}
export function StatusBadge({children,tone="neutral"}:{children:ReactNode;tone?:"neutral"|"success"|"warning"|"danger"}){return <span className={"badge "+tone}>{children}</span>}
function DialogFrame({title,children,onClose,alert=false,busy=false}:{title:string;children:ReactNode;onClose:()=>void;alert?:boolean;busy?:boolean}) {
  const titleId=useId(),box=useRef<HTMLDialogElement>(null),close=useRef(onClose);
  close.current=onClose;
  useEffect(()=>{
    const element=box.current,previous=document.activeElement as HTMLElement|null;
    element?.showModal();
    const overflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    return ()=>{element?.close();document.body.style.overflow=overflow;previous?.focus()};
  },[]);
  return <dialog ref={box} className="modal" role={alert?"alertdialog":"dialog"} aria-labelledby={titleId} aria-busy={busy} onCancel={e=>{e.preventDefault();if(!busy)close.current()}} onClick={e=>{
    if(e.target!==e.currentTarget||busy)return;
    const r=e.currentTarget.getBoundingClientRect();
    if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close.current();
  }}><header className="modal-header"><h2 id={titleId}>{title}</h2><button type="button" className="icon-button ghost" aria-label="Tutup dialog" disabled={busy} onClick={()=>close.current()}><X size={18}/></button></header>{children}</dialog>;
}
export function ConfirmDialog({title,children,onClose,onConfirm,confirmLabel="Konfirmasi",busy=false}:{title:string;children:ReactNode;onClose:()=>void;onConfirm:()=>void;confirmLabel?:string;busy?:boolean}){return <DialogFrame title={title} onClose={onClose} busy={busy} alert><p>{children}</p><div className="modal-footer"><button onClick={onClose} disabled={busy}>Batal</button><button className="danger" onClick={onConfirm} disabled={busy}>{busy?"Memproses…":confirmLabel}</button></div></DialogFrame>}
export function Modal({title,children,onClose,busy=false}:{title:string;children:ReactNode;onClose:()=>void;busy?:boolean}){return <DialogFrame title={title} onClose={onClose} busy={busy}>{children}</DialogFrame>}
export function CheckIcon(){return <Check size={18} aria-hidden="true"/>}
export function SearchField({label,value,onChange,placeholder="Cari…"}:{label:string;value:string;onChange:(value:string)=>void;placeholder?:string}){const id=useId();return <div className="search-field"><label className="sr-only" htmlFor={id}>{label}</label><Search size={16} aria-hidden="true"/><input id={id} type="search" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></div>}
export function ProgressBar({value,label}:{value:number;label:string}){return <div className="progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0,Math.min(100,value))}><span style={{width:Math.max(0,Math.min(100,value))+"%"}}/></div>}
