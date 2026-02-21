const DAWKINS_DEFAULT = "Methinks it is like a weasel.";
const TARGET_PADDING = 2;
const WEASEL_CHARS = " " + "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ" + "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";

const STEINER_PRESETS = {
  1: { label: "Stops only", foodSources: 15, mutationLevel: 0 },
  2: { label: "Stop count evolves", foodSources: 15, mutationLevel: 3 },
  3: { label: "Route rewiring", foodSources: 15, mutationLevel: 4 },
  4: { label: "Steiner insertion", foodSources: 15, mutationLevel: 5 },
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(text) {
  return text[randomInt(0, text.length - 1)];
}

function mismatchScore(candidate, target) {
  let score = Math.abs(candidate.length - target.length);
  const n = Math.min(candidate.length, target.length);
  for (let i = 0; i < n; i++) {
    if (candidate[i] !== target[i]) score += 1;
  }
  return score;
}

function selectBest(candidates, target) {
  let best = null;
  let bestScore = target.length + 1;
  for (const candidate of candidates) {
    const score = mismatchScore(candidate, target);
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return [best, bestScore];
}

class DawkinsDemo {
  constructor(root) {
    this.root = root;
    this.targetEl = root.querySelector("#target-input");
    this.outputEl = root.querySelector("#dawkins-output");
    this.genEl = root.querySelector("#dawkins-generations");
    this.statusEl = root.querySelector("#dawkins-status");

    root.querySelector("#dawkins-reset").addEventListener("click", () => this.reset());
    root.querySelector("#dawkins-run").addEventListener("click", () => this.run());
    root.querySelector("#dawkins-stop").addEventListener("click", () => this.stop());

    this.running = false;
    this.frameToken = null;
    this.reset();
  }

  randomString(length) {
    let out = "";
    for (let i = 0; i < length; i++) out += randomChoice(WEASEL_CHARS);
    return out;
  }

  changeCharacter(source, idx) {
    return `${source.slice(0, idx)}${randomChoice(WEASEL_CHARS)}${source.slice(idx + 1)}`;
  }

  mutateChild(parent) {
    let child = parent;
    let mutationCount = 0;
    for (let i = 0; i < parent.length; i++) {
      if (Math.random() < 0.05) mutationCount += 1;
    }

    for (let i = 0; i < mutationCount; i++) {
      if (child.length === 0) break;
      const idx = randomInt(0, child.length - 1);
      child = this.changeCharacter(child, idx);
    }
    return child;
  }

  generateChildren(parent) {
    const children = [parent];
    for (let i = 0; i < 1000; i++) children.push(this.mutateChild(parent));
    return children;
  }

  printLine(generation, weasel, distance, targetLength) {
    const width = targetLength + TARGET_PADDING;
    const padded = weasel.padEnd(width, " ");
    this.outputEl.value += `Gen ${String(generation).padStart(3, " ")}: ${padded}  Distance: ${distance}\n`;
    this.outputEl.scrollTop = this.outputEl.scrollHeight;
  }

  reset() {
    this.stop();
    const target = this.targetEl.value || DAWKINS_DEFAULT;
    this.generation = 0;
    this.parent = this.randomString(target.length);
    this.outputEl.value = "";
    this.genEl.textContent = "0";
    this.statusEl.textContent = "Ready";
  }

  stop() {
    this.running = false;
    if (this.frameToken) cancelAnimationFrame(this.frameToken);
    this.frameToken = null;
    if (this.statusEl.textContent !== "Converged") this.statusEl.textContent = "Stopped";
  }

  step() {
    const target = this.targetEl.value || DAWKINS_DEFAULT;
    this.generation += 1;

    const [current, currentDistance] = selectBest([this.parent], target);
    this.printLine(this.generation, current, currentDistance, target.length);

    if (currentDistance === 0) {
      this.running = false;
      this.genEl.textContent = String(this.generation);
      this.statusEl.textContent = "Converged";
      return;
    }

    const [selected] = selectBest(this.generateChildren(this.parent), target);
    this.parent = selected;
    this.genEl.textContent = String(this.generation);
  }

  run() {
    if (this.running) return;
    this.running = true;
    this.statusEl.textContent = "Running";

    const tick = () => {
      if (!this.running) return;
      for (let i = 0; i < 2 && this.running; i++) this.step();
      if (this.running) this.frameToken = requestAnimationFrame(tick);
    };

    this.frameToken = requestAnimationFrame(tick);
  }
}

class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  rangeFrom(fromP) {
    const xdiff = Math.abs(fromP.x - this.x);
    const ydiff = Math.abs(fromP.y - this.y);
    return Math.max(xdiff, ydiff) + Math.min(xdiff, ydiff) / 2;
  }

  randomIncrement(pos, scale) {
    const offset = scale / 2.0;
    const incr = Math.random() * scale - offset;
    return incr + pos;
  }

  randomMove(scale) {
    this.x = this.randomIncrement(this.x, scale);
    this.y = this.randomIncrement(this.y, scale);
  }
}

class Line {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }

  length() {
    return this.start.rangeFrom(this.end);
  }
}

