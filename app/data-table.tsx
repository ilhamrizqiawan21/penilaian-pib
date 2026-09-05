"use client";
import {useEffect,useId,useState,ReactNode} from "react";
import {ColumnDef,SortingState,flexRender,getCoreRowModel,getPaginationRowModel,getSortedRowModel,useReactTable} from "@tanstack/react-table";
import {ArrowDown,ArrowUp,ArrowUpDown,ChevronLeft,ChevronRight} from "lucide-react";
import {EmptyState} from "./ui";

export function DataTable<T extends {id:number}>({data,columns,label,mobileRow,emptyAction,initialSort="name"}:{data:T[];columns:ColumnDef<T>[];label:string;mobileRow:(row:T)=>ReactNode;emptyAction?:ReactNode;initialSort?:string}) {
  const id=useId();
  const [sorting,setSorting]=useState<SortingState>([{id:initialSort,desc:false}]);
  const [pagination,setPagination]=useState({pageIndex:0,pageSize:20});
  const [compact,setCompact]=useState(false);
  useEffect(()=>{setPagination(p=>({...p,pageIndex:0}))},[data]);
  const table=useReactTable({data,columns,state:{sorting,pagination},onSortingChange:setSorting,onPaginationChange:setPagination,getCoreRowModel:getCoreRowModel(),getSortedRowModel:getSortedRowModel(),getPaginationRowModel:getPaginationRowModel(),getRowId:row=>String(row.id),autoResetPageIndex:false});
  const sortColumns=table.getAllLeafColumns().filter(c=>c.getCanSort());
  const rows=table.getRowModel().rows;
  return <div>
    <div className="toolbar-footer"><span aria-live="polite">{data.length} {label.toLowerCase()}</span><div className="actions">
      <label className="sr-only" htmlFor={`${id}-sort`}>Urutkan {label.toLowerCase()}</label>
      <select id={`${id}-sort`} style={{width:"auto",minHeight:34,padding:6}} value={sorting[0]?.id??""} onChange={e=>setSorting([{id:e.target.value,desc:false}])}>{sortColumns.map(c=><option key={c.id} value={c.id}>Urutkan: {typeof c.columnDef.header==="string"?c.columnDef.header:c.id}</option>)}</select>
      <button type="button" className="icon-button" aria-label={sorting[0]?.desc?"Urutkan naik":"Urutkan turun"} onClick={()=>setSorting(s=>s.length?[{...s[0],desc:!s[0].desc}]:s)}>{sorting[0]?.desc?<ArrowDown size={15}/>:<ArrowUp size={15}/>}</button>
      <button type="button" className="desktop-data" aria-pressed={compact} onClick={()=>setCompact(v=>!v)}>Baris ringkas</button>
    </div></div>
    {!data.length?<EmptyState title="Tidak ada data yang cocok" action={emptyAction}>Ubah pencarian atau filter untuk melihat data lainnya.</EmptyState>:<>
      <div className={`table-wrap desktop-data${compact?" table-compact":""}`}><table><caption className="sr-only">{label}</caption><thead>{table.getHeaderGroups().map(group=><tr key={group.id}>{group.headers.map(header=><th key={header.id} scope="col" aria-sort={header.column.getIsSorted()==="asc"?"ascending":header.column.getIsSorted()==="desc"?"descending":undefined}>{header.column.getCanSort()?<button className="sort-button" type="button" onClick={header.column.getToggleSortingHandler()}>{flexRender(header.column.columnDef.header,header.getContext())}<ArrowUpDown size={12} aria-hidden="true"/></button>:flexRender(header.column.columnDef.header,header.getContext())}</th>)}</tr>)}</thead><tbody>{rows.map(row=><tr key={row.id}>{row.getVisibleCells().map(cell=><td key={cell.id}>{flexRender(cell.column.columnDef.cell,cell.getContext())}</td>)}</tr>)}</tbody></table></div>
      <div className="mobile-data">{rows.map(row=><article key={row.id} className="mobile-data-item">{mobileRow(row.original)}</article>)}</div>
      <div className="table-pagination"><span>{pagination.pageIndex*pagination.pageSize+1}–{Math.min((pagination.pageIndex+1)*pagination.pageSize,data.length)} dari {data.length}</span><div className="actions"><label htmlFor={`${id}-size`}>Per halaman</label><select id={`${id}-size`} value={pagination.pageSize} onChange={e=>table.setPageSize(Number(e.target.value))}>{[10,20,50].map(size=><option key={size}>{size}</option>)}</select></div><div className="actions"><button type="button" disabled={!table.getCanPreviousPage()} onClick={()=>table.previousPage()} aria-label="Halaman sebelumnya"><ChevronLeft size={16}/></button><span>Halaman {pagination.pageIndex+1} / {Math.max(1,table.getPageCount())}</span><button type="button" disabled={!table.getCanNextPage()} onClick={()=>table.nextPage()} aria-label="Halaman berikutnya"><ChevronRight size={16}/></button></div></div>
    </>}
  </div>;
}
