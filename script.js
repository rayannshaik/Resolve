const NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const INTERVALS = [
  {semitones:1, name:"Minor 2nd"},
  {semitones:2, name:"Major 2nd"},
  {semitones:3, name:"Minor 3rd"},
  {semitones:4, name:"Major 3rd"},
  {semitones:5, name:"Perfect 4th"},
  {semitones:6, name:"Tritone"},
  {semitones:7, name:"Perfect 5th"},
  {semitones:8, name:"Minor 6th"},
  {semitones:9, name:"Major 6th"},
  {semitones:10, name:"Minor 7th"},
  {semitones:11, name:"Major 7th"},
  {semitones:12, name:"Octave"}
];
const COMMON_SEMITONES = [3,4,5,7,10,11,12];
const PIANO_LOW = 60;  // C4
const PIANO_HIGH = 84; // C6
const WHITE_STEPS = [0,2,4,5,7,9,11];
const BLACK_STEPS = [1,3,6,8,10];

const APPLY_PROMPTS = [
  {id:"p1", text:"Play a Major 3rd above any note in your piano roll — without looking at the scale highlighting."},
  {id:"p2", text:"Find a Perfect 5th by ear on your MIDI keyboard, then check yourself against the piano roll."},
  {id:"p3", text:"Take a melody you've already written. Go note-to-note and name the interval between each pair."},
  {id:"p4", text:"Build a triad using only 3rds stacked on top of each other — you already know this shape. Now name each interval inside it out loud."},
  {id:"p5", text:"Pick two random notes on your keyboard before checking anything. Guess the interval, then verify."}
];

let audioCtx = null;
function getAudioCtx(){
  if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}
function midiToFreq(m){ return 440 * Math.pow(2, (m-69)/12); }
function noteName(m){ return NOTE_NAMES[((m%12)+12)%12] + (Math.floor(m/12)-1); }

function playTone(ctx, freq, duration){
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = freq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime+0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime+duration+0.05);
}
function playSequence(midis, noteDur, gap){
  const ctx = getAudioCtx();
  midis.forEach((m,i)=>{
    setTimeout(()=>playTone(ctx, midiToFreq(m), noteDur), i*(noteDur+gap)*1000);
  });
}

// ---------- Progress storage ----------
let progress = { intervalStats:{}, totalCorrect:0, totalAttempts:0, appliedPrompts:{}, functionStats:{}, chordStats:{}, appliedChordPrompts:{} };

async function loadProgress(){
  try{
    if(window.storage){
      const result = await window.storage.get("resolve-progress", false);
      if(result && result.value) progress = JSON.parse(result.value);
    } else {
      const raw = localStorage.getItem("resolve-progress");
      if(raw) progress = JSON.parse(raw);
    }
  }catch(e){ /* fresh start */ }
  progress.functionStats = progress.functionStats || {};
  progress.chordStats = progress.chordStats || {};
  progress.appliedChordPrompts = progress.appliedChordPrompts || {};
}
function saveProgress(){
  try{
    if(window.storage) window.storage.set("resolve-progress", JSON.stringify(progress), false);
    else localStorage.setItem("resolve-progress", JSON.stringify(progress));
  }catch(e){ console.error("save failed", e); }
}

// ---------- Tabs ----------
const MODULES = [
  {id:"intervals", label:"Intervals", soon:false},
  {id:"chords", label:"Chord Functions", soon:false},
  {id:"progressions", label:"Progressions", soon:true, blurb:"Recognizing common progressions by ear, not just by chart."},
  {id:"modes", label:"Modes & Color", soon:true, blurb:"Beyond major/minor — the moods hiding in modal harmony."}
];
let activeModule = "intervals";

function renderTabs(){
  const tabs = document.getElementById("tabs");
  tabs.innerHTML = "";
  MODULES.forEach(m=>{
    const btn = document.createElement("button");
    btn.className = "tab" + (m.id===activeModule ? " active" : "") + (m.soon ? " soon" : "");
    btn.textContent = m.label + (m.soon ? " · soon" : "");
    btn.onclick = ()=>{ activeModule = m.id; renderModule(); renderTabs(); };
    tabs.appendChild(btn);
  });
}

