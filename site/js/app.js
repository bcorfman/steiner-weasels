const DAWKINS_DEFAULT = "Methinks it is like a weasel.";
const WEASEL_CHARS = " " + "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.,!?;:'\"()-";

const STEINER_PRESETS = {
  1: { sources: 15, initialGenes: 3, allowGeneCountMutation: false, allowRewire: false, allowSteinerInsert: false },
  2: { sources: 15, initialGenes: 3, allowGeneCountMutation: true, allowRewire: false, allowSteinerInsert: false },
  3: { sources: 15, initialGenes: 3, allowGeneCountMutation: true, allowRewire: true, allowSteinerInsert: false },
  4: { sources: 15, initialGenes: 3, allowGeneCountMutation: true, allowRewire: true, allowSteinerInsert: true },
};

class DawkinsDemo {
  constructor(root) {
    this.targetEl = root.querySelector("#target-input");
    this.outputEl = root.querySelector("#dawkins-output");
    this.genEl = root.querySelector("#dawkins-generations");
    root.querySelector("#dawkins-reset").addEventListener("click", () => this.reset());
    root.querySelector("#dawkins-run").addEventListener("click", () => this.run());
    root.querySelector("#dawkins-stop").addEventListener("click", () => this.stop());
    this.running = false;
    this.reset();
  }

  reset() {
    this.stop();
    this.generation = 0;
    this.outputEl.value = "";
    this.genEl.textContent = "0";
    const target = this.targetEl.value || DAWKINS_DEFAULT;
    this.parent = this.randomString(target.length);
  }

  stop() { this.running = false; }

  randomString(len) {
    let s = "";
    for (let i = 0; i < len; i++) s += WEASEL_CHARS[(Math.random() * WEASEL_CHARS.length) | 0];
    return s;
  }

  mutateChild(parent) {
    const chars = parent.split("");
    const mutationRate = 0.05;
    for (let i = 0; i < chars.length; i++) {
      if (Math.random() < mutationRate) chars[i] = WEASEL_CHARS[(Math.random() * WEASEL_CHARS.length) | 0];
    }
    return chars.join("");
  }

  score(candidate, target) {
    let d = Math.abs(candidate.length - target.length);
    const n = Math.min(candidate.length, target.length);
    for (let i = 0; i < n; i++) if (candidate[i] !== target[i]) d++;
    return d;
  }

  step() {
    const target = this.targetEl.value || DAWKINS_DEFAULT;
    this.generation += 1;
    let best = this.parent;
    let bestScore = this.score(best, target);
    for (let i = 0; i < 1000; i++) {
      const child = this.mutateChild(this.parent);
      const s = this.score(child, target);
      if (s < bestScore) {
        best = child;
        bestScore = s;
      }
    }
    this.parent = best;
    this.outputEl.value += `Gen ${String(this.generation).padStart(3, " ")}: ${best}  Distance: ${bestScore}\n`;
    this.outputEl.scrollTop = this.outputEl.scrollHeight;
    if (bestScore === 0) {
      this.running = false;
      this.genEl.textContent = String(this.generation);
    }
  }

