// The support desk front end. Vanilla JS: fetch, render, done.

const $ = (selector) => document.querySelector(selector);
const esc = (text) => String(text ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const { emails, drafts, week, live, models } = await (await fetch("/api/samples")).json();
let current = emails[0];

$("#mode").textContent = live ? `live · ${models.smart}` : "replay mode";
$("#mode").title = live ? "" : "Pre-written answers for the sample emails. Add ANTHROPIC_API_KEY to .env to run live.";
$("#week-count").textContent = `${week.length} tickets from the past 7 days`;

// ── tabs ───────────────────────────────────────────────────────────────────
for (const tab of document.querySelectorAll(".tab")) {
  tab.onclick = () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === tab));
    document.querySelectorAll(".view").forEach((v) => (v.hidden = v.id !== tab.dataset.view));
  };
}

// ── inbox ──────────────────────────────────────────────────────────────────
function renderList() {
  $("#list").innerHTML = emails
    .map((e) => `<button class="item ${e === current ? "active" : ""}" data-id="${e.id}">
        <strong>${esc(e.subject)}</strong><span>${esc(e.from)}</span></button>`)
    .join("");
  for (const item of document.querySelectorAll(".item")) {
    item.onclick = () => {
      current = emails.find((e) => e.id === item.dataset.id);
      renderList();
      renderEmail();
    };
  }
}

function renderEmail() {
  $("#email").innerHTML = `<h2>${esc(current.subject)}</h2><p class="muted">${esc(current.from)}</p><pre>${esc(current.body)}</pre>`;
  $("#results").innerHTML = "";
}

$("#draft-picker").innerHTML += drafts.map((d) => `<option value="${d.id}">${d.id}</option>`).join("");
$("#draft-picker").onchange = (event) => {
  const draft = drafts.find((d) => d.id === event.target.value);
  if (draft) $("#reply-text").value = draft.text;
  $("#tidy-results").innerHTML = "";
};
$("#send").onclick = () => toast("Demo only: nothing was sent.");

