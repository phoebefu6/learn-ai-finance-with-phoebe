/* finance-live.js - the month-end close copilot lever simulator (learn-ai-finance-with-phoebe).
   Reusable "watch the number climb" pattern (see learn-text-to-sql t2sql-live.js).
   Deterministic, offline, no dependencies. Renders into #finance-live.

   Teaching idea: the learner toggles CONTEXT + GUARDRAIL levers and watches an AI's
   month-end variance commentary go from confident fiction to a checkable, board-grade
   draft - and watches an accuracy scorecard climb. The "model" is a scripted teaching
   simulation; the lesson (ground it, guardrail it, verify it) is real.

   Bump ?v= on change (Pages caches hard). */
(function () {
  var host = document.getElementById("finance-live");
  if (!host) return;

  /* ---- the scenario: a small month-end P&L (all figures in $000, synthetic) ---- */
  var LINES = [
    { key: "rev",  name: "Revenue",    budget: 4000, actual: 4120, prior: 3880, group: "trading" },
    { key: "cogs", name: "COGS",       budget: 2500, actual: 2610, prior: 2380, group: "trading" },
    { key: "mkt",  name: "Marketing",  budget: 300,  actual: 470,  prior: 290,  group: "opex" },
    { key: "ga",   name: "G&A",        budget: 400,  actual: 405,  prior: 395,  group: "opex" },
    { key: "legal",name: "Legal",      budget: 0,    actual: 180,  prior: 0,    group: "oneoff" }
  ];

  /* the five levers, in ladder order */
  var LEVERS = [
    { id: "data",   label: "Attach the numbers",     hint: "actuals vs budget, grounded",       pts: 35 },
    { id: "trend",  label: "Add prior period",        hint: "so it can explain direction",       pts: 12 },
    { id: "context",label: "Add business context",    hint: "drivers behind the movements",      pts: 18 },
    { id: "mapping",label: "Add chart-of-accounts",   hint: "group one-offs below the line",     pts: 10 },
    { id: "guard",  label: "Add guardrails",          hint: "materiality + flag + cite",         pts: 15 }
  ];

  var state = { data: false, trend: false, context: false, mapping: false, guard: false, mode: "live" };

  /* ---- scoring: base 10, plus each active lever's points, capped 100 ---- */
  function score() {
    var s = 10;
    LEVERS.forEach(function (l) { if (state[l.id]) s += l.pts; });
    return Math.min(100, s);
  }

  /* ---- the two anomalies that SHOULD be caught: Marketing overspend + Legal one-off.
     Caught only when the numbers are attached AND guardrails are on. This is the
     honest demo: the catch is gated on the guardrail lever, and the catchable items
     only exist once real data is attached - turning guardrails on visibly catches
     them rather than making them silently vanish. ---- */
  function anomaliesCaught() {
    return (state.data && state.guard) ? 2 : 0;
  }

  var fmt = function (n) { return n.toLocaleString("en-US"); };

  /* ---- build the AI "commentary" from the current lever state ---- */
  function commentary() {
    var parts = [];
    if (!state.data) {
      // ungrounded: the model invents plausible, WRONG figures
      parts.push({ warn: true, t: "Revenue came in around $5.1m, comfortably ahead of plan on strong demand, while costs stayed broadly in line. A solid month overall." });
      parts.push({ warn: true, t: "(No numbers were attached - every figure above is invented by the model. This is what an ungrounded finance answer looks like: fluent, confident, and fiction.)" });
      return parts;
    }
    // grounded: real numbers
    var rev = LINES[0], cogs = LINES[1], mkt = LINES[2], ga = LINES[3], legal = LINES[4];
    var line = "Revenue " + fmt(rev.actual) + " vs budget " + fmt(rev.budget) + " (+" + fmt(rev.actual - rev.budget) + "); COGS " + fmt(cogs.actual) + " vs " + fmt(cogs.budget) + " (+" + fmt(cogs.actual - cogs.budget) + ").";
    if (state.trend) {
      var revg = (((rev.actual - rev.prior) / rev.prior) * 100).toFixed(1);
      line += " Revenue is up from " + fmt(rev.prior) + " prior period (+" + revg + "%), so the beat is genuine growth, not a base effect.";
    } else {
      line += " (No prior period attached, so direction and momentum cannot be assessed.)";
    }
    parts.push({ warn: false, t: line });

    var opex = "Marketing " + fmt(mkt.actual) + " vs budget " + fmt(mkt.budget) + " and Legal " + fmt(legal.actual) + " vs " + fmt(legal.budget) + ".";
    if (state.context) {
      opex += " Marketing overspend reflects the Q2 launch campaign; Legal " + fmt(legal.actual) + " is a one-off settlement, not a run-rate cost.";
    } else {
      opex += " Causes are not explained (no business context attached), so the commentary can only describe, not attribute.";
    }
    parts.push({ warn: false, t: opex });

    if (state.mapping) {
      var opTrade = (rev.actual - cogs.actual);
      var opAfterOpex = opTrade - mkt.actual - ga.actual;
      parts.push({ warn: false, t: "Grouped correctly: trading result " + fmt(opTrade) + ", operating result after opex " + fmt(opAfterOpex) + ", with the " + fmt(legal.actual) + " legal item shown below the line as a one-off. Underlying performance is cleaner than the headline." });
    } else {
      parts.push({ warn: false, t: "(No chart-of-accounts mapping: the one-off legal item is lumped into operating costs, understating underlying performance.)" });
    }
    return parts;
  }

  /* ---- flags panel (only meaningful with guardrails) ---- */
  function flags() {
    if (!state.data) return [];
    if (!state.guard) {
      return [{ kind: "muted", t: "Guardrails off: no materiality filter and no anomaly flags. Immaterial and material variances read the same, and nothing is escalated." }];
    }
    var mkt = LINES[2], legal = LINES[4];
    var mktPct = (((mkt.actual - mkt.budget) / mkt.budget) * 100).toFixed(0);
    return [
      { kind: "flag", t: "Marketing +" + mktPct + "% vs budget (" + fmt(mkt.actual) + " vs " + fmt(mkt.budget) + ") exceeds the 15% materiality threshold - investigate before sign-off." },
      { kind: "flag", t: "Legal " + fmt(legal.actual) + " is unbudgeted and one-off - confirm classification and disclosure." },
      { kind: "ok",   t: "G&A variance (+5, ~1%) is below threshold - filtered as immaterial, not raised." }
    ];
  }

  /* ---- golden-set scorecard: each item needs specific levers to be handled right ---- */
  var GOLDEN = [
    { name: "Revenue variance",   need: ["data", "trend"],               why: "state + direction" },
    { name: "COGS variance",      need: ["data", "trend"],               why: "state + direction" },
    { name: "Marketing overspend",need: ["data", "context", "guard"],    why: "attribute + flag" },
    { name: "G&A (immaterial)",   need: ["data", "guard"],               why: "correctly filter out" },
    { name: "Legal one-off",      need: ["data", "context", "mapping"],  why: "attribute + classify" }
  ];
  function itemOk(item) { return item.need.every(function (k) { return state[k]; }); }
  function accuracy() {
    var ok = GOLDEN.filter(itemOk).length;
    return { ok: ok, total: GOLDEN.length, pct: Math.round((ok / GOLDEN.length) * 100) };
  }

  /* ================= render ================= */
  host.innerHTML =
    '<div class="fl-shell">' +
      '<div class="fl-controls">' +
        '<div class="fl-ctitle">Context &amp; guardrail levers</div>' +
        '<div class="fl-levers"></div>' +
        '<div class="fl-modes">' +
          '<button type="button" class="fl-mode fl-on" data-mode="live">Live commentary</button>' +
          '<button type="button" class="fl-mode" data-mode="score">Accuracy scorecard</button>' +
        '</div>' +
      '</div>' +
      '<div class="fl-stage">' +
        '<div class="fl-meters">' +
          '<div class="fl-meter"><span class="fl-mlabel">Commentary quality</span><span class="fl-mval" id="fl-score">10</span><div class="fl-bar"><i id="fl-bar"></i></div></div>' +
          '<div class="fl-meter"><span class="fl-mlabel">Anomalies caught</span><span class="fl-mval" id="fl-anom">0 / 2</span></div>' +
        '</div>' +
        '<div id="fl-body"></div>' +
        '<p class="fl-rail">This model is a scripted teaching simulation - a real LLM will word things differently. What is real is the lesson: grounding, context, and guardrails are what turn a confident guess into a checkable draft, and a human still owns the final sign-off.</p>' +
      '</div>' +
    '</div>';

  var leverWrap = host.querySelector(".fl-levers");
  LEVERS.forEach(function (l) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "fl-lever";
    b.setAttribute("data-lever", l.id);
    b.innerHTML = '<span class="fl-sw"></span><span class="fl-ltext"><b>' + l.label + '</b><span>' + l.hint + '</span></span>';
    b.addEventListener("click", function () { state[l.id] = !state[l.id]; render(); });
    leverWrap.appendChild(b);
  });
  host.querySelectorAll(".fl-mode").forEach(function (m) {
    m.addEventListener("click", function () { state.mode = m.getAttribute("data-mode"); render(); });
  });

  function render() {
    // levers
    host.querySelectorAll(".fl-lever").forEach(function (b) {
      b.classList.toggle("fl-active", !!state[b.getAttribute("data-lever")]);
    });
    // modes
    host.querySelectorAll(".fl-mode").forEach(function (m) {
      m.classList.toggle("fl-on", m.getAttribute("data-mode") === state.mode);
    });
    // meters
    var s = score();
    host.querySelector("#fl-score").textContent = s;
    host.querySelector("#fl-bar").style.width = s + "%";
    var ac = anomaliesCaught();
    var anomEl = host.querySelector("#fl-anom");
    anomEl.textContent = ac + " / 2";
    anomEl.className = "fl-mval" + (ac === 2 ? " fl-good" : "");

    var body = host.querySelector("#fl-body");
    if (state.mode === "score") {
      var a = accuracy();
      var rows = GOLDEN.map(function (it) {
        var ok = itemOk(it);
        return '<tr class="' + (ok ? "fl-r-ok" : "fl-r-no") + '"><td>' + it.name + '</td><td>' + it.why +
          '</td><td class="fl-rmark">' + (ok ? "✓" : "✗") + '</td></tr>';
      }).join("");
      body.innerHTML =
        '<div class="fl-scorehead">Golden set: ' + a.ok + ' of ' + a.total + ' items handled correctly <b>(' + a.pct + '%)</b></div>' +
        '<table class="fl-table"><thead><tr><th>Variance item</th><th>Needs</th><th>OK?</th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '<p class="fl-note">Each item needs the right levers on. Turn them on one by one and watch accuracy climb from 0% to 100% - the same shape as your trust in the output.</p>';
    } else {
      var c = commentary();
      var cHtml = c.map(function (p) {
        return '<p class="fl-line' + (p.warn ? " fl-warn" : "") + '">' + p.t + '</p>';
      }).join("");
      var f = flags();
      var fHtml = f.length ? '<div class="fl-flags">' + f.map(function (x) {
        var icon = x.kind === "flag" ? "⚑" : (x.kind === "ok" ? "✓" : "•");
        return '<div class="fl-fl fl-fl-' + x.kind + '"><span>' + icon + '</span><p>' + x.t + '</p></div>';
      }).join("") + '</div>' : "";
      body.innerHTML =
        '<div class="fl-draftlabel">AI draft: month-end variance commentary</div>' +
        '<div class="fl-draft">' + cHtml + '</div>' + fHtml;
    }
  }

  render();
})();
