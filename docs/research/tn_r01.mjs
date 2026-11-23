import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks, stripTypeScriptTypes } from 'node:module';

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
      return next(specifier + '.ts', context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (!url.startsWith('file:') || !url.endsWith('.ts')) return next(url, context);
    const source = readFileSync(new URL(url), 'utf8');
    // These sources use named imports for both TypeScript types and runtime bindings.
    // Elide imports of exported interfaces/type aliases before Node loads the module.
    const adjusted = source.replace(/^import\s*\{([^}]+)\}\s*from\s*(['"])(\.[^'"]+)\2;?/gm,
      (_, bindings, quote, path) => {
        const dependency = readFileSync(new URL(path + '.ts', url), 'utf8');
        const typeNames = new Set([...dependency.matchAll(/^export\s+(?:interface|type)\s+(\w+)/gm)]
          .map(match => match[1]));
        const values = bindings.split(',').map(name => name.trim())
          .filter(name => name && !typeNames.has(name.split(/\s+/)[0]));
        return values.length ? `import { ${values.join(', ')} } from ${quote}${path}${quote};` : '';
      });
    return { format: 'module', source: stripTypeScriptTypes(adjusted, { mode: 'transform' }), shortCircuit: true };
  },
});

const { computeStats } = await import('../../src/engine/gamma.ts');
const { gei } = await import('../../src/engine/gei.ts');
const { predict, computePredictionError } = await import('../../src/engine/theories.ts');
const { computePhi, computePhiMinCost, checkInvariantI1 } = await import('../../src/engine/phi.ts');
const { computeTheoryEntropy } = await import('../../src/engine/entropy.ts');
const { runBacktest, DEFAULT_CONFIG } = await import('../../src/simulator/backtest.ts');
const { TheoryID } = await import('../../src/engine/types.ts');

const average = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const features = ({ lastUpdate, ...rest }) => rest;
const closeEnough = (a, b) => Math.abs(a - b) <= 1e-10 + 1e-9 * Math.max(Math.abs(a), Math.abs(b));
const round = number => Number(number.toPrecision(9));

function series(family, seed) {
  let random = seed >>> 0;
  const prices = [100];
  for (let t = 1; t < 180; t++) {
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    const noise = 2 * random / 4294967296 - 1;
    const last = prices.at(-1);
    const change = family === 'drift' ? 0.08 + 0.12 * noise
      : family === 'reversion' ? -0.22 * (last - 100) + 0.30 * noise
      : (t < 90 ? 0.10 + 0.12 * noise : -0.07 + 0.60 * noise);
    prices.push(last + change);
  }
  return prices;
}

function score(prices) {
  const run = runBacktest(prices);
  const errors = { gei: [], rw: [], trend: [], reversion: [] };
  let phiPositive = 0;
  let geiWinsAmongPhiPositive = 0;
  for (const { tick, state } of run.ticks) {
    const w = prices.slice(Math.max(0, tick - DEFAULT_CONFIG.lookbackWindow), tick + 1);
    assert.equal(state.stats.autocorr.length, 20);
    assert.equal(state.stats.spectrum.powers.length, 33);
    assert.ok(Number.isFinite(state.phi) && state.phi >= 0 && state.phi <= 1);
    assert.ok(Number.isInteger(state.currentTheory) && state.currentTheory >= 0 && state.currentTheory < 10);
    assert.ok([-1, 0, 1].includes(state.signal));
    if (tick + 1 >= prices.length) continue;
    const target = prices[tick + 1];
    const prediction = {
      gei: predict(state.currentTheory, state.stats, w),
      rw: prices[tick],
      trend: predict(TheoryID.TREND_FOLLOWING, state.stats, w),
      reversion: predict(TheoryID.MEAN_REVERTING, state.stats, w),
    };
    for (const key of Object.keys(errors)) {
      assert.ok(Number.isFinite(prediction[key]));
      errors[key].push(Math.abs(prediction[key] - target));
    }
    if (state.phi > 0) {
      phiPositive++;
      if (errors.gei.at(-1) < errors.rw.at(-1)) geiWinsAmongPhiPositive++;
    }
  }
  return { n: errors.rw.length, mae: Object.fromEntries(Object.entries(errors).map(([k,v]) => [k, round(average(v))])),
    switches: run.transitions.length, dominant: run.summary.dominantTheory, i5Rate: round(run.summary.invariantRates.I5),
    phiPositive, geiWinsAmongPhiPositive };
}

