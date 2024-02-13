export function SUM_EQUALS (vars, target) {
    let sums = new Set([0]);
    for (let v of vars) {
        let oldsums = sums;
        sums = new Set();
        for (let value of v.value)
            for (let prev of oldsums)
                sums.add(prev + value);
    }
    return sums.has(target);
}

export function CONTAINS_ALL(vars, target) {
    let sets = new Set([0n]);
    for (let v of vars) {
        let oldsets = sets;
        sets = new Set();
        for (let value of v.value) {
            let index = BigInt(target.indexOf(value));
            for (let prev of oldsets) {
                sets.add(prev | 1n << index);
            }
        }
    }
    return sets.has(2n ** BigInt(target.length) - 1n);
}