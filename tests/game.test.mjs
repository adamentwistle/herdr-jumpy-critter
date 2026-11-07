import assert from "node:assert/strict";
import test from "node:test";
import { BODY, WALL_W, addShield, flap, newGame, readAgents, step } from "../mods/jumpycritter/game.js";

const run = (game, seconds, press) => {
  for (let t = 0; t < seconds; t += 0.016) { if (press) press(game); step(game, 0.016, 560, () => 0.5); }
  return game;
};

test("nothing moves until the first flap", () => {
  const game = newGame(700);
  run(game, 1);
  assert.equal(game.phase, "ready");
  assert.equal(game.y, 350);
  assert.equal(game.walls.length, 0);
});

test("a flap lifts you and gravity brings you down", () => {
  const game = flap(newGame(700));
  const start = game.y;
  step(game, 0.1, 560, () => 0.5);
  assert.ok(game.y < start);
  run(game, 0.8);
  assert.ok(game.vy > 0);
});

test("falling to the floor ends the run and keeps the best", () => {
  const game = flap(newGame(700, 4));
  game.score = 9;
  run(game, 3);
  assert.equal(game.phase, "over");
  assert.equal(game.best, 9);
});

test("flying through a gap scores once", () => {
  const game = flap(newGame(700));
  step(game, 0.016, 560, () => 0.5);
  game.walls = [{ x: BODY.x + 10, top: 260, passed: false }];
  game.y = 330; game.vy = 0;
  // Hold the height: a steady hover through the gap.
  for (let i = 0; i < 40; i++) { game.vy = 0; game.y = 330; step(game, 0.016, 560, () => 0.5); }
  assert.equal(game.phase, "play");
  assert.equal(game.score, 1);
  assert.equal(game.walls[0].passed, true);
});

test("hitting a wall ends the run, and a shield takes the hit instead", () => {
  const game = flap(newGame(700));
  step(game, 0.016, 560, () => 0.5);
  game.walls = [{ x: BODY.x, top: 500, passed: false }];
  game.y = 100; game.vy = 0;
  addShield(game);
  step(game, 0.016, 560, () => 0.5);
  assert.equal(game.phase, "play");
  assert.equal(game.shields, 0);
  assert.ok(game.safeFor > 0);
  game.safeFor = 0; game.y = 100; game.vy = 0;
  step(game, 0.016, 560, () => 0.5);
  assert.equal(game.phase, "over");
});

test("shields stop at three", () => {
  const game = newGame(700);
  for (let i = 0; i < 6; i++) addShield(game);
  assert.equal(game.shields, 3);
});

test("walls keep coming, spaced evenly, and old ones go", () => {
  const game = flap(newGame(700));
  run(game, 6, (g) => { if (g.y > 340) flap(g); g.safeFor = 1; });
  assert.ok(game.walls.length >= 2);
  assert.ok(game.walls.every((wall) => wall.x > -WALL_W));
  const gaps = game.walls.slice(1).map((wall, i) => wall.x - game.walls[i].x);
  assert.ok(gaps.every((gap) => Math.abs(gap - 270) < 1));
});

test("a finished turn is counted once", () => {
  const first = readAgents({}, [{ address: "a", status: "working" }]);
  const second = readAgents(first.now, [{ address: "a", status: "done" }]);
  assert.equal(second.finished, 1);
  assert.equal(readAgents(second.now, [{ address: "a", status: "idle" }]).finished, 0);
});

test("shrinking the window keeps the run alive and every gap reachable", async () => {
  const { fit } = await import("../mods/jumpycritter/game.js");
  const game = flap(newGame(700));
  game.y = 500;
  game.walls = [{ x: 400, top: 450, passed: false }];
  fit(game, 400);
  assert.equal(game.height, 400);
  assert.ok(game.y + BODY.h <= 400);
  assert.ok(game.walls[0].top + 178 <= 400);
  step(game, 0.016, 560, () => 0.5);
  assert.equal(game.phase, "play");
});

test("retry starts at once, and keeps shields and the best score", async () => {
  const { retry } = await import("../mods/jumpycritter/game.js");
  const game = flap(newGame(700, 3));
  game.phase = "over"; game.score = 5; game.best = 5;
  addShield(game);
  const next = retry(game, 700);
  assert.equal(next.phase, "play");
  assert.ok(next.vy < 0);
  assert.equal(next.shields, 1);
  assert.equal(next.best, 5);
  assert.equal(next.score, 0);
});

test("the best score counts a run still in the air", async () => {
  const { bestOf } = await import("../mods/jumpycritter/game.js");
  const game = flap(newGame(700, 3));
  game.score = 8;
  assert.equal(bestOf(game), 8);
  game.score = 1;
  assert.equal(bestOf(game), 3);
});
