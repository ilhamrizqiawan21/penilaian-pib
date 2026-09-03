export interface AcademicYear{id:number;name:string;semester:string;is_active?:number}
export interface SchoolClass{id:number;name:string;academic_year_id:number;academic_year_name:string;semester:string;grade_level?:string|null;homeroom_teacher?:string|null}
export interface Student{id:number;class_id:number;class_name:string;name:string;nis?:string|null;gender?:"L"|"P"|null;is_active:number}
export interface Chapter{id:number;title:string;academic_year_id?:number;semester?:string}
export interface Subchapter{id:number;title:string;chapter_id?:number}
export interface Assessment{id:number;title:string;subchapter_id?:number;weight:number}
export interface ScoreRow{id?:number;student_id:number;mistakes:number|null;score:number|null}
export interface Settings{schoolName?:string;schoolAddress?:string;teacherName?:string}
