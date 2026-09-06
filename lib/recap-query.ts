import type Database from "better-sqlite3";
import type {RecapFilter} from "./filters";
import {getRecapRows} from "./recap-rows";
import {summarizeRecap} from "./recap-data";
export function getRecap(database:Database.Database,filter:RecapFilter){
  return summarizeRecap(getRecapRows(database,filter));
}
