module.exports = {
    SUM_EQUALS: function (vars, target) {
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
};