function renderModule(){
  const container = document.getElementById("module-content");
  const mod = MODULES.find(m=>m.id===activeModule);
  container.innerHTML = "";
  if(activeModule === "intervals"){
    container.appendChild(buildConceptCard());
    container.appendChild(buildReferenceCard());
    container.appendChild(buildExploreCard());
    container.appendChild(buildQuizCard());
    container.appendChild(buildApplyCard());
    return;
  }
  if(activeModule === "chords"){
    container.appendChild(buildChordConceptCard());
    container.appendChild(buildChordReferenceCard());
    container.appendChild(buildChordDemoCard());
    container.appendChild(buildChordQuizCard());
    container.appendChild(buildChordApplyCard());
    return;
  }
  if(mod.soon){
    container.innerHTML = '<section class="card soon-card"><h2>'+mod.label+'</h2><p>'+mod.blurb+'</p><p>Coming after Chord Functions.</p></section>';
  }
}

// ---------- Concept card ----------
const MNEMONICS = {
  1:  "Opening two notes of the \"Jaws\" theme.",
  2:  "The first two notes of \"Frère Jacques.\"",
  3:  "The opening riff of \"Smoke on the Water.\"",
  4:  "The \"Kum-ba-ya\" leap at the start of Kumbaya.",
  5:  "The \"Here comes the...\" leap in the wedding march.",
  6:  "The very first two notes of The Simpsons theme.",
  7:  "The opening leap of the Star Wars main theme.",
  8:  "Flip a Major 3rd upside down — that's this.",
  9:  "Flip a minor 3rd upside down — that's this.",
  10: "The note that turns a triad into a dominant 7th chord.",
  11: "The note that turns a triad into a Major 7th chord.",
  12: "The \"Some-where\" leap that opens Over the Rainbow."
};

function buildReferenceCard(){
  const el = document.createElement("section");
  el.className = "card";
  el.innerHTML =
    '<h2>Reference chart</h2>' +
    '<p>Every interval below starts from C. Click any diagram to hear it. The single most useful formula to memorize: <strong style="color:var(--text)">an interval plus its inversion always adds up to 12</strong> — so if you know a Perfect 5th is 7 semitones, you already know a Perfect 4th is 12−7=5, without memorizing it separately.</p>' +
    '<div class="ref-grid" id="ref-grid"></div>';
  setTimeout(renderReferenceGrid, 0);
  return el;
}

function renderReferenceGrid(){
  const grid = document.getElementById("ref-grid");
  if(!grid) return;
  grid.innerHTML = "";
  INTERVALS.forEach(def=>{
    const card = document.createElement("div");
    card.className = "ref-card";
    const invertName = INTERVALS.find(iv=>iv.semitones === (12-def.semitones))?.name;
    card.innerHTML =
      '<div class="ref-name">'+def.name+'</div>' +
      '<div class="ref-formula">'+def.semitones+' semitone'+(def.semitones===1?"":"s")+
        (invertName ? '  ·  inverts to '+invertName : '') +
      '</div>' +
      '<div class="ref-piano-group">' +
        '<div class="piano ref-piano" data-semitones="'+def.semitones+'"></div>' +
        '<div class="roll-panel ref-roll-panel"><div class="roll-keys"></div><div class="roll"></div></div>' +
      '</div>' +
      '<div class="ref-mnemonic">'+MNEMONICS[def.semitones]+'</div>';
    grid.appendChild(card);

    const pianoEl = card.querySelector(".ref-piano");
    const rollPanelEl = card.querySelector(".ref-roll-panel");
    const root = 60, target = 60 + def.semitones;
    const playThis = ()=> playSequence([root, target], 0.42, 0.12);
    renderPiano(pianoEl, ()=>playThis(), 60, 72);
    highlightKey(pianoEl, root, "hi-root");
    highlightKey(pianoEl, target, "hi-target");
    pianoEl.style.cursor = "pointer";
    pianoEl.title = "Click to hear it";

    renderPianoRoll(rollPanelEl, 60, 72, [
      {midi:root, start:0, duration:3, cls:"hi-root"},
      {midi:target, start:4, duration:3, cls:"hi-target"}
    ]);
    rollPanelEl.onclick = playThis;
    rollPanelEl.title = "Click to hear it";
  });
}

function buildConceptCard(){
  const el = document.createElement("section");
  el.className = "card";
  el.innerHTML =
    '<h2>What an interval actually is</h2>' +
    '<p>An interval is just the distance between two notes. Every scale, chord, and melody you\'ve ever heard is built from intervals stacked in specific patterns.</p>' +
    '<p>A major triad isn\'t a mysterious shape you memorize — it\'s a Major 3rd with a minor 3rd stacked on top. A 9th chord is just more intervals piled on the same foundation. Once your ear can name intervals on the fly, chord shapes stop being things you recognize by sight and start being distances you actually hear — which is the real jump from knowing what a 9th chord looks like to understanding why it works.</p>';
  return el;
}

