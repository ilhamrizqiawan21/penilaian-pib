import {describe,it,expect} from "vitest";
import {isUnassessed,parseMistakes} from "./assessment-workspace";
describe("assessment input",()=>{
  it("keeps an empty score different from zero mistakes and zero score",()=>{
    expect(parseMistakes("")).toEqual({valid:true,mistakes:null,score:null});
    expect(parseMistakes("0")).toEqual({valid:true,mistakes:0,score:90});
    expect(parseMistakes("90")).toEqual({valid:true,mistakes:90,score:0});
    expect(isUnassessed(0)).toBe(false);expect(isUnassessed(null)).toBe(true);
  });
  it.each(["-1","91","1.5","NaN","1e1"])("rejects invalid input %s",raw=>expect(parseMistakes(raw).valid).toBe(false));
});
