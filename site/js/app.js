const DAWKINS_DEFAULT = "Methinks it is like a weasel.";
const TARGET_PADDING = 2;
const WEASEL_CHARS = " " + "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ" + "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";

const STEINER_PRESETS = {
  1: {
    label: "Stops only",
    foodSources: 15,
    initialGenes: 5,
    childrenPerGeneration: 1500,
    allowGeneCountMutation: false,
    allowRewire: false,
    allowSteinerInsert: false,
  },
  2: {
    label: "Stop count evolves",
    foodSources: 15,
    initialGenes: 3,
    childrenPerGeneration: 1500,
    allowGeneCountMutation: true,
    allowRewire: false,
    allowSteinerInsert: false,
  },
  3: {
    label: "Route rewiring",
    foodSources: 15,
    initialGenes: 3,
    childrenPerGeneration: 1500,
    allowGeneCountMutation: true,
    allowRewire: true,
    allowSteinerInsert: false,
  },
  4: {
    label: "Steiner insertion",
    foodSources: 15,
    initialGenes: 3,
    childrenPerGeneration: 1500,
    allowGeneCountMutation: true,
    allowRewire: true,
    allowSteinerInsert: true,
  },
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

  addCharacter(source, idx) {
    return `${source.slice(0, idx)}${randomChoice(WEASEL_CHARS)}${source.slice(idx)}`;
  }

  deleteCharacter(source, idx) {
    return `${source.slice(0, idx)}${source.slice(idx + 1)}`;
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
      if (child.length === 0) {
        child = this.addCharacter(child, 0);
        continue;
      }
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

class SteinerDemo {
  constructor(root, scenario) {
    this.root = root;
    this.scenario = scenario;
    this.defaultCfg = { ...STEINER_PRESETS[scenario] };
    this.cfg = { ...this.defaultCfg };

    this.gridWidth = 80;
    this.gridHeight = 80;
    this.cellSize = 8;

    this.running = false;
    this.animationToken = null;
    this.generation = 0;

    this.buildUI();
    this.reset();
  }

  buildUI() {
    this.root.innerHTML = `
      <div class="control-row">
        <label>Food Sources:</label>
        <input class="txt-num-sources" type="number" min="10" max="99" value="${this.cfg.foodSources}" />
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
        <canvas class="field" width="640" height="640" aria-label="Steiner world"></canvas>
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

  randomCell() {
    return { x: randomInt(0, this.gridWidth - 1), y: randomInt(0, this.gridHeight - 1) };
  }

  cellDistance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  makeChainEdges(count) {
    const edges = [];
    for (let i = 1; i < count; i++) edges.push([i - 1, i]);
    return edges;
  }

  normalizeEdges(edges, stopCount) {
    const out = [];
    const seen = new Set();
    for (const edge of edges) {
      const [a, b] = edge;
      if (a === b) continue;
      if (a < 0 || b < 0 || a >= stopCount || b >= stopCount) continue;
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push([a, b]);
    }
    return out;
  }

  cloneGenome(genome) {
    return {
      stops: genome.stops.map((p) => ({ x: p.x, y: p.y })),
      edges: genome.edges.map((e) => [e[0], e[1]]),
    };
  }

  reset() {
    this.stop();
    this.generation = 0;

    const parsedSources = Number(this.inputSources.value);
    this.cfg.foodSources = Number.isFinite(parsedSources)
      ? Math.max(10, Math.min(99, parsedSources))
      : this.cfg.foodSources;

    this.food = Array.from({ length: this.cfg.foodSources }, (_, i) => ({ ...this.randomCell(), type: i }));

    this.parent = {
      stops: Array.from({ length: this.cfg.initialGenes }, () => this.randomCell()),
      edges: this.makeChainEdges(this.cfg.initialGenes),
    };

    this.lastFitness = { spent: 0, eaten: 0, net: 0 };
    this.lblStatus.textContent = "Ready";
    this.refreshMetrics();
    this.paint();
  }

  resetDefaults() {
    this.cfg = { ...this.defaultCfg };
    this.inputSources.value = String(this.defaultCfg.foodSources);
    this.reset();
  }

  mutatePosition(stop) {
    if (Math.random() < 0.22) {
      stop.x = Math.max(0, Math.min(this.gridWidth - 1, stop.x + randomInt(-3, 3)));
      stop.y = Math.max(0, Math.min(this.gridHeight - 1, stop.y + randomInt(-3, 3)));
    }
  }

  mutateGenome(parent) {
    const g = this.cloneGenome(parent);

    for (const stop of g.stops) this.mutatePosition(stop);

    if (this.cfg.allowGeneCountMutation && Math.random() < 0.12) {
      if (Math.random() < 0.5 && g.stops.length > 1) {
        const removed = randomInt(0, g.stops.length - 1);
        g.stops.splice(removed, 1);
        g.edges = g.edges
          .filter(([a, b]) => a !== removed && b !== removed)
          .map(([a, b]) => [a > removed ? a - 1 : a, b > removed ? b - 1 : b]);
      } else {
        const nextIdx = g.stops.length;
        g.stops.push(this.randomCell());
        if (nextIdx > 0) g.edges.push([randomInt(0, nextIdx - 1), nextIdx]);
      }
      g.edges = this.normalizeEdges(g.edges, g.stops.length);
      if (g.edges.length === 0 && g.stops.length > 1) g.edges = this.makeChainEdges(g.stops.length);
    }

    if (this.cfg.allowRewire && g.edges.length > 0 && g.stops.length > 2 && Math.random() < 0.2) {
      const edgeIndex = randomInt(0, g.edges.length - 1);
      const from = randomInt(0, g.stops.length - 1);
      let to = randomInt(0, g.stops.length - 1);
      if (from === to) to = (to + 1) % g.stops.length;
      g.edges[edgeIndex] = [from, to];
      g.edges = this.normalizeEdges(g.edges, g.stops.length);
    }

    if (this.cfg.allowSteinerInsert && g.stops.length > 1 && Math.random() < 0.14) {
      const edge = g.edges[randomInt(0, g.edges.length - 1)] ?? [0, 1];
      const a = g.stops[edge[0]];
      const b = g.stops[edge[1]];
      const mid = {
        x: Math.max(0, Math.min(this.gridWidth - 1, Math.round((a.x + b.x) / 2) + randomInt(-2, 2))),
        y: Math.max(0, Math.min(this.gridHeight - 1, Math.round((a.y + b.y) / 2) + randomInt(-2, 2))),
      };
      const newIdx = g.stops.length;
      g.stops.push(mid);
      g.edges.push([edge[0], newIdx], [newIdx, edge[1]]);
      g.edges = g.edges.filter(([x, y]) => !((x === edge[0] && y === edge[1]) || (x === edge[1] && y === edge[0])));
      g.edges = this.normalizeEdges(g.edges, g.stops.length);
    }

    return g;
  }

  evaluate(genome) {
    if (genome.stops.length === 0) return { spent: 99999, eaten: 0, net: -99999 };

    let spent = 0;
    // Moving to and from origin also costs calories.
    const origin = { x: 0, y: 0 };
    spent += this.cellDistance(origin, genome.stops[0]);
    for (const [a, b] of genome.edges) {
      const sa = genome.stops[a];
      const sb = genome.stops[b];
      if (!sa || !sb) continue;
      spent += this.cellDistance(sa, sb);
    }
    spent += this.cellDistance(genome.stops[genome.stops.length - 1], origin);

    let eaten = 0;
    const availableFoods = this.food.map((f, idx) => ({ idx, ...f }));
    // Greedy nearest unique source assignment approximates one-type-per-stop consumption.
    for (const stop of genome.stops) {
      if (!availableFoods.length) break;
      let bestI = 0;
      let bestD = Infinity;
      for (let i = 0; i < availableFoods.length; i++) {
        const d = this.cellDistance(stop, availableFoods[i]);
        if (d < bestD) {
          bestD = d;
          bestI = i;
        }
      }
      eaten += Math.max(0, 98 - bestD * 2.0);
      availableFoods.splice(bestI, 1);
    }

    // Wasted stops (beyond sources) consume resources but add no intake value.
    const wastedStops = Math.max(0, genome.stops.length - this.food.length);
    spent += wastedStops * 8;

    // Uncovered sources reduce fitness so scenario #2 tends toward full source coverage.
    const uncovered = Math.max(0, this.food.length - genome.stops.length);
    spent += uncovered * 3.5;

    return {
      spent,
      eaten,
      net: eaten - spent,
    };
  }

  step() {
    this.generation += 1;

    let bestGenome = this.parent;
    let bestFitness = this.evaluate(bestGenome);

    for (let i = 0; i < this.cfg.childrenPerGeneration; i++) {
      const child = this.mutateGenome(this.parent);
      const f = this.evaluate(child);
      if (f.net > bestFitness.net) {
        bestGenome = child;
        bestFitness = f;
      }
    }

    this.parent = bestGenome;
    this.lastFitness = bestFitness;

    this.refreshMetrics();
    this.paint();
  }

  refreshMetrics() {
    this.lblGenerations.textContent = String(this.generation);
    this.lblSpent.textContent = this.lastFitness.spent.toFixed(1);
    this.lblEaten.textContent = this.lastFitness.eaten.toFixed(1);
    this.lblNet.textContent = this.lastFitness.net.toFixed(1);
  }

  drawGrid() {
    const { ctx, canvas, cellSize } = this;
    ctx.fillStyle = "#f6fcff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#e2ebf0";
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += cellSize) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += cellSize) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(canvas.width, y + 0.5);
      ctx.stroke();
    }
  }

  cellToPx(point) {
    return {
      x: point.x * this.cellSize + this.cellSize / 2,
      y: point.y * this.cellSize + this.cellSize / 2,
    };
  }

  paint() {
    const { ctx } = this;
    this.drawGrid();

    ctx.strokeStyle = "#7b8f9b";
    ctx.lineWidth = 1.2;
    for (const [a, b] of this.parent.edges) {
      const sa = this.parent.stops[a];
      const sb = this.parent.stops[b];
      if (!sa || !sb) continue;
      const p1 = this.cellToPx(sa);
      const p2 = this.cellToPx(sb);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    ctx.fillStyle = "#2a9d3f";
    for (const source of this.food) {
      const p = this.cellToPx(source);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.7, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#1f4c74";
    for (const stop of this.parent.stops) {
      const p = this.cellToPx(stop);
      ctx.fillRect(Math.round(p.x - 2), Math.round(p.y - 2), 4, 4);
    }
  }

  earthquake() {
    const shiftCount = randomInt(1, Math.max(2, Math.floor(this.food.length / 4)));
    for (let i = 0; i < shiftCount; i++) {
      const idx = randomInt(0, this.food.length - 1);
      this.food[idx].x = Math.max(0, Math.min(this.gridWidth - 1, this.food[idx].x + randomInt(-9, 9)));
      this.food[idx].y = Math.max(0, Math.min(this.gridHeight - 1, this.food[idx].y + randomInt(-9, 9)));
    }
    this.paint();
  }

  run() {
    if (this.running) return;
    this.running = true;
    this.lblStatus.textContent = "Running";

    const tick = () => {
      if (!this.running) return;
      for (let i = 0; i < 2 && this.running; i++) this.step();
      this.animationToken = requestAnimationFrame(tick);
    };

    this.animationToken = requestAnimationFrame(tick);
  }

  stop() {
    this.running = false;
    if (this.animationToken) cancelAnimationFrame(this.animationToken);
    this.animationToken = null;
    if (this.lblStatus.textContent !== "Ready") this.lblStatus.textContent = "Stopped";
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new DawkinsDemo(document.querySelector("#dawkins-demo"));
  for (const node of document.querySelectorAll(".steiner-demo")) {
    const scenario = Number(node.dataset.scenario);
    new SteinerDemo(node, scenario);
  }
});