// ---------- Explore card (interactive piano) ----------
let exploreSelection = [];
function buildExploreCard(){
  const el = document.createElement("section");
  el.className = "card";
  el.innerHTML = '<h2>Explore</h2><p>Click any two keys to hear them and see the interval between them named live.</p>' +
    '<div class="piano-wrap"><div class="piano" id="explore-piano"></div></div>' +
    '<div class="explore-readout" id="explore-readout">Click a first note to begin.</div>';
  setTimeout(()=>renderPiano(document.getElementById("explore-piano"), onExploreKeyClick), 0);
  return el;
}
function onExploreKeyClick(midi){
  playSequence([midi], 0.5, 0);
  exploreSelection.push(midi);
  if(exploreSelection.length > 2) exploreSelection = [midi];
  const readout = document.getElementById("explore-readout");
  const piano = document.getElementById("explore-piano");
  clearHighlights(piano);
  if(exploreSelection.length === 1){
    highlightKey(piano, exploreSelection[0], "hi-root");
    readout.innerHTML = "First note: <strong>"+noteName(exploreSelection[0])+"</strong>. Click a second note.";
  } else {
    const [a,b] = exploreSelection;
    const dist = Math.abs(b-a);
    const reducedDist = dist>12 ? (dist%12 || 12) : dist;
    const def = INTERVALS.find(iv=>iv.semitones === reducedDist);
    highlightKey(piano, a, "hi-root");
    highlightKey(piano, b, "hi-target");
    readout.innerHTML = noteName(a)+" → "+noteName(b)+" is a <strong>"+(def?def.name:dist+" semitones")+"</strong> ("+dist+" semitones)";
  }
}

// ---------- Piano rendering ----------
function renderPiano(container, onClick, low, high){
  low = (low===undefined) ? PIANO_LOW : low;
  high = (high===undefined) ? PIANO_HIGH : high;
  container.innerHTML = "";
  const whiteMidis = [];
  for(let m=low; m<=high; m++){
    if(WHITE_STEPS.includes(m%12)) whiteMidis.push(m);
  }
  const whiteWidth = 100/whiteMidis.length;
  whiteMidis.forEach((m,i)=>{
    const key = document.createElement("div");
    key.className = "white-key";
    key.style.left = (i*whiteWidth)+"%";
    key.style.width = whiteWidth+"%";
    key.dataset.midi = m;
    key.textContent = (m%12===0) ? noteName(m) : "";
    key.onclick = ()=> onClick(m);
    container.appendChild(key);
  });
  for(let m=low; m<=high; m++){
    if(BLACK_STEPS.includes(m%12)){
      const whiteIndexBefore = whiteMidis.filter(w=>w<m).length - 1;
      const key = document.createElement("div");
      key.className = "black-key";
      key.style.left = ((whiteIndexBefore+1)*whiteWidth - whiteWidth*0.3)+"%";
      key.style.width = (whiteWidth*0.6)+"%";
      key.dataset.midi = m;
      key.onclick = (e)=>{ e.stopPropagation(); onClick(m); };
      container.appendChild(key);
    }
  }
}
function clearHighlights(container){
  container.querySelectorAll(".hi-root,.hi-target").forEach(k=>k.classList.remove("hi-root","hi-target"));
}
function highlightKey(container, midi, cls){
  const key = container.querySelector('[data-midi="'+midi+'"]');
  if(key) key.classList.add(cls);
}

// ---------- Piano roll rendering (FL-Studio-style: vertical keybed + note grid) ----------
// panelEl must contain a ".roll-keys" element and a ".roll" element (see ref-piano-group markup).
// notes: [{midi, start, duration, cls}] — start/duration in whole grid columns (0..ROLL_COLS),
// so bar edges always land exactly on the background gridlines (see .roll's background-size in CSS).
const ROLL_COLS = 8;
function renderPianoRoll(panelEl, low, high, notes){
  const keysEl = panelEl.querySelector(".roll-keys");
  const gridEl = panelEl.querySelector(".roll");
  keysEl.innerHTML = "";
  gridEl.innerHTML = "";
  const totalRows = high - low + 1;
  const rowHeight = 100/totalRows;
  for(let m=low; m<=high; m++){
    const row = high - m;
    const isBlack = BLACK_STEPS.includes(((m%12)+12)%12);

    const keyEl = document.createElement("div");
    keyEl.className = "roll-key " + (isBlack ? "roll-key-black" : "roll-key-white");
    keyEl.style.top = (row*rowHeight)+"%";
    keyEl.style.height = rowHeight+"%";
    if(!isBlack && m%12===0){
      const label = document.createElement("span");
      label.className = "roll-key-label";
      label.textContent = noteName(m);
      if(row === 0) label.style.top = "0";
      else label.style.bottom = "0";
      keyEl.appendChild(label);
    }
    keysEl.appendChild(keyEl);

    const rowEl = document.createElement("div");
    rowEl.className = "roll-row" + (isBlack ? " roll-row-black" : "");
    rowEl.style.top = (row*rowHeight)+"%";
    rowEl.style.height = rowHeight+"%";
    gridEl.appendChild(rowEl);
  }
  notes.forEach(n=>{
    const row = high - n.midi;
    const bar = document.createElement("div");
    bar.className = "roll-note " + n.cls;
    bar.style.top = (row*rowHeight + rowHeight*0.16)+"%";
    bar.style.height = (rowHeight*0.68)+"%";
    bar.style.left = (n.start/ROLL_COLS*100)+"%";
    bar.style.width = (n.duration/ROLL_COLS*100)+"%";
    gridEl.appendChild(bar);
  });
}

