export function progress(expected:number,assessed:number){return {expected,assessed,complete:expected>0&&assessed===expected,percent:expected?Math.round(assessed/expected*100):0};}
