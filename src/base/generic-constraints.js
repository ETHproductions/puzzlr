function find_sums(vars) {
    let sums = new Set([0]);
    for (let v of vars) {
        let oldsums = sums;
        sums = new Set();
        for (let value of v.value)
            for (let prev of oldsums)
                sums.add(prev + value);
    }
    return sums;
}
export function SUM_EQUALS(vars, target) {
    let sums = find_sums(vars);
    return sums.has(target);
}
export function SUM_EQUALS_ANY(vars, target) {
    let sums = find_sums(vars);
    return target.some(s => sums.has(s));
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

export function CONTIG_EDGE_ALL([edge], target) {
    let all_remaining = edge.grid.edges.filter(e => e.value.length == 1 && e.value[0] == target);
    let check_queue = all_remaining.slice(0, 1);
    let remaining = new Set(all_remaining.slice(1));
    let found = new Set();

    if (remaining.size == 0) return true;

    while (check_queue.length > 0) {
        let next = check_queue.pop();
        found.add(next);
        for (let e of [...next.fromVert.edges, ...next.toVert.edges]) {
            if (found.has(e) || check_queue.includes(e)) continue;
            if (!e.value?.includes(target)) continue;
            check_queue.push(e);
            if (remaining.has(e)) {
                remaining.delete(e);
                if (remaining.size == 0) return true;
            }
        }
    }
    return false;
}
CONTIG_EDGE_ALL.global = true;