// ---------- Quiz ----------
let currentQuestion = null;
let includeAll = false;
let sessionCorrect = 0, sessionTotal = 0;

function buildQuizCard(){
  const el = document.createElement("section");
  el.className = "card";
  el.innerHTML =
    '<h2>Ear training: name that interval</h2>' +
    '<div class="quiz-controls">' +
      '<button class="play-btn" id="new-question-btn">Play a new interval</button>' +
      '<button class="replay-btn" id="replay-btn" style="display:none;">Replay</button>' +
      '<label><input type="checkbox" id="include-all"> Include all 12 (not just triad/7th-chord intervals)</label>' +
    '</div>' +
    '<div class="feedback" id="quiz-feedback"></div>' +
    '<div class="answer-grid" id="answer-grid"></div>' +
    '<div class="stats-row" id="quiz-stats"></div>' +
    '<div class="weak-list" id="weak-list"></div>';

  setTimeout(()=>{
    document.getElementById("include-all").checked = includeAll;
    document.getElementById("include-all").addEventListener("change", e=>{ includeAll = e.target.checked; });
    document.getElementById("new-question-btn").addEventListener("click", newQuestion);
    document.getElementById("replay-btn").addEventListener("click", ()=>{
      if(currentQuestion) playSequence([currentQuestion.root, currentQuestion.root+currentQuestion.semitones], 0.5, 0.15);
    });
    renderQuizStats();
  }, 0);
  return el;
}

function newQuestion(){
  const pool = (includeAll ? INTERVALS : INTERVALS.filter(iv=>COMMON_SEMITONES.includes(iv.semitones)));
  const def = pool[Math.floor(Math.random()*pool.length)];
  const root = PIANO_LOW + Math.floor(Math.random()*(PIANO_HIGH-PIANO_LOW-12+1));
  currentQuestion = { root, semitones: def.semitones, name: def.name };
  playSequence([root, root+def.semitones], 0.5, 0.15);

  document.getElementById("replay-btn").style.display = "inline-block";
  document.getElementById("quiz-feedback").textContent = "";
  document.getElementById("quiz-feedback").className = "feedback";

  const grid = document.getElementById("answer-grid");
  grid.innerHTML = "";
  pool.forEach(opt=>{
    const btn = document.createElement("button");
    btn.className = "answer-btn";
    btn.textContent = opt.name;
    btn.onclick = ()=> checkAnswer(opt, btn);
    grid.appendChild(btn);
  });
}

function checkAnswer(chosen, btnEl){
  if(!currentQuestion) return;
  const correct = chosen.semitones === currentQuestion.semitones;
  const grid = document.getElementById("answer-grid");
  grid.querySelectorAll(".answer-btn").forEach(b=>b.disabled = true);

  const key = String(currentQuestion.semitones);
  if(!progress.intervalStats[key]) progress.intervalStats[key] = {correct:0, wrong:0};
  if(correct){
    progress.intervalStats[key].correct++;
    progress.totalCorrect++;
    sessionCorrect++;
    btnEl.classList.add("correct");
    document.getElementById("quiz-feedback").textContent = "Correct — that was a " + currentQuestion.name + ".";
    document.getElementById("quiz-feedback").className = "feedback correct";
  } else {
    progress.intervalStats[key].wrong++;
    btnEl.classList.add("wrong");
    grid.querySelectorAll(".answer-btn").forEach(b=>{
      if(b.textContent === currentQuestion.name) b.classList.add("correct");
    });
    document.getElementById("quiz-feedback").textContent = "Not quite — that was a " + currentQuestion.name + ".";
    document.getElementById("quiz-feedback").className = "feedback wrong";
  }
  progress.totalAttempts++;
  sessionTotal++;
  saveProgress();
  renderQuizStats();
}

