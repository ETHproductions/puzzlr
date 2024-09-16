export class Constraint {
    id;
    runCheck = () => true;
    variables = [];
    targets = [];
    name = "_default_";
    global = false;
    static build(id, check, variables, targets) {
        const constraint = new Constraint(id);
        constraint.name = check.name;
        constraint.global = !!check.global;
        constraint.runCheck = (...extraArgs) => check(variables, ...targets, ...extraArgs);
        constraint.variables = variables;
        constraint.targets = targets;
        return constraint;
    }
    constructor(id) {
        this.id = id;
    }
    toString() {
        let varstring = this.variables
            .slice(0, 5)
            .map((v) => (v.vpos ? "V" : "S") + v.var_id)
            .join(", ");
        if (this.variables.length > 5)
            varstring += ", ...";
        return `C${this.id} #${this.name} ${this.targets} (${varstring})`;
    }
}