class Gene {
  init(ix) {
    this.geneIx = ix;
    this.parentPath = -1;
    this.corner = new Point(Math.random() * 1000, Math.random() * 1000);
    this.corner.randomMove(100);
    this.childPaths = [];
  }

  isRoot() { return this.parentPath === -1; }
  isLeaf() { return this.childPaths.length === 0; }
  isAssigned() { return !(this.isRoot() && this.isLeaf()); }

  addChildPath(childGene) {
    childGene.parentPath = this.geneIx;
    this.childPaths.push(childGene.geneIx);
  }

  removeChildPath(childGene) {
    childGene.parentPath = -1;
    const childIx = this.childPaths.indexOf(childGene.geneIx);
    if (childIx >= 0) this.childPaths.splice(childIx, 1);
  }

  copyIn(incoming) {
    this.geneIx = incoming.geneIx;
    this.parentPath = incoming.parentPath;
    this.corner = new Point(incoming.corner.x, incoming.corner.y);
    this.childPaths = [...incoming.childPaths];
  }
}

class Dna {
  init(nrGenes) {
    this.genes = [];
    for (let i = 0; i < nrGenes; i++) {
      const g = new Gene();
      g.init(i);
      this.genes.push(g);
    }
    for (let i = 1; i < nrGenes; i++) this.genes[i - 1].addChildPath(this.genes[i]);
  }

  getGene(geneIx) {
    const g = this.genes.find((x) => x.geneIx === geneIx);
    if (!g) throw new Error(`Gene not found with index ${geneIx}`);
    return g;
  }

  highestGeneIx() {
    let maxIx = 0;
    for (const g of this.genes) if (g.geneIx > maxIx) maxIx = g.geneIx;
    return maxIx;
  }

  addNewGene() {
    const newGene = new Gene();
    newGene.init(this.highestGeneIx() + 1);
    this.genes.push(newGene);
    return newGene;
  }

  removeChildGeneFromParent(childIx, parentIx) {
    const child = this.getGene(childIx);
    const parent = this.getGene(parentIx);
    parent.removeChildPath(child);
  }

  addChildGeneToParent(childIx, parentIx) {
    const child = this.getGene(childIx);
    const parent = this.getGene(parentIx);
    parent.addChildPath(child);
  }

  moveGeneToNewParent(geneToMoveIx, newParentIx) {
    const geneToMove = this.getGene(geneToMoveIx);
    if (!geneToMove.isAssigned()) throw new Error("Gene to move is not assigned.");
    if (geneToMove.isRoot()) throw new Error("Cannot move the root gene.");
    this.removeChildGeneFromParent(geneToMoveIx, geneToMove.parentPath);
    this.addChildGeneToParent(geneToMoveIx, newParentIx);
  }

  deleteGene(geneIx) {
    if (geneIx === 0) throw new Error("Cannot delete root gene.");
    const ix = this.genes.findIndex((g) => g.geneIx === geneIx);
    if (ix === -1) throw new Error(`Gene not found with index ${geneIx}`);

    const gene = this.getGene(geneIx);
    const children = [...gene.childPaths];
    for (const ch of children) this.moveGeneToNewParent(ch, gene.parentPath);

    this.removeChildGeneFromParent(geneIx, gene.parentPath);
    this.genes.splice(ix, 1);
  }