function renderQuizStats(){
  const statsEl = document.getElementById("quiz-stats");
  const weakEl = document.getElementById("weak-list");
  if(!statsEl) return;
  const pct = progress.totalAttempts ? Math.round(progress.totalCorrect/progress.totalAttempts*100) : 0;
  statsEl.innerHTML =
    '<span>This session: <strong>'+sessionCorrect+'/'+sessionTotal+'</strong></span>' +
    '<span>All-time accuracy: <strong>'+pct+'%</strong> ('+progress.totalAttempts+' attempts)</span>';

  const weak = Object.keys(progress.intervalStats)
    .map(k=>{
      const s = progress.intervalStats[k];
      const attempts = s.correct+s.wrong;
      const def = INTERVALS.find(iv=>iv.semitones===Number(k));
      return {name: def?def.name:k, acc: attempts ? s.correct/attempts : 0, attempts};
    })
    .filter(x=>x.attempts >= 2)
    .sort((a,b)=>a.acc-b.acc)
    .slice(0,3);
  weakEl.innerHTML = weak.length
    ? "Focus on: " + weak.map(w=>'<span>'+w.name+'</span>').join(", ")
    : "";
}

// ---------- Apply prompts ----------
function buildApplyCard(){
  const el = document.createElement("section");
  el.className = "card";
  el.innerHTML = '<h2>This week in FL Studio</h2><p>Pick one, do it before you touch the scale highlighting, then check yourself.</p><div id="prompt-list"></div>';
  setTimeout(renderPrompts, 0);
  return el;
}
function renderPrompts(){
  const list = document.getElementById("prompt-list");
  if(!list) return;
  list.innerHTML = "";
  APPLY_PROMPTS.forEach(p=>{
    const done = !!progress.appliedPrompts[p.id];
    const row = document.createElement("div");
    row.className = "prompt-item" + (done ? " done" : "");
    row.innerHTML = '<input type="checkbox" '+(done?"checked":"")+'><span>'+p.text+'</span>';
    row.querySelector("input").addEventListener("change", e=>{
      if(e.target.checked) progress.appliedPrompts[p.id] = Date.now();
      else delete progress.appliedPrompts[p.id];
      saveProgress();
      renderPrompts();
    });
    list.appendChild(row);
  });
}

// ================= Chord Functions module =================
const MAJOR_SCALE_STEPS = [0,2,4,5,7,9,11];
const DEGREES = [
  {roman:"I",    quality:"Major",       function:"tonic"},
  {roman:"ii",   quality:"minor",       function:"subdominant"},
  {roman:"iii",  quality:"minor",       function:"tonic"},
  {roman:"IV",   quality:"Major",       function:"subdominant"},
  {roman:"V",    quality:"Major",       function:"dominant"},
  {roman:"vi",   quality:"minor",       function:"tonic"},
  {roman:"vii°", quality:"diminished",  function:"dominant"}
];
const FUNCTION_LABEL = {
  tonic: "Tonic — home, at rest",
  subdominant: "Subdominant — moving away",
  dominant: "Dominant — tension, wants to resolve"
};
const FUNCTION_SHORT = { tonic:"Tonic", subdominant:"Subdominant", dominant:"Dominant" };

let chordRoot = 60; // default key: C

function pitchClassName(midi){ return NOTE_NAMES[((midi%12)+12)%12]; }

function buildTriadOffsets(i){
  let n1 = MAJOR_SCALE_STEPS[i % 7];
  let n2 = MAJOR_SCALE_STEPS[(i+2) % 7];
  if(n2 <= n1) n2 += 12;
  let n3 = MAJOR_SCALE_STEPS[(i+4) % 7];
  while(n3 <= n2) n3 += 12;
  return [n1, n2, n3];
}
function triadNotes(root, degreeIndex){
  return buildTriadOffsets(degreeIndex).map(o => root + o);
}
function chordName(chordRootNote, degreeIndex){
  return pitchClassName(chordRootNote) + " " + DEGREES[degreeIndex].quality;
}

function playChord(ctx, midis, duration){
  midis.forEach(m => playTone(ctx, midiToFreq(m), duration));
}
function playProgression(chordsOfMidis, chordDur, gap){
  const ctx = getAudioCtx();
  chordsOfMidis.forEach((midis, i)=>{
    setTimeout(()=> playChord(ctx, midis, chordDur), i*(chordDur+gap)*1000);
  });
}
function highlightKeys(container, midis, cls){
  midis.forEach(m => highlightKey(container, m, cls));
}

