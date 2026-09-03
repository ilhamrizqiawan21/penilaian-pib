import {expect,it} from "vitest";import {progress} from "./progress";
it("menghitung progress subbab",()=>{expect(progress(6,4)).toEqual({expected:6,assessed:4,complete:false,percent:67});expect(progress(0,0).complete).toBe(false)});