  isParentOrDescendent(rootIx, targetIx) {
    const root = this.getGene(rootIx);
    if (root.geneIx === targetIx) return true;
    for (const childIx of root.childPaths) {
      if (this.isParentOrDescendent(childIx, targetIx)) return true;
    }
    return false;
  }

  randomGene() {
    const ix = randomInt(0, this.genes.length - 1);
    return this.genes[ix];
  }

  corners() {
    return this.genes.map((g) => g.corner);
  }

  paths() {
    const pths = [];
    for (const g of this.genes) {
      for (const cp of g.childPaths) {
        pths.push(new Line(g.corner, this.getGene(cp).corner));
      }
    }
    return pths;
  }

  copyIn(other) {
    this.genes = [];
    for (const g of other.genes) {
      const ng = new Gene();
      ng.copyIn(g);
      this.genes.push(ng);
    }
  }
}

class SWeasel {
  constructor(mutationLevel) {
    this.mutationLevel = mutationLevel;
    this.isDead = false;
  }

  init(nrCorners) {
    this.dna = new Dna();
    this.dna.init(nrCorners);
  }

  copyIn(inWeasel) {
    if (!this.dna) this.dna = new Dna();
    this.dna.copyIn(inWeasel.dna);
    this.isDead = false;
  }

  corners() { return this.dna.corners(); }
  paths() { return this.dna.paths(); }

  randomMoveCorner() {
    const geneToMove = this.dna.randomGene();
    geneToMove.corner.randomMove(50);
  }

  randomAddCorner() {
    const parentGeneIx = this.dna.randomGene().geneIx;
    const newGene = this.dna.addNewGene();
    this.dna.addChildGeneToParent(newGene.geneIx, parentGeneIx);
  }

  randomDeleteCorner() {
    let aGene;
    do {
      aGene = this.dna.randomGene();
    } while (aGene.isRoot() || !aGene.isAssigned());
    this.dna.deleteGene(aGene.geneIx);
  }

  randomMovePath() {
    let geneToMove;
    let newParent;
    do {
      geneToMove = this.dna.randomGene();
    } while (geneToMove.isRoot() || !geneToMove.isAssigned());

    do {
      newParent = this.dna.randomGene();
    } while (!newParent.isAssigned());

    if (this.dna.isParentOrDescendent(geneToMove.geneIx, newParent.geneIx)) {
      this.isDead = true;
    } else {
      this.dna.moveGeneToNewParent(geneToMove.geneIx, newParent.geneIx);
    }
  }

  randomInsertCorner() {
    let aGene;
    let i = 0;
    do {
      aGene = this.dna.randomGene();
      if (i++ > 40) break;
    } while (aGene.isRoot() || aGene.isLeaf() || !aGene.isAssigned());

    if (i <= 40) {
      const parentGene = this.dna.getGene(aGene.parentPath);
      const newGene = this.dna.addNewGene();
      for (const ch of [...aGene.childPaths]) this.dna.moveGeneToNewParent(ch, newGene.geneIx);
      this.dna.moveGeneToNewParent(aGene.geneIx, newGene.geneIx);
      this.dna.addChildGeneToParent(newGene.geneIx, parentGene.geneIx);
    }
  }

  mutate() {
    const nrMutations = Math.floor(Math.random() * 3);
    for (let i = 0; i < nrMutations; i++) {
      const mutationType = Math.floor(Math.random() * this.mutationLevel);
      switch (mutationType) {
        case 0: this.randomMoveCorner(); break;
        case 1: this.randomAddCorner(); break;
        case 2: this.randomDeleteCorner(); break;
        case 3: this.randomMovePath(); break;
        case 4: this.randomInsertCorner(); break;
        default: break;
      }
    }
  }
}

class SWeaselWorld {
  constructor(sources, mutationLevel) {
    this.mutationLevel = mutationLevel;
    this.foodSources = [];
    for (let i = 0; i < sources; i++) this.foodSources.push(this.randomLocation());

    this.gaussianLut = [];
    for (let i = 0; i < 10000; i++) this.gaussianLut.push(this.gaussian(i, 0, 500));

    this.fittestWeasel = new SWeasel(this.mutationLevel);
    this.fittestWeasel.init(5);
    this.children = [];
  }

  init() {
    this.children = [];
    for (let i = 0; i < 2500; i++) {
      const child = new SWeasel(this.mutationLevel);
      child.weaselIx = i;
      child.copyIn(this.fittestWeasel);
      this.children.push(child);
    }
  }