const CHORD_APPLY_PROMPTS = [
  {id:"c1", text:"Build a ii–V–I progression in any key without checking the reference chart."},
  {id:"c2", text:"Take a progression you've already made — label each chord's Roman numeral and function."},
  {id:"c3", text:"End a progression on IV instead of V, and notice how different the ending feels."},
  {id:"c4", text:"Swap a V for a vii° in a progression — same function, different color. Notice what changes."},
  {id:"c5", text:"Write two 4-bar loops: one that resolves to I at the end, one that deliberately avoids it. Compare how each feels."}
];

// ---- Concept ----
function buildChordConceptCard(){
  const el = document.createElement("section");
  el.className = "card";
  el.innerHTML =
    '<h2>Why some chords want to move</h2>' +
    '<p>You already know how to stack thirds to build I, ii, iii, IV, V, vi, and vii° — they\'re just triads built on each note of the major scale. What\'s new here is this: each of those seven chords belongs to one of three functional families, and knowing which family a chord belongs to tells you where it wants to go next.</p>' +
    '<p><strong style="color:var(--resolution)">Tonic</strong> feels like home — resolved, at rest. <strong style="color:var(--movement)">Subdominant</strong> feels like leaving home — gathering motion. <strong style="color:var(--tension)">Dominant</strong> feels unstable — straining to get back home.</p>' +
    '<p>Home → leave → build tension → come back. That four-step engine is behind almost every chord progression you\'ve ever heard. Scale highlighting can tell you a note is "in the key." It can\'t tell you that V wants to resolve to I. That\'s function.</p>';
  return el;
}

// ---- Reference ----
function buildChordReferenceCard(){
  const el = document.createElement("section");
  el.className = "card";
  el.innerHTML =
    '<h2>The seven diatonic chords</h2>' +
    '<div class="key-row">Key: <select class="key-select" id="key-select"></select></div>' +
    '<div class="fn-legend">' +
      '<span><i class="dot" style="background:var(--resolution)"></i>Tonic (home)</span>' +
      '<span><i class="dot" style="background:var(--movement)"></i>Subdominant (leaving)</span>' +
      '<span><i class="dot" style="background:var(--tension)"></i>Dominant (tension)</span>' +
    '</div>' +
    '<div class="ref-grid" id="chord-ref-grid"></div>';
  setTimeout(()=>{
    const sel = document.getElementById("key-select");
    for(let pc=0; pc<12; pc++){
      const opt = document.createElement("option");
      opt.value = pc;
      opt.textContent = NOTE_NAMES[pc];
      sel.appendChild(opt);
    }
    sel.value = chordRoot % 12;
    sel.addEventListener("change", e=>{
      chordRoot = 60 + Number(e.target.value);
      renderChordReferenceGrid();
    });
    renderChordReferenceGrid();
  }, 0);
  return el;
}
function renderChordReferenceGrid(){
  const grid = document.getElementById("chord-ref-grid");
  if(!grid) return;
  grid.innerHTML = "";
  DEGREES.forEach((deg, i)=>{
    const notes = triadNotes(chordRoot, i);
    const card = document.createElement("div");
    card.className = "ref-card";
    card.innerHTML =
      '<div class="ref-name">'+deg.roman+' <span class="fn-badge '+deg.function+'">'+FUNCTION_SHORT[deg.function]+'</span></div>' +
      '<div class="ref-formula">'+chordName(notes[0], i)+'</div>' +
      '<div class="ref-piano-group">' +
        '<div class="piano ref-piano"></div>' +
        '<div class="roll-panel ref-roll-panel"><div class="roll-keys"></div><div class="roll"></div></div>' +
      '</div>';
    grid.appendChild(card);
    const pianoEl = card.querySelector(".ref-piano");
    const rollPanelEl = card.querySelector(".ref-roll-panel");
    const low = notes[0], high = notes[0]+12;
    const playThis = ()=> playProgression([notes], 0.9, 0);
    renderPiano(pianoEl, playThis, low, high);
    const hiClass = {tonic:"hi-target", subdominant:"hi-root", dominant:"hi-tension"}[deg.function];
    highlightKeys(pianoEl, notes, hiClass);
    pianoEl.style.cursor = "pointer";
    pianoEl.title = "Click to hear it";

    renderPianoRoll(rollPanelEl, low, high, notes.map(m=>({midi:m, start:0, duration:6, cls:hiClass})));
    rollPanelEl.onclick = playThis;
    rollPanelEl.title = "Click to hear it";
  });
}

