const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');
const { runInThisContext } = require('node:vm');

const build = path.resolve(process.argv[2]);
const reference = JSON.parse(readFileSync(process.argv[3], 'utf8'));
const { computeStats } = require(path.join(build, 'engine/gamma.js'));
const { predict, computePredictionError, predictMeanReverting } = require(path.join(build, 'engine/theories.js'));
const {
  checkInvariantI1, computeAction, computeBaselineError, computePhi, computePhiEntropy, computePhiMinCost,
} = require(path.join(build, 'engine/phi.js'));
const simulator = path.join(build, 'simulator/backtest.js');
const { runBacktest, DEFAULT_CONFIG } = require(simulator);
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const near = (a, b) => Math.abs(a - b) <= 1e-10 + 1e-9 * Math.max(Math.abs(a), Math.abs(b));
const round = value => Number(value.toPrecision(9));

function series(family, seed) {
  const prices = [100];
  let state = BigInt(seed);
  for (let t = 1; t < 180; t++) {
    state = (1664525n * state + 1013904223n) % 4294967296n;
    const noise = 2 * Number(state) / 4294967296 - 1;
    const last = prices.at(-1);
    const delta = family === 'drift' ? 0.08 + 0.12 * noise
      : family === 'reversion' ? -0.22 * (last - 100) + 0.30 * noise
      : t < 90 ? 0.10 + 0.12 * noise : -0.07 + 0.60 * noise;
    prices.push(last + delta);
  }
  return prices;
}

function softmaxEntropy(evaluations) {
  const costs = evaluations.map(row => row.cost);
  assert.equal(costs.length, 10);
  assert.ok(costs.every(Number.isFinite));
  const weights = costs.map(cost => Math.exp(Math.min(...costs) - cost));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return -weights.reduce((sum, weight) => {
    const p = weight / total;
    return sum + (p === 0 ? 0 : p * Math.log(p));
  }, 0);
}

const alpha = stats => Math.max(0, Math.min(1, -stats.autocorr[0]));

function score(prices) {
  const run = runBacktest(prices);
  assert.equal(run.ticks.length, 130);
  const rows = [];
  let i5Pass = 0;
  let i5Disagree = 0;
  for (const row of run.ticks) {
    const { tick, state, gei, theoryChanged } = row;
    const entropyPass = softmaxEntropy(gei.evaluations) > 0.5;
    i5Pass += Number(entropyPass);
    i5Disagree += Number(entropyPass !== state.invariants.I5);
    const w = prices.slice(Math.max(0, tick - DEFAULT_CONFIG.lookbackWindow), tick + 1);
    const last = prices[tick];
    const center = mean(w);
    const predictions = [
      predict(state.currentTheory, state.stats, w),
      last,
      predict(2, state.stats, w),
      predict(1, state.stats, w),
      center + alpha(state.stats) * (center - last),
    ];
    assert.ok(predictions.every(Number.isFinite));
    const errors = tick + 1 < prices.length
      ? predictions.map(value => Math.abs(value - prices[tick + 1])) : null;
    assert.ok(errors === null || errors.every(Number.isFinite));
    rows.push({
      tick, theory: state.currentTheory, signal: state.signal, regime: state.stats.regime,
      theoryChanged, phi: state.phi, theta: state.theta, errors,
    });
  }
  const targets = rows.filter(row => row.errors !== null);
  assert.deepEqual(targets.map(row => row.tick), Array.from({ length: 129 }, (_, i) => i + 50));
  const mae = [0, 1, 2, 3, 4].map(index => mean(targets.map(row => row.errors[index])));
  return {
    rows, mae, i5Pass, i5Disagree,
    switches: run.transitions.length, dominant: run.summary.dominantTheory,
  };
}

function checkReference(actual, expected) {
  for (const [index, key] of ['gei', 'rw', 'trend', 'reversion'].entries()) {
    assert.ok(near(round(actual.mae[index]), expected.mae[key]), key);
  }
  assert.equal(actual.switches, expected.switches);
  assert.equal(actual.dominant, expected.dominant);
}

const families = ['drift', 'reversion', 'switch'];
const datasets = families.flatMap(family => [17, 23, 47].map(seed => {
  const result = score(series(family, seed));
  checkReference(result, reference.datasets.find(row => row.family === family && row.seed === seed));
  const { mae, switches, dominant, i5Pass, i5Disagree } = result;
  return { family, seed, mae, switches, dominant, i5Pass, i5Disagree };
}));
const familyMeans = families.map(family => ({
  family,
  mae: [0, 1, 2, 3, 4].map(index => mean(datasets
    .filter(row => row.family === family).map(row => row.mae[index]))),
}));

const prices = series('switch', 17);
const window = prices.slice(0, 51);
const envelope = computeStats(window);
const split = Math.floor(window.length * 0.7);

// Keep the same origins and targets while changing only the information supplied to Γ.
function compareOrigins(id, segment) {
  const pairs = [];
  for (let i = 1; i < segment.length - 1; i++) {
    const history = segment.slice(Math.max(0, i - 20), i + 1);
    const local = computeStats(segment.slice(0, i + 1));
    const target = segment[i + 1];
    pairs.push({
      origin: i, target, envelopeMean: envelope.mean, localMean: local.mean,
      envelopePrediction: predict(id, envelope, history), localPrediction: predict(id, local, history),
    });
  }
  const envelopeMAE = mean(pairs.map(row => Math.abs(row.envelopePrediction - row.target)));
  const localMAE = mean(pairs.map(row => Math.abs(row.localPrediction - row.target)));
  assert.ok(near(envelopeMAE, computePredictionError(id, envelope, segment)));
  return {
    envelopeMAE, localMAE,
    firstDifference: pairs.find(row => !near(row.envelopePrediction, row.localPrediction)) ?? null,
  };
}