  corners() { return this.fittestWeasel.corners(); }
  paths() { return this.fittestWeasel.paths(); }

  randomLocation() {
    return new Point(Math.random() * 1000, Math.random() * 1000);
  }

  gaussian(x, mean, stdDev) {
    const a = x - mean;
    return Math.exp(-(a * a) / (2 * stdDev * stdDev));
  }

  sourceCalories(range) {
    const idx = Math.min(this.gaussianLut.length - 1, Math.max(0, Math.floor(range)));
    return this.gaussianLut[idx] * 15000;
  }

  caloriesSpent(weas) {
    let cals = 0;
    for (const p of weas.paths()) cals += p.length();
    return cals;
  }

  caloriesAcquired(weas) {
    let cals = 0;
    const sources = this.foodSources.slice(0);

    for (const corner of weas.corners()) {
      sources.sort((p1, p2) => corner.rangeFrom(p1) - corner.rangeFrom(p2));
      const closest = sources[0];
      if (!closest) break;
      cals += this.sourceCalories(corner.rangeFrom(closest));

      const ix = sources.findIndex((p) => p.rangeFrom(closest) === 0);
      if (ix >= 0) sources.splice(ix, 1);
      if (sources.length === 0) break;
    }

    return cals;
  }

  netCalories(weas) {
    if (weas.isDead) return -Infinity;
    return this.caloriesAcquired(weas) - this.caloriesSpent(weas);
  }

  worldCycle() {
    if (this.children.length === 0) this.init();

    let maxCals = 0;
    let maxIx = -1;

    for (let i = 0; i < this.children.length; i++) {
      this.children[i].mutate();
      const net = this.netCalories(this.children[i]);
      if (net > maxCals) {
        maxCals = net;
        maxIx = i;
      }
    }

    if (maxIx > -1) this.fittestWeasel.copyIn(this.children[maxIx]);
    this.children = [];
  }

  earthquake() {
    const nrSourcesToMove = Math.floor(Math.random() * this.foodSources.length);
    for (let i = 0; i < nrSourcesToMove; i++) {
      const ix = Math.floor(Math.random() * this.foodSources.length);
      do {
        this.foodSources[ix].randomMove(300);
      } while (!this.isInField(this.foodSources[ix]));
    }
  }

  isInField(point) {
    return point.x >= 0 && point.x <= 1000 && point.y >= 0 && point.y <= 1000;
  }

  parentSpentCalories() {
    return Math.floor(this.caloriesSpent(this.fittestWeasel));
  }

  parentAcquiredCalories() {
    return Math.floor(this.caloriesAcquired(this.fittestWeasel));
  }
}

class SteinerDemo {
  constructor(root, scenario) {
    this.root = root;
    this.scenario = scenario;
    this.defaultCfg = { ...STEINER_PRESETS[scenario] };
    this.cfg = { ...this.defaultCfg };

    this.running = false;
    this.initialized = false;
    this.generation = 0;
    this.timer = null;

    this.buildUI();
    this.resetDefaults();
  }

  buildUI() {
    this.root.innerHTML = `
      <div class="control-row">
        <label>Food Sources:</label>
        <input class="txt-num-sources" type="number" min="5" max="100" value="${this.cfg.foodSources}" />
        <span>Generations: <strong class="lbl-generations">0</strong></span>
        <span class="badge">Mode: ${this.cfg.label}</span>
      </div>
      <div class="control-row metrics">
        <span>Cals spent: <strong class="lbl-spent">0</strong></span>
        <span>Cals eaten: <strong class="lbl-eaten">0</strong></span>
        <span>Net Cals: <strong class="lbl-net">0</strong></span>
        <span>Status: <strong class="lbl-status">Ready</strong></span>
      </div>
      <div class="canvas-shell">
        <canvas class="field" width="500" height="500" aria-label="Steiner world"></canvas>
      </div>
      <div class="control-row">
        <button class="btn-reset" type="button">Reset</button>
        <button class="btn-defaults" type="button">Defaults</button>
        <button class="btn-run" type="button">Run</button>
        <button class="btn-stop" type="button">Stop</button>
        <button class="btn-earthquake" type="button">EarthQuake</button>
      </div>
    `;

    this.canvas = this.root.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.inputSources = this.root.querySelector(".txt-num-sources");
    this.lblGenerations = this.root.querySelector(".lbl-generations");
    this.lblSpent = this.root.querySelector(".lbl-spent");
    this.lblEaten = this.root.querySelector(".lbl-eaten");
    this.lblNet = this.root.querySelector(".lbl-net");
    this.lblStatus = this.root.querySelector(".lbl-status");

    this.root.querySelector(".btn-reset").addEventListener("click", () => this.reset());
    this.root.querySelector(".btn-defaults").addEventListener("click", () => this.resetDefaults());
    this.root.querySelector(".btn-run").addEventListener("click", () => this.run());
    this.root.querySelector(".btn-stop").addEventListener("click", () => this.stop());
    this.root.querySelector(".btn-earthquake").addEventListener("click", () => this.earthquake());
  }

