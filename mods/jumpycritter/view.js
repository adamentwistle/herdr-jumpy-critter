// Draws the game. Each wall is a stack of terminal windows with a gap to fly through.
import { div, image } from "gpui-kit";
import { BODY, WALL_W } from "./game.js";

const ART = "mods/jumpycritter/art";
const BACK = "#1a1917";
const PANE = "#262522";
const BAR = "#34322e";
const LINE = "#4a4741";
const CLAY = "#d97757";
const TEXT = "#f0eee6";
const DIM = "#9a968c";
const STACK = 92;
const GAP = 178;

const label = (text, colour = DIM, size = 14) => div().text_size(size).text_color(colour).child(text);

function terminal(x, y, h, seed) {
  const el = div().absolute().left(x).top(y).w(WALL_W).h(h).bg(PANE).rounded(4).border_1().border_color(LINE).overflow_hidden()
    .child(div().absolute().left(0).top(0).w(WALL_W).h(14).bg(BAR))
    .child(div().absolute().left(6).top(4).w(6).h(6).rounded(3).bg(CLAY));
  for (let i = 0; i * 12 + 22 < h - 6; i++) {
    const w = 18 + ((seed * 7 + i * 13) % 46);
    el.child(div().absolute().left(8).top(22 + i * 12).w(w).h(4).bg(i % 4 === 1 ? "#d9775770" : LINE));
  }
  return el;
}

function wall(item, height, index) {
  const parts = [];
  for (let y = item.top; y > -STACK; y -= STACK) parts.push(terminal(item.x, y - STACK + 2, STACK - 4, index + parts.length));
  const below = item.top + GAP;
  for (let y = below; y < height; y += STACK) parts.push(terminal(item.x, y + 2, STACK - 4, index + parts.length + 3));
  return parts;
}

function hero(game) {
  const frame = game.phase === "over" ? "hit" : game.flapped > 0 || game.phase === "ready" && Math.floor(game.time * 3) % 2 ? "up" : "down";
  const y = game.phase === "ready" ? game.y + Math.sin(game.time * 4) * 8 : game.y;
  const body = image(`${ART}/${frame}.png`).absolute().left(BODY.x).top(y).w(BODY.w).h(BODY.w * (10 / 13));
  return game.safeFor > 0 && Math.floor(game.time * 12) % 2 ? body.opacity(0.35) : body;
}

const centre = (W, H) => div().absolute().left(0).top(0).w(W).h(H).flex().flex_col().items_center().justify_center().gap(10);

export function gameView(game, box, link, paused) {
  const W = box.width, H = box.height;
  const kids = [];
  game.walls.forEach((item, i) => kids.push(...wall(item, H, i + Math.floor(item.top))));
  kids.push(hero(game));
  kids.push(div().absolute().left(0).top(18).w(W).flex().justify_center().child(label(String(game.score), TEXT, 44)));
  if (game.shields > 0) kids.push(div().absolute().left(16).top(18).child(label(`Shields ${game.shields}`, CLAY, 14)));
  kids.push(div().absolute().left(W - 96).top(18).w(80).flex().justify_end().child(label(`Best ${game.best}`, DIM, 14)));
  if (link.blocked > 0) kids.push(div().absolute().left(0).top(82).w(W).flex().justify_center()
    .child(div().px(12).py(5).rounded(4).bg("#000000b0").text_size(14).text_color("#ff7b72").child(`${link.blocked === 1 ? "An agent needs" : `${link.blocked} agents need`} you. G to go.`)));
  if (game.phase === "ready") kids.push(centre(W, H).child(label("Jumpy Critter", TEXT, 34)).child(label("Space or click to flap", DIM, 15)));
  if (game.phase === "over") kids.push(centre(W, H).bg("#00000080").child(label("Context full", TEXT, 34)).child(label(`${game.score} windows  ·  Space to try again`, DIM, 15)));
  if (paused && game.phase !== "over") kids.push(centre(W, H).bg("#00000090").child(label("Paused", TEXT, 28)).child(label("Click to play", DIM, 14)));
  return kids;
}

export const BACKDROP = BACK;