const originComparisons = Array.from({ length: 10 }, (_, id) => {
  const whole = compareOrigins(id, window);
  const train = compareOrigins(id, window.slice(0, split));
  const validation = compareOrigins(id, window.slice(split));
  return { id, whole, train, validation,
    weightedEnvelope: 0.7 * train.envelopeMAE + 0.3 * validation.envelopeMAE,
    weightedLocal: 0.7 * train.localMAE + 0.3 * validation.localMAE,
  };
});

const prefix = prices.slice(0, 21);
const stats = computeStats(prefix);
const mu = mean(prefix.slice(1).map((price, index) => Math.log(price / prefix[index])));
assert.ok(near(stats.mean, mu));
const last = prefix.at(-1);
const target = prices[21];
const prediction = mu + alpha(stats) * (mu - last);
assert.ok(near(prediction, predictMeanReverting(stats, prefix)));
assert.ok(near(prediction, predict(1, stats, prefix)));
const t1 = {
  mu, sigma: Math.sqrt(stats.variance), alpha: alpha(stats), last, target, prediction,
  levelError: Math.abs(prediction - target),
  deltaErrorAfterConversion: Math.abs((prediction - last) - (target - last)),
  diffForAction: mu - last,
  actualPhi: computePhi(1, stats, prefix).phi,
  actualSignal: computeAction(1, computePhi(1, stats, prefix).phi, 0.5, stats, prefix),
  signalIfGatePasses: computeAction(1, 1, 0.5, stats, prefix),
};

// Instrument only the insertion point in a second, in-memory instance of the compiled module.
const compiled = readFileSync(simulator, 'utf8');
assert.equal(compiled.split('ticks.push({').length, 2);
const moduleExports = {};
let firstState;
const capture = state => ({
  transitions: structuredClone(state.transitions),
  performance: structuredClone(state.performance),
});
let before;
const observe = state => {
  if (firstState) return;
  firstState = state;
  before = capture(state);
};
const initialize = runInThisContext(
  '(function(exports, require, observe) {\n' +
  compiled.replace('ticks.push({', 'observe(state); ticks.push({') + '\n})',
  { filename: simulator },
);
initialize(moduleExports, createRequire(simulator), observe);
const instrumented = moduleExports.runBacktest(prices);
assert.equal(firstState, instrumented.ticks[0].state);
const after = capture(firstState);
const totalActivations = state => state.performance.reduce((sum, item) => sum + item.activationCount, 0);
const snapshot = {
  tick: firstState.tick,
  transitions: [before.transitions.length, after.transitions.length],
  activations: [totalActivations(before), totalActivations(after)],
  transitionsWithTick: after.transitions.filter(transition => Object.hasOwn(transition, 'tick')).length,
  countUsingReferenceFilter: after.transitions.filter(transition => transition.tick <= firstState.tick).length,
  transAlias: firstState.transitions === instrumented.finalState.transitions,
  perfAlias: firstState.performance === instrumented.finalState.performance,
};

const alternating = Array.from({ length: 50 }, (_, i) => i % 2);
const i1 = {
  ...checkInvariantI1(alternating),
  expectedSampleVariance: 50 * 0.25 / 49,
  conditionalByPhase: [0, 1].map(phase => checkInvariantI1(
    alternating.filter((_, i) => i % 2 === phase),
  ).variance),
};
assert.ok(near(i1.variance, i1.expectedSampleVariance));
const flat = Array(80).fill(100);
const flatStats = computeStats(flat);
const zeroPhi = {
  rawBaseline: computeBaselineError(flat),
  rawPredictionError: computePredictionError(0, flatStats, flat),
  ...computePhi(0, flatStats, flat),
  minCost: computePhiMinCost([0.7, 0.8]),
  normalizedUniformEntropy: computePhiEntropy(Array(10).fill(0.1)),
};

const telemetry = Array.from({ length: 180 }, (_, t) => 60 + 2 * Math.sin(t / 9) + (t >= 90 ? 4 : 0));
const scales = [1, 1000];
const transfers = scales.map(scale => {
  const result = score(telemetry.map(value => value * scale));
  checkReference(result, reference.transfer.find(row => row.scale === scale));
  return result;
});
const [low, high] = transfers;
const transferDifferences = {};
for (const name of ['theory', 'signal', 'regime', 'theoryChanged', 'phi', 'theta', 'error']) {
  const differingRows = low.rows.filter((row, index) => {
    const other = high.rows[index];
    if (name === 'error') return row.errors !== null && !near(row.errors[0], other.errors[0] / 1000);
    if (name === 'phi' || name === 'theta') return !near(row[name], other[name]);
    return row[name] !== other[name];
  });
  transferDifferences[name] = { count: differingRows.length, firstTick: differingRows[0]?.tick ?? null };
}

console.log(JSON.stringify({
  t1, originComparisons, snapshot, i1, zeroPhi, datasets, familyMeans,
  transfers: transfers.map(({ rows, mae, ...rest }, i) => ({
    scale: scales[i], ticks: rows.length, normalizedMAE: mae.map(value => value / scales[i]), ...rest,
  })),
  transferDifferences,
}, null, 2));