// ── one helper for every AI button ─────────────────────────────────────────
async function press(button, action, body) {
  const label = button.textContent;
  button.disabled = true;
  button.textContent = "Working…";
  try {
    const res = await fetch(`/api/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return await res.json();
  } catch {
    return { error: "Couldn't reach the server." };
  } finally {
    button.disabled = false;
    button.textContent = label;
  }
}

const cost = (text) => `<p class="cost">${esc(text)}</p>`;
const failed = (message) => `<div class="card note">The AI button didn't work this time: ${esc(message)}<br>Nothing was changed. You can carry on by hand.</div>`;

for (const button of document.querySelectorAll("[data-action]")) {
  button.onclick = async () => {
    const action = button.dataset.action;
    if (action === "tidy") return tidy(button);
    if (action === "check") return checkMine(button);
    if (action === "themes") return themes(button);
    const result = await press(button, action, { email: current.body });
    const html = result.error ? failed(result.error) : render[action](result);
    $("#results").insertAdjacentHTML("afterbegin", html);
    if (action === "reply" && !result.error) wireReply($("#results").firstElementChild);
  };
}

// ── renderers ──────────────────────────────────────────────────────────────
const render = {
  fill({ ticket, warnings, cost: c }) {
    const field = (name, label, value) => {
      const unsure = ticket.uncertain.includes(name);
      const empty = value === null;
      return `<label class="${unsure ? "unsure" : ""} ${empty ? "empty" : ""}">${label}
        <input value="${esc(value ?? "")}" placeholder="unknown">${unsure ? "<small>check this</small>" : ""}</label>`;
    };
    return `<div class="card result"><h3>Ticket</h3>
      <div class="form">
        ${field("customer_name", "Name", ticket.customer_name)}
        ${field("order_number", "Order", ticket.order_number)}
        ${field("product", "Product", ticket.product)}
        ${field("issue", "Issue", ticket.issue)}
        ${field("urgency", "Urgency", ticket.urgency)}
      </div>
      <p>${esc(ticket.summary)}</p>
      ${warnings.map((w) => `<p class="warn">${esc(w)}</p>`).join("")}
      <button class="ghost" onclick="this.textContent='Ticket created (demo)'">Create ticket</button>
      ${cost(c)}</div>`;
  },

  route({ classification, routedTo, next, cost: c }) {
    const body = next
      ? `<ol>${next.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>` +
        (next.ask_customer_for.length ? `<p class="muted">Ask the customer for: ${next.ask_customer_for.map(esc).join(", ")}</p>` : "")
      : `<p class="warn">Not sure where this goes, so it's assigned to a person. No suggestions.</p>`;
    return `<div class="card result"><h3>Routed to <span class="pill">${esc(routedTo)}</span></h3>
      <p class="muted">${esc(classification.reason)}</p>${body}${cost(c)}</div>`;
  },

  reply({ draft, passed, openProblems, attempts, cost: c }) {
    const history =
      attempts.length > 1
        ? `<details><summary>First draft was revised</summary><pre>${esc(attempts[0].draft)}</pre>${problemList(attempts[0].check.problems)}</details>`
        : "";
    const open = passed ? "" : `<p class="warn">Still open after one revision. Fix these by hand:</p>${problemList(openProblems)}`;
    return `<div class="card result reply"><h3>Draft reply ${passed ? '<span class="pill ok">passed checks</span>' : '<span class="pill bad">needs your eye</span>'}</h3>
      ${history}<pre class="draft">${esc(draft)}</pre>${open}
      <div class="row"><button class="use">Use this draft</button></div>${cost(c)}</div>`;
  },
};

const problemList = (problems) =>
  `<ul class="problems">${problems.map((p) => `<li><b>${p.rule}</b> "${esc(p.quote)}": ${esc(p.fix)}</li>`).join("")}</ul>`;

function wireReply(card) {
  card.querySelector(".use").onclick = () => {
    $("#reply-text").value = card.querySelector(".draft").textContent;
    $("#tidy-results").innerHTML = "";
    toast("Draft copied to your reply. Edit it, check it, then send.");
  };
}

// The checker doesn't care who wrote the reply. Edits by a person get the same rules.
async function checkMine(button) {
  const text = $("#reply-text").value;
  if (!text.trim()) return toast("Write or load a reply first.");
  const result = await press(button, "check", { email: current.body, text });
  $("#tidy-results").innerHTML = result.error
    ? failed(result.error)
    : (result.check.pass ? '<p class="ok">✓ No rule broken.</p>' : problemList(result.check.problems)) + cost(result.cost);
}

// ── tidy up: the person picks which changes to keep ────────────────────────
async function tidy(button) {
  const text = $("#reply-text").value;
  if (!text.trim()) return toast("Write or load a reply first.");
  const result = await press(button, "tidy", { text });
  if (result.error) return ($("#tidy-results").innerHTML = failed(result.error));

  $("#tidy-results").innerHTML = `<div class="changes">${result.changes
    .map((c, i) => `<label class="change ${c.applies ? "" : "skip"}">
      <input type="checkbox" data-i="${i}" ${c.applies ? "checked" : "disabled"}>
      <span><del>${esc(c.before)}</del> <ins>${esc(c.after)}</ins><small>${c.applies ? esc(c.why) : "Can't apply: text not found"}</small></span>
    </label>`)
    .join("")}</div>
    <button id="apply">Apply selected</button>${cost(result.cost)}`;

  $("#apply").onclick = () => {
    const picked = [...document.querySelectorAll(".change input:checked")].map((box) => result.changes[box.dataset.i]);
    // Same as applyChanges() in src/features/tidy.ts: plain string replacement, no AI.
    $("#reply-text").value = picked.reduce((t, c) => t.replace(c.before, () => c.after), text);
    $("#tidy-results").innerHTML = "";
    toast(`Applied ${picked.length} change${picked.length === 1 ? "" : "s"}.`);
  };
}

// ── weekly themes ──────────────────────────────────────────────────────────
async function themes(button) {
  const result = await press(button, "themes", {});
  if (result.error) return ($("#themes").innerHTML = failed(result.error));
  const max = Math.max(...result.themes.map((t) => t.count));
  $("#themes").innerHTML =
    result.themes
      .map((t) => `<div class="theme">
        <div class="theme-head"><b>${esc(t.name)}</b><span>${t.count}</span></div>
        <div class="meter"><i style="width:${(t.count / max) * 100}%"></i></div>
        <p>${esc(t.suggestion)}</p>
        <details><summary>${t.count} tickets</summary><ul>${t.ticket_ids
          .map((id) => `<li>${esc(week.find((w) => w.id === id)?.text)}</li>`)
          .join("")}</ul></details></div>`)
      .join("") + cost(result.cost);
}

function toast(message) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.append(el);
  setTimeout(() => el.remove(), 2500);
}

renderList();
renderEmail();
