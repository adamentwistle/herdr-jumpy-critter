// Jumpy Critter: flap through the gaps between stacks of terminals while your agents work. A finished agent turn gives a shield.
import { View, div } from "gpui-kit";
import { agents, closeOverlay, nextCommand, props, run, setShared, settings, shared } from "herdr";
import { BEST_KEY, addShield, bestOf, fit, flap, newGame, readAgents, retry, step } from "./game.js";
import { BACKDROP, gameView } from "./view.js";

const FIRST_BOX = { width: 560, height: 700 };

export default class JumpyCritter extends View {
  init(_initial, cx) {
    this.overlay = props()?.overlay ?? null;
    this.handle = cx.focus_handle();
    this.pixels = null;
    this.status = {};
    this.link = { blocked: 0, first: null };
    this.game = newGame(FIRST_BOX.height, Number(shared(BEST_KEY)) || 0);
    this.last = Date.now();
    this.nextAgents = 0;
    this.ticker = cx.timer.every(16, (c) => this.tick(c));
    cx.spawn(async (c) => {
      for (;;) {
        const command = await nextCommand();
        if (command === "focus") this.handle.focus();
        if (command === "go") this.goToAgent();
        c.notify();
      }
    });
  }

  close() {
    this.closed = true;
    this.ticker?.cancel();
    this.saveBest();
  }

  saveBest() {
    const best = bestOf(this.game);
    if (best > (Number(shared(BEST_KEY)) || 0)) setShared(BEST_KEY, best);
  }

  box() {
    const zoom = settings().zoom || 1;
    return this.pixels ? { width: this.pixels.width / zoom, height: this.pixels.height / zoom } : FIRST_BOX;
  }

  readAgents() {
    const seen = readAgents(this.status, agents());
    this.status = seen.now;
    this.link = { blocked: seen.blocked.length, first: seen.blocked[0]?.address ?? null };
    for (let i = 0; i < seen.finished; i++) addShield(this.game);
  }

  tick(cx) {
    if (this.closed) return;
    const now = Date.now(), dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (now >= this.nextAgents) { this.nextAgents = now + 1000; this.readAgents(); }
    if (this.overlay != null && !this.focusAsked) { this.focusAsked = true; this.handle.focus(); }
    this.paused = !this.handle.is_focused();
    const game = this.game, box = this.box();
    fit(game, box.height);
    if (this.paused) {
      if (now - (this.lastIdle ?? 0) > 500) { this.lastIdle = now; cx.notify(); }
      return;
    }
    const before = game.phase;
    step(game, dt, box.width);
    if (before === "play" && game.phase === "over") this.saveBest();
    cx.notify();
  }

  press() {
    if (this.game.phase === "over") this.game = retry(this.game, this.box().height);
    else flap(this.game);
  }

  goToAgent() {
    if (!this.link.first) return;
    const terminal = this.link.first;
    if (this.overlay != null) closeOverlay(this.overlay);
    run("agent.focus", { terminal });
  }

  render() {
    return div().id("jumpycritter").relative().size_full().overflow_hidden().bg(BACKDROP).track_focus(this.handle)
      .on_size_change((size) => { this.pixels = size; })
      .on_key_down((event) => {
        if (event.key === "g") this.goToAgent();
        else if ((event.key === "space" || event.key === "up" || event.key === "w") && !event.is_held) this.press();
      })
      .on_mouse_down("left", () => { const had = this.handle.is_focused(); this.handle.focus(); if (had) this.press(); })
      .children(gameView(this.game, this.box(), this.link, this.paused));
  }
}
