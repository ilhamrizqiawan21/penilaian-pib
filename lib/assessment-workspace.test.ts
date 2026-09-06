import {describe,it,expect} from "vitest";
import {isUnassessed,parseMistakes,stepMistakes} from "./assessment-workspace";
describe("assessment input",()=>{
  it.each([["",1,"1"],["",-1,"0"],["0",-1,"0"],["90",1,"90"],["2",1,"3"],["2",-1,"1"]] as const)("steps %s by %s", (raw,delta,result)=>{
    expect(stepMistakes(raw,delta)).toBe(result);
  });
  it.each(["-1","91","1.5","NaN","1e1"])("preserves invalid input %s",raw=>{
    expect(stepMistakes(raw,1)).toBeNull();
    expect(stepMistakes(raw,-1)).toBeNull();
  });
  it("keeps an empty score different from zero mistakes and zero score",()=>{
    expect(parseMistakes("")).toEqual({valid:true,mistakes:null,score:null});
    expect(parseMistakes("0")).toEqual({valid:true,mistakes:0,score:90});
    expect(parseMistakes("90")).toEqual({valid:true,mistakes:90,score:0});
    expect(isUnassessed(0)).toBe(false);expect(isUnassessed(null)).toBe(true);
  });
  it.each(["-1","91","1.5","NaN","1e1"])("rejects invalid input %s",raw=>expect(parseMistakes(raw).valid).toBe(false));
});
