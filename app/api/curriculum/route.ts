import {NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/db";
import {curriculumContext,previewCopy,copyPeriod,editCurriculum,moveCurriculum,CurriculumError} from "@/lib/curriculum";
const params=z.object({yearId:z.coerce.number().int().positive().optional(),chapterId:z.coerce.number().int().positive().optional(),subchapterId:z.coerce.number().int().positive().optional(),sourceId:z.coerce.number().int().positive().optional(),targetId:z.coerce.number().int().positive().optional(),preview:z.literal("copy").optional()});
function failure(e:unknown){return NextResponse.json({error:e instanceof CurriculumError?e.message:e instanceof z.ZodError?"Periksa nama, periode, dan bobot (0,1–100).":"Perubahan gagal. Periksa nama yang sudah digunakan."},{status:e instanceof CurriculumError?e.status:400})}
export async function GET(req:Request){try{const x=params.parse(Object.fromEntries(new URL(req.url).searchParams));return NextResponse.json(x.preview?previewCopy(db,x):curriculumContext(db,x))}catch(e){return failure(e)}}
export async function POST(req:Request){try{const {action,...body}=await req.json();if(action==="edit")editCurriculum(db,body);else if(action==="move")moveCurriculum(db,body);else if(action==="copy")return NextResponse.json(copyPeriod(db,body),{status:201});else throw new CurriculumError("Tindakan tidak valid.");return NextResponse.json({ok:true})}catch(e){return failure(e)}}