  resetDefaults() {
    this.cfg = { ...this.defaultCfg };
    this.inputSources.value = String(this.cfg.foodSources);
    this.reset();
  }

  setControlsEnabled() {
    const disabled = this.running;
    this.inputSources.disabled = disabled;
    this.root.querySelector(".btn-reset").disabled = disabled;
    this.root.querySelector(".btn-defaults").disabled = disabled;
    this.root.querySelector(".btn-run").disabled = disabled || !this.initialized;
    this.root.querySelector(".btn-stop").disabled = !disabled || !this.initialized;
    this.root.querySelector(".btn-earthquake").disabled = !disabled || !this.initialized;
  }

  reset() {
    this.stop();

    let numSources = Math.floor(Number(this.inputSources.value || this.cfg.foodSources));
    if (Number.isNaN(numSources)) numSources = this.cfg.foodSources;
    if (numSources < 5) numSources = 5;
    if (numSources > 100) numSources = 100;
    this.inputSources.value = String(numSources);

    this.world = new SWeaselWorld(numSources, this.cfg.mutationLevel);
    this.generation = 0;
    this.initialized = true;
    this.clearField();
    this.drawAll();
    this.lblStatus.textContent = "Ready";
    this.setControlsEnabled();
  }

  run() {
    if (this.running || !this.initialized) return;
    this.running = true;
    this.lblStatus.textContent = "Running";
    this.setControlsEnabled();
    this.timer = setInterval(() => this.worldCycle(), 500);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.running = false;
    if (this.initialized) this.lblStatus.textContent = "Stopped";
    this.setControlsEnabled();
  }

  earthquake() {
    if (!this.world) return;
    this.world.earthquake();
    this.clearField();
    this.drawAll();
  }

  worldCycle() {
    this.generation += 1;
    this.world.worldCycle();
    this.clearField();
    this.drawAll();
  }

  clearField() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  scalePoint(point) {
    const scale = this.canvas.width / 1000;
    return { x: point.x * scale, y: point.y * scale };
  }

  drawSources() {
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = "green";
    for (const source of this.world.foodSources) {
      const p = this.scalePoint(source);
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI, false);
      this.ctx.stroke();
    }
  }

  drawCorners() {
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = "black";
    for (const c of this.world.corners()) {
      const p = this.scalePoint(c);
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 2.5, 0, 2 * Math.PI, false);
      this.ctx.stroke();
    }
  }

  drawPaths() {
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = "black";
    for (const l of this.world.paths()) {
      const p1 = this.scalePoint(l.start);
      const p2 = this.scalePoint(l.end);
      this.ctx.beginPath();
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
      this.ctx.stroke();
    }
  }

  displayValues() {
    const spent = this.world.parentSpentCalories();
    const eaten = this.world.parentAcquiredCalories();
    this.lblSpent.textContent = String(spent);
    this.lblEaten.textContent = String(eaten);
    this.lblNet.textContent = String(eaten - spent);
    this.lblGenerations.textContent = String(this.generation);
  }

  drawAll() {
    this.drawSources();
    this.drawCorners();
    this.drawPaths();
    this.displayValues();
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new DawkinsDemo(document.querySelector("#dawkins-demo"));
  for (const node of document.querySelectorAll(".steiner-demo")) {
    const scenario = Number(node.dataset.scenario);
    new SteinerDemo(node, scenario);
  }
});
