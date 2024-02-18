export function SUM_EQUALS(vars, target) {
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

export function SUM_EQUALS_IF([var1, ...vars], var_target, sum_target) {
    if (var1.value.length > 1 || var1.value[0] != var_target)
        return true;
    return SUM_EQUALS(vars, sum_target);
}

export function CONTAINS_ALL(vars, target) {
    let sets = new Set([0]);
    for (let v of vars) {
        let oldsets = sets;
        sets = new Set();
        for (let value of v.value) {
            let index = target.indexOf(value);
            for (let prev of oldsets) {
                sets.add(prev | 1 << index);
            }
        }
    }
    return sets.has(2 ** target.length - 1);
}
