/* Exam Practice — vanilla JS, no build step. State lives in localStorage. */
(() => {
'use strict';

// ---------- helpers ----------
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rich = s => s ? esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>') : '';
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const fmt = ms => { const neg = ms < 0; ms = Math.abs(Math.round(ms / 1000)); const h = Math.floor(ms / 3600), m = Math.floor(ms % 3600 / 60), s = ms % 60; return (neg ? '-' : '') + (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0'); };
const pct = (a, b) => b ? Math.round(100 * a / b) : 0;
const LS = 'examPractice.v1';
let toastT;
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2200); };

// ---------- persistent state ----------
const blank = () => ({ customExams: [], sessions: {}, active: null, bookmarks: {}, notes: {}, theme: null });
let state = blank();
try { Object.assign(state, JSON.parse(localStorage.getItem(LS)) || {}); } catch (e) { /* ignore corrupt */ }
const save = () => { try { localStorage.setItem(LS, JSON.stringify(state)); } catch (e) { toast('Could not save (storage full?)'); } };
const applyTheme = () => { if (state.theme) document.documentElement.dataset.theme = state.theme; else delete document.documentElement.dataset.theme; };
applyTheme();

// ---------- exam data ----------
function normalize(e) {
  const ex = { ...e, custom: !!e.custom };
  ex.questions = (e.questions || []).map((q, i) => {
    const id = String(q.id || 'q' + (q.number ?? i + 1));
    const hasParts = q.parts && q.parts.length;
    const src = hasParts ? q.parts : [{ ...q, text: '', label: '' }];
    const parts = src.map(p => {
      const type = p.type || (p.options ? 'mcq' : 'short');
      let answer = p.answer;
      if (type === 'mcq' && typeof answer === 'string') answer = 'ABCDEFGH'.indexOf(answer.trim().toUpperCase());
      return { label: p.label || '', text: p.text || '', type, options: p.options || null, answer, accept: [].concat(p.accept || []), solution: p.solution || '', marks: Number(p.marks) || 1 };
    });
    return { id, key: ex.id + '|' + id, examId: ex.id, number: q.number ?? i + 1, topic: q.topic || 'General', section: q.section || '', stem: q.text || '', parts, marks: parts.reduce((a, p) => a + p.marks, 0) };
  });
  ex.totalMarks = ex.questions.reduce((a, q) => a + q.marks, 0);
  return ex;
}
const allExams = () => (window.EXAMS || []).concat(state.customExams.map(e => ({ ...e, custom: true }))).map(normalize);
const examById = id => allExams().find(e => e.id === id);
function findQ(examId, qid) { const ex = examById(examId); return ex && ex.questions.find(q => q.id === qid) ? { ex, q: ex.questions.find(q => q.id === qid) } : null; }
const itemKey = it => it.examId + '|' + it.qid;
const partKey = (it, pi) => itemKey(it) + '|' + pi;
const norm = s => String(s ?? '').toLowerCase().replace(/[\s$\\{}]/g, '').replace(/dfrac|tfrac/g, 'frac');
const matches = (p, v) => { const n = norm(v); return !!n && [p.answer, ...p.accept].some(a => typeof a === 'string' && norm(a) === n); };

// ---------- sessions ----------
const active = () => state.active && state.sessions[state.active];
function makeSession({ title, items, opts }) {
  const s = { id: uid(), title, items, opts, startedAt: Date.now(), elapsed: 0, idx: 0, answers: {}, flags: {}, qTime: {}, paused: false, finishedAt: null };
  state.sessions[s.id] = s; state.active = s.id; save(); return s;
}
const ans = (s, it, pi) => s.answers[partKey(it, pi)] || (s.answers[partKey(it, pi)] = {});
function gradePart(s, it, pi, p, force) {
  const a = ans(s, it, pi);
  if (a.marks !== undefined && !force) return;
  if (p.type === 'mcq') a.marks = a.v === p.answer ? p.marks : 0;
  else if (a.v && matches(p, a.v)) { a.marks = p.marks; a.auto = true; }
  else if (force) delete a.marks;
}
function autoGradeAll(s) {
  s.items.forEach(it => { const f = findQ(it.examId, it.qid); if (!f) return;
    f.q.parts.forEach((p, pi) => { const a = ans(s, it, pi); gradePart(s, it, pi, p);
      if (a.marks === undefined && !(a.v || a.w)) a.marks = 0; }); });
}
function score(s) {
  let got = 0, max = 0, pending = 0;
  s.items.forEach(it => { const f = findQ(it.examId, it.qid); if (!f) return;
    f.q.parts.forEach((p, pi) => { max += p.marks; const a = s.answers[partKey(it, pi)] || {}; if (a.marks === undefined) pending++; else got += a.marks; }); });
  return { got, max, pending };
}
function finishSession(s) {
  if (s.finishedAt) return;
  autoGradeAll(s); s.finishedAt = Date.now(); if (state.active === s.id) state.active = null; save(); stopTick();
  location.hash = '#/results/' + s.id;
}
const finished = () => Object.values(state.sessions).filter(s => s.finishedAt).sort((a, b) => b.finishedAt - a.finishedAt);

// ---------- timer ----------
let tick = null, last = 0, saveN = 0;
const limitMs = s => s.opts.timer === 'down' ? (s.opts.reading + s.opts.minutes) * 60000 : 0;
function startTick() {
  stopTick(); last = Date.now();
  tick = setInterval(() => {
    const s = active(); const now = Date.now(); const dt = now - last; last = now;
    if (!s || s.finishedAt || s.paused || document.hidden) return;
    s.elapsed += dt; const k = itemKey(s.items[s.idx]); s.qTime[k] = (s.qTime[k] || 0) + dt;
    updateTimer(s); if (++saveN % 20 === 0) save();
  }, 250);
}
const stopTick = () => { clearInterval(tick); tick = null; };
function updateTimer(s) {
  const el = $('#timer'); if (!el || s.opts.timer === 'none') return;
  if (s.opts.timer === 'up') { el.textContent = fmt(s.elapsed); return; }
  const rem = limitMs(s) - s.elapsed;
  el.textContent = fmt(rem); el.classList.toggle('low', rem < 5 * 60000);
  const ph = $('#phase'); if (ph) { const reading = s.opts.reading && s.elapsed < s.opts.reading * 60000; ph.textContent = rem <= 0 ? "Time's up" : reading ? 'Reading time' : 'Writing time'; }
  if (rem <= 0 && !s.timeUp) { s.timeUp = true; if (!s.opts.check) { toast("Time's up — submitting"); finishSession(s); } else toast("Time's up! (you can keep going)"); }
}

// ---------- math typesetting ----------
function typeset(root = document.body) {
  if (window.renderMathInElement) try { window.renderMathInElement(root, { throwOnError: false, delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\(', right: '\\)', display: false }, { left: '$', right: '$', display: false }] }); } catch (e) { /* ignore */ }
}
window.addEventListener('load', () => typeset());

// ---------- router ----------
const app = $('#app');
const routes = { '': library, exam: examPage, session: sessionPage, results: resultsPage, dashboard: dashboard, topics: topicsPage, bookmarks: bookmarksPage, manage: managePage };
function route() {
  const [name = '', ...args] = location.hash.replace(/^#\/?/, '').split('/');
  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === (name || 'library')));
  if (name !== 'session') stopTick();
  (routes[name] || library)(...args.map(decodeURIComponent));
  window.scrollTo(0, 0); typeset(app); renderResume();
}
function renderResume() {
  const s = active(), el = $('#resume');
  el.innerHTML = s && !location.hash.startsWith('#/session') ? `<div class="banner">⏱ Session in progress: <b>${esc(s.title)}</b> <a class="btn pri" href="#/session">Resume</a> <button data-act="abandon">Discard</button></div>` : '';
}
window.addEventListener('hashchange', route);

// ---------- library ----------
let libF = { q: '', subject: '', year: '', type: '' };
function library() {
  const ex = allExams(), uniq = k => [...new Set(ex.map(e => e[k]).filter(Boolean))].sort();
  const best = {}; finished().forEach(s => { const ids = [...new Set(s.items.map(i => i.examId))]; if (ids.length === 1 && s.items.length === examById(ids[0])?.questions.length) { const sc = score(s); best[ids[0]] = Math.max(best[ids[0]] || 0, pct(sc.got, sc.max)); } });
  const list = ex.filter(e => (!libF.q || (e.title + e.subject + e.year + e.type).toLowerCase().includes(libF.q.toLowerCase())) && (!libF.subject || e.subject === libF.subject) && (!libF.year || String(e.year) === libF.year) && (!libF.type || e.type === libF.type));
  const opt = (arr, v) => `<option value="">All</option>` + arr.map(x => `<option ${String(x) === v ? 'selected' : ''}>${esc(x)}</option>`).join('');
  app.innerHTML = `<h1>Past exams</h1><p class="mut">Pick a paper, choose how you want to sit it (check each answer as you go, or full exam conditions), and track your progress.</p>
  <div class="filters"><input type="search" placeholder="Search exams…" value="${esc(libF.q)}" data-lib="q">
   <select data-lib="subject">${opt(uniq('subject'), libF.subject)}</select><select data-lib="year">${opt(uniq('year').reverse(), libF.year)}</select><select data-lib="type">${opt(uniq('type'), libF.type)}</select></div>
  <div class="grid">${list.map(e => `<div class="card"><div class="row"><span class="tag">${esc(e.year)}</span><span class="tag">${esc(e.type)}</span>${e.custom ? '<span class="tag warn">custom</span>' : ''}${best[e.id] != null ? `<span class="tag ok">best ${best[e.id]}%</span>` : ''}</div>
   <h3>${esc(e.title)}</h3><div class="mut small">${esc(e.subject)} · ${e.questions.length} questions · ${e.totalMarks} marks${e.writingMin ? ' · ' + e.writingMin + ' min' : ''}</div>
   <a class="btn pri" href="#/exam/${encodeURIComponent(e.id)}" style="margin-top:auto;text-align:center">Open</a></div>`).join('') || '<p class="mut">No exams match. Import one on the Manage page.</p>'}</div>`;
}

// ---------- exam detail / session setup ----------
function examPage(id) {
  const ex = examById(id); if (!ex) { app.innerHTML = '<p>Exam not found.</p>'; return; }
  const topics = [...new Set(ex.questions.map(q => q.topic))];
  const hist = finished().filter(s => s.items.some(i => i.examId === id));
  app.innerHTML = `<p><a href="#/">← All exams</a></p><h1>${esc(ex.title)}</h1>
  <div class="row"><span class="tag">${esc(ex.year)}</span><span class="tag">${esc(ex.type)}</span><span class="tag">${esc(ex.subject)}</span><span class="tag">${ex.totalMarks} marks</span>${ex.source ? `<span class="tag">${esc(ex.source)}</span>` : ''}</div>
  ${ex.instructions ? `<p class="mut">${rich(ex.instructions)}</p>` : ''}
  <div class="card"><h3>Start a session</h3>
   <div class="row" id="presets"><button class="pri" data-preset="practice">Practice · check as I go</button><button data-preset="timed">Timed practice · check as I go</button><button data-preset="exam">Exam conditions</button></div>
   <div class="row" style="margin-top:12px;align-items:flex-end">
    <label class="f">Timer<select id="c-timer"><option value="up">Stopwatch (count up)</option><option value="down">Countdown</option><option value="none">No timer</option></select></label>
    <label class="f">Reading (min)<input id="c-read" type="number" min="0" value="0"></label>
    <label class="f">Writing (min)<input id="c-min" type="number" min="1" value="${ex.writingMin || Math.ceil(ex.totalMarks * 1.5)}"></label>
    <label class="f"><span>Check button</span><span><input id="c-check" type="checkbox" checked> after each question</span></label>
    <label class="f"><span>Order</span><span><input id="c-shuf" type="checkbox"> shuffle</span></label>
    <label class="f">Show<select id="c-kind"><option value="all">All questions</option><option value="mcq">Multiple choice only</option><option value="written">Written only</option></select></label>
   </div>
   <h3 style="margin-top:12px">Topics</h3><div class="row">${topics.map(t => `<label><input type="checkbox" class="c-topic" value="${esc(t)}" checked> ${esc(t)}</label>`).join('')}</div>
   <p><button class="pri" data-act="start-exam" data-id="${esc(id)}">▶ Start</button></p></div>
  <h2>Questions</h2><div class="card"><table><tr><th>#</th><th>Topic</th><th>Marks</th><th>Type</th><th></th></tr>${ex.questions.map(q => `<tr><td>${q.number}</td><td>${esc(q.topic)}</td><td>${q.marks}</td><td>${q.parts[0].type === 'mcq' ? 'MC' : 'Written'}</td><td><button data-act="start-one" data-id="${esc(id)}" data-q="${esc(q.id)}">Do this one</button></td></tr>`).join('')}</table></div>
  ${hist.length ? `<h2>Your attempts</h2>${historyTable(hist)}` : ''}`;
  applyPreset(ex, 'practice');
}
function applyPreset(ex, p) {
  const set = (id, v) => { const el = $('#' + id); if (el) el[typeof v === 'boolean' ? 'checked' : 'value'] = v; };
  const w = ex.writingMin || Math.ceil(ex.totalMarks * 1.5);
  if (p === 'practice') { set('c-timer', 'up'); set('c-check', true); set('c-read', 0); }
  if (p === 'timed') { set('c-timer', 'down'); set('c-check', true); set('c-read', 0); }
  if (p === 'exam') { set('c-timer', 'down'); set('c-check', false); set('c-read', ex.readingMin || 0); }
  set('c-min', w);
}
function readConfig() {
  const num = (id, d) => Math.max(0, Number($('#' + id)?.value) || d);
  return { timer: $('#c-timer').value, reading: num('c-read', 0), minutes: Math.max(1, num('c-min', 60)), check: $('#c-check').checked };
}
function startExam(id) {
  const ex = examById(id), topics = [...document.querySelectorAll('.c-topic:checked')].map(x => x.value), kind = $('#c-kind').value;
  let qs = ex.questions.filter(q => topics.includes(q.topic) && (kind === 'all' || (kind === 'mcq') === (q.parts[0].type === 'mcq')));
  if (!qs.length) return toast('No questions match those filters');
  if ($('#c-shuf').checked) qs = shuffle(qs);
  begin(ex.title + (qs.length < ex.questions.length ? ' (filtered)' : ''), qs.map(q => ({ examId: id, qid: q.id })), readConfig());
}
function begin(title, items, opts) {
  if (active() && !confirm('You have a session in progress. Discard it and start a new one?')) return;
  makeSession({ title, items, opts }); location.hash = '#/session'; if (location.hash === '#/session') route();
}
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------- session UI ----------
function navState(s, i) {
  const it = s.items[i], f = findQ(it.examId, it.qid); if (!f) return '';
  const res = f.q.parts.map((p, pi) => ans(s, it, pi));
  const cls = [];
  if (i === s.idx) cls.push('cur');
  if (s.flags[itemKey(it)]) cls.push('flag');
  if (res.every(a => a.checked)) { const ok = f.q.parts.every((p, pi) => res[pi].marks === p.marks); cls.push(ok ? 'good' : res.some((a, pi) => a.marks > 0) ? 'part' : 'wrong'); }
  else if (res.some(a => a.v !== undefined && a.v !== '' || a.w)) cls.push('ans');
  return cls.join(' ');
}
function sessionPage() {
  const s = active(); if (!s) { app.innerHTML = '<p>No session in progress. <a href="#/">Pick an exam</a>.</p>'; return; }
  if (s.idx >= s.items.length) s.idx = 0;
  const it = s.items[s.idx], f = findQ(it.examId, it.qid);
  if (!f) { app.innerHTML = '<p>Question missing (was the exam deleted?).</p>'; return; }
  const { ex, q } = f, k = itemKey(it), noteVal = state.notes[k] || '';
  const answered = s.items.filter((_, i) => /ans|good|wrong|part/.test(navState(s, i))).length;
  app.innerHTML = `
  <div class="sbar"><b>${esc(s.title)}</b>
   ${s.opts.timer !== 'none' ? `<span class="timer" id="timer">0:00</span>${s.opts.timer === 'down' ? '<span class="phase" id="phase"></span>' : ''}` : ''}
   <span class="mut small">${answered}/${s.items.length} answered</span>
   <span class="right row"><button data-act="pause">⏸ Pause</button><button class="pri" data-act="finish">Finish</button></span></div>
  <div class="nav">${s.items.map((_, i) => `<button class="${navState(s, i)}" data-act="goto" data-i="${i}" title="Question ${esc(findQ(s.items[i].examId, s.items[i].qid)?.q.number)}">${i + 1}</button>`).join('')}</div>
  <div class="card"><div class="qhead"><h2>Question ${q.number}</h2><span class="tag">${esc(q.topic)}</span><span class="tag">${q.marks} mark${q.marks > 1 ? 's' : ''}</span>${s.items.some(i => i.examId !== s.items[0].examId) ? `<span class="tag">${esc(ex.title)}</span>` : ''}
    <span class="right row"><button data-act="flag" class="${s.flags[k] ? 'on' : ''}">${s.flags[k] ? '⚑ Flagged' : '⚐ Flag'}</button><button data-act="bookmark">${state.bookmarks[k] ? '★ Saved' : '☆ Save'}</button></span></div>
   ${q.stem ? `<div class="stem">${rich(q.stem)}</div>` : ''}
   ${q.parts.map((p, pi) => partHtml(s, it, q, p, pi)).join('')}
   <details style="margin-top:14px" ${noteVal ? 'open' : ''}><summary class="mut small">📝 My notes</summary><textarea data-note="${esc(k)}" placeholder="Notes for this question (saved for later)…">${esc(noteVal)}</textarea></details></div>
  <div class="foot"><button data-act="prev" ${s.idx === 0 ? 'disabled' : ''}>← Previous</button>
   ${q.parts.some((p, pi) => !ans(s, it, pi).checked) && s.opts.check ? '<button class="pri" data-act="check-all">Check answer</button>' : ''}
   <button data-act="next" ${s.idx === s.items.length - 1 ? 'disabled' : ''}>Next →</button></div>
  <p class="mut small">Shortcuts: ← → navigate · F flag · Ctrl+Enter check</p>
  ${s.paused ? `<div class="overlay"><h1>Paused</h1><p class="mut">The timer is stopped.</p><button class="pri" data-act="pause">▶ Resume</button></div>` : ''}`;
  updateTimer(s); startTick();
}
function partHtml(s, it, q, p, pi) {
  const a = ans(s, it, pi), locked = a.checked;
  let body = '';
  if (p.type === 'mcq') {
    body = p.options.map((o, oi) => {
      let c = 'opt' + (a.v === oi ? ' sel' : '') + (locked ? ' lock' : '');
      if (locked) { if (oi === p.answer) c += ' right'; else if (a.v === oi) c += ' wrong'; }
      return `<div class="${c}" data-act="pick" data-pi="${pi}" data-oi="${oi}"><b>${'ABCDEFGH'[oi]}</b><span>${rich(o)}</span></div>`;
    }).join('');
  } else {
    body = `<label class="f">Final answer<input type="text" data-inp="v" data-pi="${pi}" value="${esc(a.v || '')}" ${locked ? 'disabled' : ''} placeholder="e.g. 3/4"></label>
      <label class="f" style="margin-top:6px">Working (optional)<textarea data-inp="w" data-pi="${pi}" ${locked ? 'disabled' : ''}>${esc(a.w || '')}</textarea></label>`;
  }
  let rev = '';
  if (locked) {
    const good = a.marks === p.marks, some = a.marks > 0 && !good;
    const ansTxt = p.type === 'mcq' ? `${'ABCDEFGH'[p.answer]}` : (p.answer ?? '');
    rev = `<div class="reveal ${good ? '' : p.type === 'mcq' || a.marks !== undefined ? 'bad' : 'neutral'}">
      <b>${p.type === 'mcq' ? (good ? '✅ Correct' : '❌ Incorrect') : a.auto ? '✅ Matches the expected answer' : 'Compare with the model answer'}</b>${ansTxt !== '' ? ` — answer: <b>${esc(ansTxt)}</b>` : ''}
      ${p.type !== 'mcq' ? markRow(a, p, `data-act="mark" data-pi="${pi}"`) : ''}
      ${p.solution ? `<div class="sol"><b>Worked solution</b><br>${rich(p.solution)}</div>` : ''}</div>`;
  }
  return `<div class="part">${p.label ? `<b>(${esc(p.label)})</b> ` : ''}${p.text ? `<span>${rich(p.text)}</span> ` : ''}${p.label || p.text ? `<span class="tag">${p.marks} mark${p.marks > 1 ? 's' : ''}</span>` : ''}
    ${body}${s.opts.check && !locked ? `<div style="margin-top:8px"><button data-act="check" data-pi="${pi}">Check answer</button></div>` : ''}${rev}</div>`;
}
function markRow(a, p, attrs) {
  let b = ''; for (let m = 0; m <= p.marks; m++) b += `<button ${attrs} data-m="${m}" class="${a.marks === m ? 'on' : ''}">${m}</button>`;
  return `<div class="marks" style="margin-top:8px"><span class="small mut">Mark yourself (out of ${p.marks}): </span>${b}</div>`;
}

// ---------- results ----------
function topicStats(sessions) {
  const t = {};
  sessions.forEach(s => s.items.forEach(it => { const f = findQ(it.examId, it.qid); if (!f) return;
    f.q.parts.forEach((p, pi) => { const a = s.answers[partKey(it, pi)] || {}; if (a.marks === undefined) return; const r = t[f.q.topic] || (t[f.q.topic] = { got: 0, max: 0, n: 0 }); r.got += a.marks; r.max += p.marks; r.n++; }); }));
  return t;
}
function topicRows(t) {
  return Object.entries(t).sort((a, b) => pct(a[1].got, a[1].max) - pct(b[1].got, b[1].max)).map(([n, r]) => { const p = pct(r.got, r.max);
    return `<tr><td>${esc(n)}</td><td style="width:45%"><div class="bar ${p >= 70 ? 'g' : p < 50 ? 'r' : ''}"><i style="width:${p}%"></i></div></td><td>${r.got}/${r.max} (${p}%)</td></tr>`; }).join('');
}
function resultsPage(id, mode) {
  const s = state.sessions[id]; if (!s) { app.innerHTML = '<p>Result not found.</p>'; return; }
  const sc = score(s), review = mode === 'review';
  app.innerHTML = `<p><a href="#/">← Exams</a></p><h1>${esc(s.title)}</h1>
  <div class="stats"><div class="stat"><b>${sc.got}/${sc.max}</b><span>Score (${pct(sc.got, sc.max)}%)</span></div>
   <div class="stat"><b>${fmt(s.elapsed)}</b><span>Time taken${s.opts.timer === 'down' ? ' of ' + fmt(limitMs(s)) : ''}</span></div>
   <div class="stat"><b>${fmt(s.elapsed / Math.max(1, s.items.length))}</b><span>Avg per question</span></div>
   <div class="stat"><b>${Object.values(s.flags).filter(Boolean).length}</b><span>Flagged</span></div></div>
  ${sc.pending ? `<div class="card" style="background:var(--warnbg)">⚠ ${sc.pending} written part(s) still need marking. <a href="#/results/${id}/review">Review & self-mark</a> to finish your score.</div>` : ''}
  <div class="row"><a class="btn pri" href="#/results/${id}/review">Review all answers</a><button data-act="retry" data-id="${id}">Retry incorrect</button><button data-act="del-session" data-id="${id}" class="danger">Delete attempt</button></div>
  <h2>By topic</h2><div class="card"><table>${topicRows(topicStats([s]))}</table></div>
  <h2>By question</h2><div class="card"><table><tr><th>#</th><th>Topic</th><th>Marks</th><th>Time</th><th></th></tr>${s.items.map((it, i) => { const f = findQ(it.examId, it.qid); if (!f) return ''; const got = f.q.parts.reduce((a, p, pi) => a + (s.answers[partKey(it, pi)]?.marks || 0), 0);
    return `<tr><td>${f.q.number}</td><td>${esc(f.q.topic)}</td><td><span class="tag ${got === f.q.marks ? 'ok' : got ? 'warn' : 'bad'}">${got}/${f.q.marks}</span></td><td>${fmt(s.qTime[itemKey(it)] || 0)}</td><td>${s.flags[itemKey(it)] ? '⚑' : ''}</td></tr>`; }).join('')}</table></div>
  ${review ? reviewHtml(s) : ''}`;
  if (review) setTimeout(() => $('#review')?.scrollIntoView(), 50);
}
function reviewHtml(s) {
  return `<h2 id="review">Review</h2>` + s.items.map((it, i) => { const f = findQ(it.examId, it.qid); if (!f) return ''; const { q } = f;
    return `<div class="card"><div class="qhead"><h3>Question ${q.number}</h3><span class="tag">${esc(q.topic)}</span></div>${q.stem ? `<div class="stem">${rich(q.stem)}</div>` : ''}
    ${q.parts.map((p, pi) => { const a = s.answers[partKey(it, pi)] || {}; let mine = a.v === undefined || a.v === '' ? '<i class="mut">no answer</i>' : p.type === 'mcq' ? `${'ABCDEFGH'[a.v]}. ${rich(p.options[a.v])}` : esc(a.v);
      return `<div class="part">${p.label ? `<b>(${esc(p.label)})</b> ` : ''}${rich(p.text)} <span class="tag">${p.marks}m</span>
      <div>Your answer: ${mine}${a.w ? `<div class="small mut">Working: ${rich(a.w)}</div>` : ''}</div>
      <div class="reveal neutral">Answer: <b>${p.type === 'mcq' ? 'ABCDEFGH'[p.answer] + '. ' + rich(p.options[p.answer]) : rich(p.answer ?? '—')}</b>${p.solution ? `<div class="sol">${rich(p.solution)}</div>` : ''}
      ${p.type === 'mcq' ? `<div>${a.marks === p.marks ? '✅ Correct' : '❌ Incorrect'}</div>` : markRow(a, p, `data-act="rmark" data-s="${s.id}" data-k="${partKey(it, pi)}"`)}</div></div>`; }).join('')}</div>`; }).join('');
}

// ---------- dashboard ----------
function historyTable(list) {
  return `<div class="card"><table><tr><th>When</th><th>Session</th><th>Score</th><th>Time</th><th></th></tr>${list.map(s => { const sc = score(s);
    return `<tr><td>${new Date(s.finishedAt).toLocaleDateString()}</td><td>${esc(s.title)}</td><td>${sc.got}/${sc.max} (${pct(sc.got, sc.max)}%)</td><td>${fmt(s.elapsed)}</td><td><a href="#/results/${s.id}">View</a></td></tr>`; }).join('')}</table></div>`;
}
function latestByPart() { // most recent graded attempt of every part
  const m = {};
  finished().slice().reverse().forEach(s => s.items.forEach(it => { const f = findQ(it.examId, it.qid); if (f) f.q.parts.forEach((p, pi) => { const a = s.answers[partKey(it, pi)]; if (a && a.marks !== undefined) m[partKey(it, pi)] = { it, ok: a.marks === p.marks }; }); }));
  return m;
}
function mistakeItems() { const seen = {}, out = []; Object.values(latestByPart()).forEach(x => { if (!x.ok && !seen[itemKey(x.it)]) { seen[itemKey(x.it)] = 1; out.push(x.it); } }); return out; }
function dashboard() {
  const fin = finished(), tot = fin.reduce((a, s) => { const c = score(s); a.got += c.got; a.max += c.max; a.time += s.elapsed; a.q += s.items.length; return a; }, { got: 0, max: 0, time: 0, q: 0 });
  const ts = topicStats(fin), weak = Object.entries(ts).sort((a, b) => pct(a[1].got, a[1].max) - pct(b[1].got, b[1].max))[0];
  const days = [...Array(14)].map((_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - 13 + i); return { d, n: 0 }; });
  fin.forEach(s => { const d = new Date(s.finishedAt); d.setHours(0, 0, 0, 0); const x = days.find(y => +y.d === +d); if (x) x.n += s.items.length; });
  const mx = Math.max(1, ...days.map(d => d.n)), mistakes = mistakeItems(); let streak = 0;
  for (let i = days.length - 1; i >= 0 && days[i].n; i--) streak++;
  app.innerHTML = `<h1>Your progress</h1>
  <div class="stats"><div class="stat"><b>${fin.length}</b><span>Sessions completed</span></div><div class="stat"><b>${tot.q}</b><span>Questions attempted</span></div>
   <div class="stat"><b>${pct(tot.got, tot.max)}%</b><span>Overall marks</span></div><div class="stat"><b>${fmt(tot.time)}</b><span>Total study time</span></div><div class="stat"><b>${streak}🔥</b><span>Day streak</span></div></div>
  <div class="row"><button class="pri" data-act="practise-mistakes" ${mistakes.length ? '' : 'disabled'}>Practise my ${mistakes.length} mistake${mistakes.length === 1 ? '' : 's'}</button>
   ${weak ? `<button data-act="practise-topic" data-t="${esc(weak[0])}">Drill weakest topic: ${esc(weak[0])} (${pct(weak[1].got, weak[1].max)}%)</button>` : ''}</div>
  <h2>Last 14 days</h2><div class="card"><div class="bars">${days.map(d => `<i title="${d.d.toLocaleDateString()}: ${d.n} questions" style="height:${Math.max(3, 100 * d.n / mx)}%"></i>`).join('')}</div></div>
  <h2>Topic performance</h2><div class="card">${Object.keys(ts).length ? `<table>${topicRows(ts)}</table>` : '<p class="mut">Finish a session to see topic stats.</p>'}</div>
  <h2>History</h2>${fin.length ? historyTable(fin) : '<p class="mut">Nothing yet.</p>'}`;
}

// ---------- topic practice & bookmarks ----------
let tpSubject = '';
function topicsPage() {
  const ex = allExams(), subjects = [...new Set(ex.map(e => e.subject))]; if (!subjects.includes(tpSubject)) tpSubject = subjects[0] || '';
  const qs = ex.filter(e => e.subject === tpSubject).flatMap(e => e.questions), topics = {};
  qs.forEach(q => topics[q.topic] = (topics[q.topic] || 0) + 1);
  app.innerHTML = `<h1>Topic practice</h1><p class="mut">Build a custom set from every paper for a subject.</p><div class="card">
   <label class="f">Subject<select id="tp-sub">${subjects.map(s => `<option ${s === tpSubject ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></label>
   <h3 style="margin-top:12px">Topics</h3><div class="row">${Object.entries(topics).map(([t, n]) => `<label><input type="checkbox" class="tp-topic" value="${esc(t)}" checked> ${esc(t)} (${n})</label>`).join('')}</div>
   <div class="row" style="margin-top:12px;align-items:flex-end"><label class="f">Max questions<input type="number" id="tp-n" value="10" min="1"></label>
    <label class="f">Timer<select id="c-timer"><option value="up">Stopwatch</option><option value="none">None</option></select></label>
    <label class="f">Only<select id="tp-only"><option value="all">All</option><option value="new">Not yet attempted</option><option value="wrong">Previous mistakes</option></select></label></div>
   <p><button class="pri" data-act="start-topic">▶ Start</button></p></div>`;
}
function startTopic() {
  const topics = [...document.querySelectorAll('.tp-topic:checked')].map(x => x.value), only = $('#tp-only').value, n = Number($('#tp-n').value) || 10;
  const done = new Set(Object.keys(latestByPart()).map(k => k.split('|').slice(0, 2).join('|'))), bad = new Set(mistakeItems().map(itemKey));
  let qs = allExams().filter(e => e.subject === tpSubject).flatMap(e => e.questions).filter(q => topics.includes(q.topic) && (only === 'all' || (only === 'new' ? !done.has(q.key) : bad.has(q.key))));
  if (!qs.length) return toast('No questions match those filters');
  qs = shuffle(qs).slice(0, n);
  begin('Topic practice: ' + tpSubject, qs.map(q => ({ examId: q.examId, qid: q.id })), { timer: $('#c-timer').value, reading: 0, minutes: 60, check: true });
}
function bookmarksPage() {
  const items = Object.keys(state.bookmarks).filter(k => state.bookmarks[k]).map(k => { const [e, q] = k.split('|'); return findQ(e, q); }).filter(Boolean);
  app.innerHTML = `<h1>Bookmarks</h1>${items.length ? `<p><button class="pri" data-act="practise-bookmarks">Practise all ${items.length}</button></p>` : '<p class="mut">Use ☆ Save during a session to bookmark questions for later.</p>'}
  ${items.map(({ ex, q }) => `<div class="card"><div class="qhead"><h3>${esc(ex.title)} — Q${q.number}</h3><span class="tag">${esc(q.topic)}</span><span class="tag">${q.marks}m</span><button class="right" data-act="unbookmark" data-k="${esc(q.key)}">Remove</button></div>${q.stem ? rich(q.stem) : rich(q.parts[0].text)}${state.notes[q.key] ? `<p class="mut small">📝 ${rich(state.notes[q.key])}</p>` : ''}</div>`).join('')}`;
}

// ---------- manage ----------
function managePage() {
  app.innerHTML = `<h1>Manage</h1>
  <div class="card"><h3>Import an exam</h3><p class="mut small">Paste exam JSON (or choose a .json file). See <code>README.md</code> and <code>exams/template.json</code> for the format. Tip: paste a past paper into any AI assistant and ask it to convert it to that format.</p>
   <textarea id="imp" style="min-height:160px;font-family:ui-monospace,monospace" placeholder='{ "id": "...", "title": "...", "questions": [ ... ] }'></textarea>
   <div class="row" style="margin-top:8px"><input type="file" id="impf" accept=".json,application/json"><button class="pri" data-act="import">Import</button><a class="btn" href="exams/template.json" download>Download template</a></div></div>
  <div class="card"><h3>Your imported exams</h3>${state.customExams.length ? state.customExams.map(e => `<div class="row" style="padding:4px 0"><span>${esc(e.title)} <span class="mut small">(${esc(e.year)})</span></span><span class="right row"><button data-act="export-exam" data-id="${esc(e.id)}">Export</button><button class="danger" data-act="del-exam" data-id="${esc(e.id)}">Delete</button></span></div>`).join('') : '<p class="mut">None yet.</p>'}</div>
  <div class="card"><h3>Backup &amp; restore</h3><p class="mut small">All progress lives in this browser. Export a backup to move it or keep it safe.</p>
   <div class="row"><button data-act="backup">Download backup</button><input type="file" id="restf" accept=".json"><button data-act="restore">Restore</button><button class="danger" data-act="wipe">Erase all data</button></div></div>`;
}
function importExam(text) {
  let e; try { e = JSON.parse(text); } catch (err) { return toast('Invalid JSON: ' + err.message); }
  const list = Array.isArray(e) ? e : [e];
  for (const x of list) {
    if (!x || !x.title || !Array.isArray(x.questions) || !x.questions.length) return toast('Each exam needs a title and a non-empty questions array');
    x.id = String(x.id || x.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || uid());
    if ((window.EXAMS || []).some(b => b.id === x.id)) x.id += '-custom';
    state.customExams = state.customExams.filter(c => c.id !== x.id).concat(x);
  }
  save(); toast(`Imported ${list.length} exam${list.length > 1 ? 's' : ''}`); managePage();
}
const download = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
const readFile = (input, cb) => { const f = input.files[0]; if (!f) return toast('Choose a file first'); const r = new FileReader(); r.onload = () => cb(r.result); r.readAsText(f); };

// ---------- actions ----------
const cur = () => { const s = active(); if (!s) return {}; const it = s.items[s.idx]; return { s, it, ...(findQ(it.examId, it.qid) || {}) }; };
const go = i => { const s = active(); if (s && i >= 0 && i < s.items.length) { s.idx = i; save(); sessionPage(); typeset(app); } };
function doCheck(pi) {
  const { s, it, q } = cur(), p = q.parts[pi], a = ans(s, it, pi);
  if (p.type === 'mcq' && a.v === undefined && !confirm('No option selected. Reveal the answer anyway?')) return;
  a.checked = true; if (p.type === 'mcq') a.marks = a.v === p.answer ? p.marks : 0; else if (a.v && matches(p, a.v)) { a.marks = p.marks; a.auto = true; }
  save(); sessionPage(); typeset(app);
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act],[data-preset]'); if (!t) return;
  if (t.dataset.preset) { const ex = examById(location.hash.split('/')[2] && decodeURIComponent(location.hash.split('/')[2])); return applyPreset(ex, t.dataset.preset); }
  const d = t.dataset, act = d.act, pi = Number(d.pi);
  const A = {
    theme: () => { const dark = getComputedStyle(document.body).backgroundColor === 'rgb(15, 18, 32)'; state.theme = dark ? 'light' : 'dark'; applyTheme(); save(); },
    'start-exam': () => startExam(d.id),
    'start-one': () => begin(examById(d.id).title + ' — Q' + findQ(d.id, d.q).q.number, [{ examId: d.id, qid: d.q }], readConfig()),
    'start-topic': startTopic,
    abandon: () => { if (confirm('Discard the session in progress?')) { delete state.sessions[state.active]; state.active = null; save(); route(); } },
    goto: () => go(Number(d.i)), prev: () => go(cur().s.idx - 1), next: () => go(cur().s.idx + 1),
    pause: () => { const s = active(); s.paused = !s.paused; save(); sessionPage(); },
    flag: () => { const { s, it } = cur(), k = itemKey(it); s.flags[k] = !s.flags[k]; save(); sessionPage(); typeset(app); },
    bookmark: () => { const { it } = cur(), k = itemKey(it); state.bookmarks[k] = !state.bookmarks[k]; save(); sessionPage(); typeset(app); toast(state.bookmarks[k] ? 'Saved to bookmarks' : 'Removed'); },
    pick: () => { const { s, it, q } = cur(), a = ans(s, it, pi); if (a.checked) return; a.v = Number(d.oi); save(); sessionPage(); typeset(app); },
    check: () => doCheck(pi),
    'check-all': () => { const { s, it, q } = cur(); q.parts.forEach((p, i) => { if (!ans(s, it, i).checked) { const a = ans(s, it, i); a.checked = true; gradePart(s, it, i, p); } }); save(); sessionPage(); typeset(app); },
    mark: () => { const { s, it } = cur(); ans(s, it, pi).marks = Number(d.m); ans(s, it, pi).auto = false; save(); sessionPage(); typeset(app); },
    rmark: () => { const s = state.sessions[d.s]; (s.answers[d.k] || (s.answers[d.k] = {})).marks = Number(d.m); save(); const y = scrollY; resultsPage(s.id, 'review'); typeset(app); scrollTo(0, y); },
    finish: () => { const s = active(), un = s.items.filter((_, i) => !/ans|good|wrong|part/.test(navState(s, i))).length; if (confirm(un ? `${un} question(s) unanswered. Finish and see results?` : 'Finish and see results?')) finishSession(s); },
    retry: () => { const s = state.sessions[d.id], items = s.items.filter(it => { const f = findQ(it.examId, it.qid); return f && f.q.parts.some((p, i) => (s.answers[partKey(it, i)] || {}).marks !== p.marks); }); if (!items.length) return toast('Nothing to retry — full marks!'); begin('Retry: ' + s.title, items, { ...s.opts, check: true, timer: s.opts.timer === 'none' ? 'none' : 'up' }); },
    'del-session': () => { if (confirm('Delete this attempt?')) { delete state.sessions[d.id]; save(); location.hash = '#/dashboard'; } },
    'practise-mistakes': () => begin('Practise mistakes', shuffle(mistakeItems()), { timer: 'up', reading: 0, minutes: 60, check: true }),
    'practise-topic': () => { const items = allExams().flatMap(e => e.questions).filter(q => q.topic === d.t).map(q => ({ examId: q.examId, qid: q.id })); begin('Drill: ' + d.t, shuffle(items), { timer: 'up', reading: 0, minutes: 60, check: true }); },
    'practise-bookmarks': () => begin('Bookmarked questions', Object.keys(state.bookmarks).filter(k => state.bookmarks[k]).map(k => { const [examId, qid] = k.split('|'); return { examId, qid }; }).filter(it => findQ(it.examId, it.qid)), { timer: 'up', reading: 0, minutes: 60, check: true }),
    unbookmark: () => { delete state.bookmarks[d.k]; save(); bookmarksPage(); typeset(app); },
    import: () => { const f = $('#impf'); if (f.files[0]) readFile(f, importExam); else importExam($('#imp').value); },
    'export-exam': () => download(d.id + '.json', JSON.stringify(state.customExams.find(x => x.id === d.id), null, 2)),
    'del-exam': () => { if (confirm('Delete this imported exam? Past attempts stay in your history but will lose their questions.')) { state.customExams = state.customExams.filter(x => x.id !== d.id); save(); managePage(); } },
    backup: () => download('exam-practice-backup.json', JSON.stringify(state)),
    restore: () => readFile($('#restf'), txt => { try { state = Object.assign(blank(), JSON.parse(txt)); save(); applyTheme(); toast('Restored'); route(); } catch (err) { toast('Invalid backup file'); } }),
    wipe: () => { if (confirm('Erase ALL progress and imported exams?') && confirm('Really erase everything? This cannot be undone.')) { state = blank(); save(); applyTheme(); route(); } }
  };
  if (A[act]) A[act]();
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.inp) { const { s, it } = cur(); ans(s, it, Number(t.dataset.pi))[t.dataset.inp] = t.value; save(); }
  else if (t.dataset.note) { state.notes[t.dataset.note] = t.value; save(); }
  else if (t.dataset.lib) { libF[t.dataset.lib] = t.value; const p = t.selectionStart; library(); const n = $(`[data-lib="${t.dataset.lib}"]`); if (n && t.type === 'search') { n.focus(); n.setSelectionRange(p, p); } }
});
document.addEventListener('change', e => { if (e.target.id === 'tp-sub') { tpSubject = e.target.value; topicsPage(); } });
document.addEventListener('keydown', e => {
  if (!location.hash.startsWith('#/session') || !active()) return;
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { const { s, it, q } = cur(); const pi = q.parts.findIndex((p, i) => !ans(s, it, i).checked); if (pi >= 0 && s.opts.check) { e.preventDefault(); doCheck(pi); } return; }
  if (typing) return;
  if (e.key === 'ArrowRight') go(active().idx + 1); else if (e.key === 'ArrowLeft') go(active().idx - 1);
  else if (e.key.toLowerCase() === 'f') $('[data-act=flag]')?.click();
});
document.addEventListener('visibilitychange', () => { last = Date.now(); save(); });
window.addEventListener('beforeunload', save);

route();
})();