const main = series('switch', 17);
const a = runBacktest(main.slice(0, 120));
const b = runBacktest(main);
const project = ({ tick, state, phi, gei, entropy }) => [tick, features(state.stats), state.currentTheory,
  state.theta, state.signal, phi, gei, entropy];
assert.deepEqual(a.ticks.map(project), b.ticks.slice(0, a.ticks.length).map(project));
const repeatA = computeStats(main);
await new Promise(resolve => setTimeout(resolve, 10));
const repeatB = computeStats(main);
assert.deepEqual(features(repeatA), features(repeatB));
assert.notEqual(repeatA.lastUpdate.getTime(), repeatB.lastUpdate.getTime());

const prefix = main.slice(0, 21);
const prefixStats = computeStats(prefix);
const fullA = [...prefix, ...Array.from({length: 30}, (_,i) => prefix.at(-1) + (i + 1) * 0.6)];
const fullB = [...prefix, ...Array.from({length: 30}, (_,i) => prefix.at(-1) - (i + 1) * 0.7)];
const susceptible = [];
for (let id = 0; id < 10; id++) {
  const p = predict(id, prefixStats, prefix);
  const x = predict(id, computeStats(fullA), prefix);
  const y = predict(id, computeStats(fullB), prefix);
  if (!closeEnough(x, y)) susceptible.push({ id, ownPrefix: round(p), positiveTail: round(x), negativeTail: round(y) });
}
assert.ok(susceptible.length > 0);
const errorWith = stats => computePredictionError(TheoryID.MEAN_REVERTING, stats, prefix);
const fullStats = computeStats(main.slice(0, 51));
const regimeIntervention = [0,1,2,3].map(regime => {
  const r = gei({ ...fullStats, regime }, main.slice(0, 51), TheoryID.RANDOM_WALK, [], 50);
  return { regime, selected: r.selectedTheory, best: r.evaluations[0].theoryId, cost: round(r.evaluations[0].cost) };
});
const uniformEntropy = -Array.from({length: 10}, () => 0.1 * Math.log(0.1)).reduce((a,b) => a+b);
const fixedActivation = computeTheoryEntropy(Array(100).fill(TheoryID.RANDOM_WALK), 100).entropy;
assert.equal(fixedActivation, 0);
assert.ok(uniformEntropy > 0.5);
const flat = Array(80).fill(100);
const flatPhi = computePhi(TheoryID.RANDOM_WALK, computeStats(flat), flat);
const edge = { flatPhi, short: features(computeStats([100,101,102])).sampleSize,
  zero: features(computeStats([100,0,100,101,102])).sampleSize,
  nonFinite: features(computeStats([100,Infinity,100,101,102])).sampleSize };
const datasets = ['drift','reversion','switch'].flatMap(family => [17,23,47].map(seed =>
  ({ family, seed, ...score(series(family, seed)) })));
const telemetry = Array.from({length: 180}, (_,t) => 60 + 2 * Math.sin(t / 9) + (t >= 90 ? 4 : 0));
const transfer = [1,1000].map(scale => ({scale, ...score(telemetry.map(x => scale*x))}));
console.log(JSON.stringify({
  protocol: 'TN-R01-P1',
  candidate: '4217f70e2a140d03746873183dad5328a65e1fba',
  outerPrefixTicks: a.ticks.length, gammaMathDeterministic: true, timestampVaries: true,
  innerPredictions: susceptible,
  innerMaes: [prefixStats,computeStats(fullA),computeStats(fullB)].map(errorWith).map(round),
  snapshotAliases: {
    performance: b.ticks[0].state.performance === b.finalState.performance,
    transitions: b.ticks[0].state.transitions === b.finalState.transitions,
    transitionsVisibleAtFirstRecordedTick: b.ticks[0].state.transitions.length,
    actuallyOccurredThroughFirstRecordedTick: b.transitions.filter(t => t.tick <= b.ticks[0].tick).length,
  },
  i1Alternating: checkInvariantI1(Array.from({length: 50}, (_,i) => i%2)),
  i5Contrast: {uniformEntropy, fixedActivation}, minCostScore: computePhiMinCost([0.7,0.8]),
  regimeIntervention, edge, datasets, transfer,
}, null, 2));
