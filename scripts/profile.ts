import { performance } from 'node:perf_hooks';
import { mergeSort, linearSearch, binarySearch } from '../src/lib/algorithms';

const sizes = [1_000, 10_000, 50_000];
console.log('PFMS algorithm benchmark (milliseconds; local machine, indicative only)');
for (const size of sizes) {
  const input = Array.from({length:size}, (_,i)=>Math.floor(Math.random()*size*10));
  const sorted = [...input].sort((a,b)=>a-b);
  const target = sorted[Math.floor(size/2)];
  const measure = (name:string, fn:()=>unknown) => {
    const start = performance.now(); fn();
    console.log(`${size.toLocaleString()} | ${name.padEnd(14)} | ${(performance.now()-start).toFixed(3)} ms`);
  };
  measure('mergeSort',()=>mergeSort(input,(a,b)=>a-b));
  measure('linearSearch',()=>linearSearch(input,x=>x===target));
  measure('binarySearch',()=>binarySearch(sorted,target,(a,b)=>a-b));
}