// ---- Demonstration ----
function buildChordDemoCard(){
  const el = document.createElement("section");
  el.className = "card";
  el.innerHTML =
    '<h2>Hear the pull</h2>' +
    '<p>Reading that V wants to resolve to I is one thing. Hearing it land is another. Play these back to back and pay attention to how each one feels, not just how it sounds.</p>' +
    '<div class="demo-grid">' +
      '<div class="demo-row"><button class="demo-btn" id="demo-v-i">Play V → I</button><span class="demo-caption">The classic resolution — maximum pull, fully resolved.</span></div>' +
      '<div class="demo-row"><button class="demo-btn hang" id="demo-v-alone">Play V alone</button><span class="demo-caption">Left hanging on purpose — notice how unfinished this feels.</span></div>' +
      '<div class="demo-row"><button class="demo-btn alt" id="demo-iv-i">Play IV → I</button><span class="demo-caption">A gentler resolution — softer pull, same destination.</span></div>' +
      '<div class="demo-row"><button class="demo-btn dim" id="demo-vii-i">Play vii° → I</button><span class="demo-caption">Different chord, same Dominant function — a V substitute.</span></div>' +
    '</div>';
  setTimeout(()=>{
    document.getElementById("demo-v-i").onclick = ()=>{
      const chordDur = 0.9, gap = 0.05;
      playProgression([triadNotes(chordRoot,4), triadNotes(chordRoot,0)], chordDur, gap);
    };
    document.getElementById("demo-v-alone").onclick = ()=>{
      playProgression([triadNotes(chordRoot,4)], 1.4, 0);
    };
    document.getElementById("demo-iv-i").onclick = ()=>{
      playProgression([triadNotes(chordRoot,3), triadNotes(chordRoot,0)], 0.9, 0.05);
    };
    document.getElementById("demo-vii-i").onclick = ()=>{
      playProgression([triadNotes(chordRoot,6), triadNotes(chordRoot,0)], 0.9, 0.05);
    };
  }, 0);
  return el;
}

// ---- Quiz ----
let currentChordQuestion = null;
let chordExactMode = false;
let chordSessionCorrect = 0, chordSessionTotal = 0;

function buildChordQuizCard(){
  const el = document.createElement("section");
  el.className = "card";
  el.innerHTML =
    '<h2>Ear training: name the function</h2>' +
    '<div class="quiz-controls">' +
      '<button class="play-btn" id="new-chord-btn">Play a new chord</button>' +
      '<button class="replay-btn" id="chord-replay-btn" style="display:none;">Replay</button>' +
      '<label><input type="checkbox" id="chord-exact-mode"> Exact chord (I, ii, iii...) instead of just function</label>' +
    '</div>' +
    '<div class="feedback" id="chord-feedback"></div>' +
    '<div class="answer-grid" id="chord-answer-grid"></div>' +
    '<div class="stats-row" id="chord-quiz-stats"></div>' +
    '<div class="weak-list" id="chord-weak-list"></div>';

  setTimeout(()=>{
    document.getElementById("chord-exact-mode").checked = chordExactMode;
    document.getElementById("chord-exact-mode").addEventListener("change", e=>{ chordExactMode = e.target.checked; });
    document.getElementById("new-chord-btn").addEventListener("click", newChordQuestion);
    document.getElementById("chord-replay-btn").addEventListener("click", ()=>{
      if(currentChordQuestion) playProgression([currentChordQuestion.notes], 0.9, 0);
    });
    renderChordQuizStats();
  }, 0);
  return el;
}

function newChordQuestion(){
  const i = Math.floor(Math.random()*7);
  const notes = triadNotes(chordRoot, i);
  currentChordQuestion = { degreeIndex:i, roman:DEGREES[i].roman, func:DEGREES[i].function, notes };
  playProgression([notes], 0.9, 0);

  document.getElementById("chord-replay-btn").style.display = "inline-block";
  document.getElementById("chord-feedback").textContent = "";
  document.getElementById("chord-feedback").className = "feedback";

  const grid = document.getElementById("chord-answer-grid");
  grid.innerHTML = "";
  if(chordExactMode){
    DEGREES.forEach((deg,idx)=>{
      const btn = document.createElement("button");
      btn.className = "answer-btn";
      btn.textContent = deg.roman;
      btn.onclick = ()=> checkChordAnswer(idx, btn);
      grid.appendChild(btn);
    });
  } else {
    ["tonic","subdominant","dominant"].forEach(fn=>{
      const btn = document.createElement("button");
      btn.className = "answer-btn";
      btn.textContent = FUNCTION_SHORT[fn];
      btn.onclick = ()=> checkChordAnswer(fn, btn);
      grid.appendChild(btn);
    });
  }
}

