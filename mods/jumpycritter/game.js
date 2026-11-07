// The rules. No app calls here, so tests can run it. Sizes are in the app's own units.
export const BEST_KEY = "jumpycritter.best";
export const BODY = { x: 96, w: 52, h: 34 };
export const WALL_W = 84;
const GRAVITY = 1500;
const FLAP = -430;
const SPEED = 175;
const SPACING = 270;
const GAP = 178;
const EDGE = 40;

export const newGame = (height, best = 0) => ({ phase: "ready", y: height / 2, vy: 0, walls: [], score: 0, best, shields: 0, safeFor: 0, flapped: 0, time: 0, height });

function addWall(game, x, rng) {
  const room = game.height - GAP - EDGE * 2;
  game.walls.push({ x, top: EDGE + rng() * Math.max(0, room), passed: false });
}

export function flap(game) {
  if (game.phase === "over") return game;
  game.phase = "play";
  game.vy = FLAP;
  game.flapped = 0.14;
  return game;
}

const hits = (game, wall) => {
  const r = 6;
  if (BODY.x + BODY.w - r < wall.x || BODY.x + r > wall.x + WALL_W) return false;
  return game.y + r < wall.top || game.y + BODY.h - r > wall.top + GAP;
};

function crash(game) {
  if (game.safeFor > 0) return;
  if (game.shields > 0) {
    game.shields -= 1;
    game.safeFor = 1.2;
    return;
  }
  game.phase = "over";
  game.best = Math.max(game.best, game.score);
}

export function step(game, dt, width, rng = Math.random) {
  game.time += dt;
  if (game.phase !== "play") return game;
  game.flapped = Math.max(0, game.flapped - dt);
  game.safeFor = Math.max(0, game.safeFor - dt);
  game.vy += GRAVITY * dt;
  game.y += game.vy * dt;
  for (const wall of game.walls) wall.x -= SPEED * dt;
  game.walls = game.walls.filter((wall) => wall.x > -WALL_W);
  const last = game.walls.at(-1);
  if (!last || last.x < width + WALL_W - SPACING) addWall(game, last ? last.x + SPACING : width + 60, rng);
  for (const wall of game.walls) {
    if (!wall.passed && wall.x + WALL_W < BODY.x) { wall.passed = true; game.score += 1; }
    if (hits(game, wall)) crash(game);
  }
  if (game.y < 0) { game.y = 0; game.vy = 0; }
  if (game.y + BODY.h > game.height) {
    game.y = game.height - BODY.h;
    game.vy = FLAP * 0.6;
    crash(game);
  }
  return game;
}

// The window changed size: everything keeps its place in proportion, and every gap stays inside.
export function fit(game, height) {
  if (height === game.height || height <= 0) return game;
  const ratio = height / game.height;
  game.height = height;
  game.y = Math.max(0, Math.min(height - BODY.h, game.y * ratio));
  const low = Math.min(EDGE, Math.max(0, height - GAP));
  for (const wall of game.walls) wall.top = Math.max(low, Math.min(Math.max(low, height - GAP - low), wall.top * ratio));
  return game;
}

export const bestOf = (game) => Math.max(game.best, game.score);

// A new run from the crash screen: the same press flaps, and shields earned meanwhile stay.
export function retry(game, height) {
  const next = newGame(height, bestOf(game));
  next.shields = game.shields;
  return flap(next);
}

// A finished agent turn gives one shield, up to three. A shield takes one crash.
export const addShield = (game) => { game.shields = Math.min(3, game.shields + 1); return game; };

export function readAgents(before, list) {
  const now = {};
  let finished = 0;
  for (const agent of list) {
    now[agent.address] = agent.status;
    const was = before[agent.address];
    if ((was === "working" || was === "blocked") && (agent.status === "idle" || agent.status === "done")) finished += 1;
  }
  return { now, finished, blocked: list.filter((agent) => agent.status === "blocked") };
}
