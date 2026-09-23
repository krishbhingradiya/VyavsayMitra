/**
 * VYAVSAYMITRA — Formula Dependency Resolver & Cycle Detector
 * 
 * Manages the Directed Acyclic Graph (DAG) of formula calculations:
 * - Detects circular dependencies (e.g. A -> B -> A)
 * - Orders formulas in topological execution order
 * - Identifies missing upstream producer formulas for calculated variables
 */

class DependencyResolver {
  constructor() {
    this.formulas = new Map(); // formulaId -> formulaDef
    this.variableProducers = new Map(); // outputVarName -> formulaId
  }

  /**
   * Registers a formula in the dependency graph
   */
  addFormula(formulaDef) {
    if (!formulaDef || !formulaDef.formulaId) {
      throw new Error('Valid formula with formulaId required');
    }
    this.formulas.set(formulaDef.formulaId, formulaDef);

    // Map outputs to this producer
    if (Array.isArray(formulaDef.outputs)) {
      for (const out of formulaDef.outputs) {
        this.variableProducers.set(out, formulaDef.formulaId);
      }
    }
  }

  /**
   * Builds the adjacency list: formulaId -> list of formulaIds it directly depends on
   */
  buildGraph() {
    const graph = new Map();

    for (const [id, formula] of this.formulas.entries()) {
      const dependencies = new Set();
      const inputVars = Array.isArray(formula.inputs) ? formula.inputs : [];

      for (const inputVar of inputVars) {
        const varName = typeof inputVar === 'string' ? inputVar : inputVar.parameterId;
        const producerId = this.variableProducers.get(varName);

        // If another registered formula produces this input, we depend on that formula
        if (producerId && producerId !== id) {
          dependencies.add(producerId);
        }
      }

      graph.set(id, Array.from(dependencies));
    }

    return graph;
  }

  /**
   * Detects circular dependencies in the registered formulas
   * 
   * @returns {{ hasCycle: boolean, cycle: string[] | null }}
   */
  detectCircularDependency() {
    const graph = this.buildGraph();
    const visited = new Map(); // 0 = unvisited, 1 = visiting (in recursion stack), 2 = visited
    const parentMap = new Map();

    for (const id of graph.keys()) {
      visited.set(id, 0);
    }

    for (const node of graph.keys()) {
      if (visited.get(node) === 0) {
        const cycle = this._dfsCycle(node, graph, visited, parentMap, []);
        if (cycle) {
          return {
            hasCycle: true,
            cycle
          };
        }
      }
    }

    return { hasCycle: false, cycle: null };
  }

  _dfsCycle(current, graph, visited, parentMap, path) {
    visited.set(current, 1);
    path.push(current);

    const neighbors = graph.get(current) || [];
    for (const neighbor of neighbors) {
      if (visited.get(neighbor) === 1) {
        // Cycle detected! Extract the cycle path
        const cycleStartIndex = path.indexOf(neighbor);
        const cyclePath = path.slice(cycleStartIndex);
        cyclePath.push(neighbor); // Close the loop
        return cyclePath;
      }
      if (visited.get(neighbor) === 0) {
        const res = this._dfsCycle(neighbor, graph, visited, parentMap, path);
        if (res) return res;
      }
    }

    path.pop();
    visited.set(current, 2);
    return null;
  }

  /**
   * Resolves topological execution order for a target formula or set of formulas
   * 
   * @param {string[]} [targetFormulaIds] - Optional target formulas to resolve
   * @returns {string[]} Execution order of formula IDs
   */
  resolveExecutionOrder(targetFormulaIds = null) {
    const cycleCheck = this.detectCircularDependency();
    if (cycleCheck.hasCycle) {
      throw new Error(`Circular dependency detected in formula pipeline: ${cycleCheck.cycle.join(' -> ')}`);
    }

    const graph = this.buildGraph();
    const result = [];
    const visited = new Set();
    const targets = targetFormulaIds || Array.from(this.formulas.keys());

    function visit(node) {
      if (visited.has(node)) return;
      const dependencies = graph.get(node) || [];
      for (const dep of dependencies) {
        visit(dep);
      }
      visited.add(node);
      result.push(node);
    }

    for (const target of targets) {
      if (!this.formulas.has(target)) {
        throw new Error(`Target formula '${target}' is not registered`);
      }
      visit(target);
    }

    return result;
  }
}

module.exports = {
  DependencyResolver
};