function checkChordAnswer(chosen, btnEl){
  if(!currentChordQuestion) return;
  const grid = document.getElementById("chord-answer-grid");
  grid.querySelectorAll(".answer-btn").forEach(b=>b.disabled = true);

  let correct, correctLabel, statKey, statBucket;
  if(chordExactMode){
    correct = chosen === currentChordQuestion.degreeIndex;
    correctLabel = currentChordQuestion.roman;
    statKey = currentChordQuestion.roman;
    statBucket = "chordStats";
  } else {
    correct = chosen === currentChordQuestion.func;
    correctLabel = FUNCTION_SHORT[currentChordQuestion.func];
    statKey = currentChordQuestion.func;
    statBucket = "functionStats";
  }

  if(!progress[statBucket]) progress[statBucket] = {};
  if(!progress[statBucket][statKey]) progress[statBucket][statKey] = {correct:0, wrong:0};

  if(correct){
    progress[statBucket][statKey].correct++;
    chordSessionCorrect++;
    btnEl.classList.add("correct");
    document.getElementById("chord-feedback").textContent = "Correct — that was "+currentChordQuestion.roman+" ("+FUNCTION_SHORT[currentChordQuestion.func]+").";
    document.getElementById("chord-feedback").className = "feedback correct";
  } else {
    progress[statBucket][statKey].wrong++;
    btnEl.classList.add("wrong");
    grid.querySelectorAll(".answer-btn").forEach(b=>{
      if(b.textContent === correctLabel) b.classList.add("correct");
    });
    document.getElementById("chord-feedback").textContent = "Not quite — that was "+currentChordQuestion.roman+" ("+FUNCTION_SHORT[currentChordQuestion.func]+").";
    document.getElementById("chord-feedback").className = "feedback wrong";
  }
  chordSessionTotal++;
  saveProgress();
  renderChordQuizStats();
}

function renderChordQuizStats(){
  const statsEl = document.getElementById("chord-quiz-stats");
  const weakEl = document.getElementById("chord-weak-list");
  if(!statsEl) return;
  const fnStats = progress.functionStats || {};
  const totalAttempts = Object.values(fnStats).reduce((s,v)=>s+v.correct+v.wrong,0);
  const totalCorrect = Object.values(fnStats).reduce((s,v)=>s+v.correct,0);
  const pct = totalAttempts ? Math.round(totalCorrect/totalAttempts*100) : 0;
  statsEl.innerHTML =
    '<span>This session: <strong>'+chordSessionCorrect+'/'+chordSessionTotal+'</strong></span>' +
    '<span>Function accuracy: <strong>'+pct+'%</strong> ('+totalAttempts+' attempts)</span>';

  const chordStats = progress.chordStats || {};
  const weak = Object.keys(chordStats)
    .map(k=>{ const s=chordStats[k]; const a=s.correct+s.wrong; return {name:k, acc:a?s.correct/a:0, attempts:a}; })
    .filter(x=>x.attempts>=2)
    .sort((a,b)=>a.acc-b.acc)
    .slice(0,3);
  weakEl.innerHTML = weak.length ? "Focus on: " + weak.map(w=>'<span>'+w.name+'</span>').join(", ") : "";
}

// ---- Apply ----
function buildChordApplyCard(){
  const el = document.createElement("section");
  el.className = "card";
  el.innerHTML = '<h2>This week in FL Studio</h2><p>Pick one, try it before checking the reference chart.</p><div id="chord-prompt-list"></div>';
  setTimeout(renderChordPrompts, 0);
  return el;
}
function renderChordPrompts(){
  const list = document.getElementById("chord-prompt-list");
  if(!list) return;
  list.innerHTML = "";
  CHORD_APPLY_PROMPTS.forEach(p=>{
    const done = !!(progress.appliedChordPrompts||{})[p.id];
    const row = document.createElement("div");
    row.className = "prompt-item" + (done ? " done" : "");
    row.innerHTML = '<input type="checkbox" '+(done?"checked":"")+'><span>'+p.text+'</span>';
    row.querySelector("input").addEventListener("change", e=>{
      if(!progress.appliedChordPrompts) progress.appliedChordPrompts = {};
      if(e.target.checked) progress.appliedChordPrompts[p.id] = Date.now();
      else delete progress.appliedChordPrompts[p.id];
      saveProgress();
      renderChordPrompts();
    });
    list.appendChild(row);
  });
}

async function init(){
  await loadProgress();
  renderTabs();
  renderModule();
}
init();