  run() {
    if (this.running) return;
    this.running = true;
    const tick = () => {
      if (!this.running) return;
      for (let i = 0; i < 2 && this.running; i++) this.step();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

class SteinerDemo {
  constructor(root, scenario) {
    this.root = root;
    this.cfg = { ...STEINER_PRESETS[scenario] };
    this.running = false;
    this.generation = 0;
    this.size = 100; // best guess: roomy grid-like world
    this.population = 1500; // "few thousand" in article, tuned for browser speed
    this.buildUI();
    this.reset();
  }

  buildUI() {
    this.root.innerHTML = `
      <div class="controls-row">
        <label>Food Sources:</label>
        <input class="txtNumSources" type="number" min="10" max="99" value="${this.cfg.sources}" />
        <span>Generations: <strong class="lblGenerations">0</strong></span>
      </div>
      <div class="controls-row metrics">
        <span>Cals spent: <strong class="lblSpentCalories">0</strong></span>
        <span>Cals eaten: <strong class="lblAcquiredCalories">0</strong></span>
        <span>Net Cals: <strong class="lblNetCalories">0</strong></span>
      </div>
      <div class="canvas-wrap"><canvas class="field" width="700" height="700"></canvas></div>
      <div class="controls-row">
        <button class="btnReset">Reset</button>
        <button class="btnRun">Run</button>
        <button class="btnStop">Stop</button>
        <button class="btnEarthquake">EarthQuake</button>
      </div>
    `;

    this.canvas = this.root.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.lblGen = this.root.querySelector(".lblGenerations");
    this.lblSpent = this.root.querySelector(".lblSpentCalories");
    this.lblEat = this.root.querySelector(".lblAcquiredCalories");
    this.lblNet = this.root.querySelector(".lblNetCalories");
    this.inputSources = this.root.querySelector(".txtNumSources");

    this.root.querySelector(".btnReset").addEventListener("click", () => this.reset());
    this.root.querySelector(".btnRun").addEventListener("click", () => this.run());
    this.root.querySelector(".btnStop").addEventListener("click", () => this.stop());
    this.root.querySelector(".btnEarthquake").addEventListener("click", () => this.earthquake());
  }

  randPoint() { return { x: Math.random() * this.size, y: Math.random() * this.size }; }
  dist(a, b) { const dx = a.x - b.x; const dy = a.y - b.y; return Math.hypot(dx, dy); }

  reset() {
    this.stop();
    this.generation = 0;
    this.cfg.sources = Math.max(10, Math.min(99, Number(this.inputSources.value) || this.cfg.sources));
    this.food = Array.from({ length: this.cfg.sources }, (_, i) => ({ ...this.randPoint(), kind: i }));
    this.parent = {
      stops: Array.from({ length: this.cfg.initialGenes }, () => this.randPoint()),
      edges: [],
    };
    this.parent.edges = this.makeDefaultEdges(this.parent.stops.length);
    this.lastScore = { spent: 0, eaten: 0, net: 0 };
    this.paint();
    this.refreshLabels();
  }

  makeDefaultEdges(n) {
    const edges = [];
    for (let i = 1; i < n; i++) edges.push([i - 1, i]);
    return edges;
  }

  mutate(candidate) {
    const c = {
      stops: candidate.stops.map((p) => ({ ...p })),
      edges: candidate.edges.map((e) => [e[0], e[1]]),
    };

    for (const p of c.stops) {
      if (Math.random() < 0.2) {
        p.x = Math.max(0, Math.min(this.size, p.x + (Math.random() * 10 - 5)));
        p.y = Math.max(0, Math.min(this.size, p.y + (Math.random() * 10 - 5)));
      }
    }

    if (this.cfg.allowGeneCountMutation && Math.random() < 0.15) {
      if (Math.random() < 0.5 && c.stops.length > 1) c.stops.splice((Math.random() * c.stops.length) | 0, 1);
      else c.stops.push(this.randPoint());
      c.edges = this.makeDefaultEdges(c.stops.length);
    }

    if (this.cfg.allowRewire && c.stops.length > 2 && Math.random() < 0.2) {
      const from = (Math.random() * c.stops.length) | 0;
      const to = (Math.random() * c.stops.length) | 0;
      if (from !== to) c.edges[(Math.random() * c.edges.length) | 0] = [from, to];
    }

    if (this.cfg.allowSteinerInsert && c.stops.length > 1 && Math.random() < 0.15) {
      const idx = (Math.random() * c.stops.length) | 0;
      const base = c.stops[idx];
      c.stops.splice(idx + 1, 0, {
        x: Math.max(0, Math.min(this.size, base.x + (Math.random() * 20 - 10))),
        y: Math.max(0, Math.min(this.size, base.y + (Math.random() * 20 - 10))),
      });
      c.edges = this.makeDefaultEdges(c.stops.length);
    }

    return c;
  }

  evaluate(w) {
    let spent = 0;
    for (const [a, b] of w.edges) {
      if (!w.stops[a] || !w.stops[b]) continue;
      spent += this.dist(w.stops[a], w.stops[b]);
    }

    let eaten = 0;
    const usedKinds = new Set();
    for (let i = 0; i < w.stops.length; i++) {
      const stop = w.stops[i];
      const food = this.food[i];
      if (!food || usedKinds.has(food.kind)) continue;
      const d = this.dist(stop, food);
      eaten += Math.max(0, 90 - d * 1.35);
      usedKinds.add(food.kind);
    }

    return { spent, eaten, net: eaten - spent };
  }

  step() {
    this.generation += 1;
    let best = this.parent;
    let bestScore = this.evaluate(best);

    for (let i = 0; i < this.population; i++) {
      const child = this.mutate(this.parent);
      const s = this.evaluate(child);
      if (s.net > bestScore.net) {
        best = child;
        bestScore = s;
      }
    }

    this.parent = best;
    this.lastScore = bestScore;
    this.refreshLabels();
    this.paint();
  }

  refreshLabels() {
    this.lblGen.textContent = String(this.generation);
    this.lblSpent.textContent = this.lastScore.spent.toFixed(1);
    this.lblEat.textContent = this.lastScore.eaten.toFixed(1);
    this.lblNet.textContent = this.lastScore.net.toFixed(1);
  }

  paint() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#f3fbfd";
    ctx.fillRect(0, 0, W, H);

    const sx = W / this.size;
    const sy = H / this.size;

    ctx.strokeStyle = "#88a6b0";
    ctx.lineWidth = 1;
    for (const [a, b] of this.parent.edges) {
      const pa = this.parent.stops[a], pb = this.parent.stops[b];
      if (!pa || !pb) continue;
      ctx.beginPath();
      ctx.moveTo(pa.x * sx, pa.y * sy);
      ctx.lineTo(pb.x * sx, pb.y * sy);
      ctx.stroke();
    }

    ctx.fillStyle = "#24a148";
    for (const f of this.food) {
      ctx.beginPath();
      ctx.arc(f.x * sx, f.y * sy, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#1d3557";
    for (const p of this.parent.stops) {
      ctx.beginPath();
      ctx.arc(p.x * sx, p.y * sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  earthquake() {
    const shifts = 1 + ((Math.random() * Math.max(2, Math.floor(this.food.length / 5))) | 0);
    for (let i = 0; i < shifts; i++) {
      const idx = (Math.random() * this.food.length) | 0;
      this.food[idx].x = Math.max(0, Math.min(this.size, this.food[idx].x + (Math.random() * 30 - 15)));
      this.food[idx].y = Math.max(0, Math.min(this.size, this.food[idx].y + (Math.random() * 30 - 15)));
    }
    this.paint();
  }

  run() {
    if (this.running) return;
    this.running = true;
    const tick = () => {
      if (!this.running) return;
      for (let i = 0; i < 3 && this.running; i++) this.step();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  stop() { this.running = false; }
}

window.addEventListener("DOMContentLoaded", () => {
  new DawkinsDemo(document.querySelector("#dawkins-demo"));
  for (const el of document.querySelectorAll(".steiner-demo")) {
    new SteinerDemo(el, Number(el.dataset.scenario));
  }
});
