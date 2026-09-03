import {describe,expect,it} from "vitest";
import {calculateScore,weightedAverage} from "@/lib/scoring";
describe("scoring",()=>{it("menghitung nilai dari kesalahan",()=>{expect(calculateScore(0)).toBe(90);expect(calculateScore(3)).toBe(87);expect(calculateScore(90)).toBe(0);expect(calculateScore(null)).toBeNull()});it("menghitung rata-rata berbobot dan mengabaikan kosong",()=>{expect(weightedAverage([{score:90,weight:1},{score:80,weight:2},{score:null,weight:10}])).toBe(83.3);expect(weightedAverage([{score:null,weight:1}])).toBeNull()})});
