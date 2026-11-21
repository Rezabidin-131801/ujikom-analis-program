/**
 * Algoritma sorting dan searching untuk koleksi data PFMS.
 * Sorting: merge sort stabil O(n log n), ruang O(n).
 * Searching: linear O(n); binary O(log n) untuk data terurut.
 */
export type Comparator<T> = (a: T, b: T) => number;

export function mergeSort<T>(items: readonly T[], compare: Comparator<T>): T[] {
  if (items.length <= 1) return [...items];
  const middle = Math.floor(items.length / 2);
  const left = mergeSort(items.slice(0, middle), compare);
  const right = mergeSort(items.slice(middle), compare);
  const result: T[] = [];
  let i = 0,
    j = 0;
  while (i < left.length && j < right.length) {
    // <= menjaga stabilitas: elemen kiri dipertahankan saat nilainya sama.
    if (compare(left[i], right[j]) <= 0) result.push(left[i++]);
    else result.push(right[j++]);
  }
  return result.concat(left.slice(i), right.slice(j));
}

export function linearSearch<T>(
  items: readonly T[],
  predicate: (item: T) => boolean,
): number {
  for (let i = 0; i < items.length; i++) if (predicate(items[i])) return i;
  return -1;
}

/** Mengembalikan indeks kecocokan pertama; items wajib sudah diurutkan. */
export function binarySearch<T>(
  items: readonly T[],
  target: T,
  compare: Comparator<T>,
): number {
  let low = 0,
    high = items.length - 1;
  while (low <= high) {
    const middle = low + Math.floor((high - low) / 2);
    const order = compare(items[middle], target);
    if (order === 0) {
      let first = middle;
      while (first > 0 && compare(items[first - 1], target) === 0) first--;
      return first;
    }
    if (order < 0) low = middle + 1;
    else high = middle - 1;
  }
  return -1;
}

export function compareText(a: string, b: string): number {
  return a.localeCompare(b, "id", { sensitivity: "base", numeric: true });
}
