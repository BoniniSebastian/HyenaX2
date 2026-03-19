
(() => {
  const STORAGE_KEY = "hyenax2_v3_state";
  const TEMPLATE = ["Organisation","Kontaktperson","Telefon","E-post","VNR","Anteckning"].join("\t");

  const demoLeads = [
    ["Sävsjö", "Erik", "0704662700", "erik@mail.se", "12345", "Ville bli återkopplad nästa vecka"],
    ["Lomma", "Lisa", "0735123456", "lisa@mail.se", "", "Testar ny kartläggning"],
    ["Värmdö", "Anna", "0707001122", "anna@mail.se", "77881", "Prio efter lunch"],
    ["Nacka", "Johan", "0720008899", "johan@mail.se", "99887", "Har svarat tidigare"],
    ["Täby", "Maria", "0701239090", "maria@mail.se", "", "Ring igen torsdag"],
    ["Sollentuna", "Per", "0704400011", "per@mail.se", "55442", "Intresserad av demo"],
  ];

  const $ = (id) => document.getElementById(id);

  const els = {
    dateBlock: $("dateBlock"),
    callsText: $("callsText"),
    answersText: $("answersText"),
    callsDots: $("callsDots"),
    answersDots: $("answersDots"),
    goalBtn: $("goalBtn"),
    timerValue: $("timerValue"),
    timerHint: $("timerHint"),
    timerRail: $("timerRail"),
    timerFill: $("timerFill"),
    timerToggleBtn: $("timerToggleBtn"),
    timerResetBtn: $("timerResetBtn"),
    timerPresetBtn: $("timerPresetBtn"),
    addLeadBtn: $("addLeadBtn"),
    surpriseBtn: $("surpriseBtn"),
    dataBtn: $("dataBtn"),
    copyTemplateBtn: $("copyTemplateBtn"),
    taskInput: $("taskInput"),
    addTaskBtn: $("addTaskBtn"),
    taskList: $("taskList"),
    leadList: $("leadList"),
    leadCount: $("leadCount"),
    overlay: $("overlay"),
    closeModalBtn: $("closeModalBtn"),
    modalTitle: $("modalTitle"),
    modalMeta: $("modalMeta"),
    modalPhone: $("modalPhone"),
    modalEmail: $("modalEmail"),
    modalVnr: $("modalVnr"),
    copyPhoneBtn: $("copyPhoneBtn"),
    copyEmailBtn: $("copyEmailBtn"),
    copyVnrBtn: $("copyVnrBtn"),
    normalMailBtn: $("normalMailBtn"),
    crmMailBtn: $("crmMailBtn"),
    markBtn: $("markBtn"),
    logCallBtn: $("logCallBtn"),
    answerFlow: $("answerFlow"),
    resultFlow: $("resultFlow"),
    noAnswerBtn: $("noAnswerBtn"),
    answeredBtn: $("answeredBtn"),
    meetingBtn: $("meetingBtn"),
    notInterestedBtn: $("notInterestedBtn"),
    noteInput: $("noteInput"),
    addNoteBtn: $("addNoteBtn"),
    logList: $("logList"),
    noteList: $("noteList"),
    attemptsText: $("attemptsText"),
    dataOverlay: $("dataOverlay"),
    closeDataModalBtn: $("closeDataModalBtn"),
    pasteArea: $("pasteArea"),
    appendBtn: $("appendBtn"),
    replaceBtn: $("replaceBtn"),
    exportBtn: $("exportBtn"),
    importJsonBtn: $("importJsonBtn"),
    jsonFileInput: $("jsonFileInput"),
    demoBtn: $("demoBtn"),
    manualOrg: $("manualOrg"),
    manualContact: $("manualContact"),
    manualPhone: $("manualPhone"),
    manualEmail: $("manualEmail"),
    manualVnr: $("manualVnr"),
    manualNote: $("manualNote"),
    saveManualBtn: $("saveManualBtn"),
    toastWrap: $("toastWrap"),
  };

  const defaultState = () => ({
    leads: [],
    tasks: [],
    goalCalls: 20,
    ui: {
      activeLeadId: null,
      surpriseLeadId: null,
      rouletteRunning: false,
    },
    timer: {
      durationSec: 25 * 60,
      remainingSec: 25 * 60,
      running: false,
      lastTickAt: null,
      preset: 25,
    }
  });

  const uid = () => (crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2,9)}`);
  const nowIso = () => new Date().toISOString();
  const todayKey = () => new Date().toLocaleDateString("sv-SE");
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const fmtTopDate = () => cap(new Date().toLocaleString("sv-SE", { weekday:"long", day:"numeric", month:"long", hour:"2-digit", minute:"2-digit" }));
  const fmtDateTime = (iso) => new Date(iso).toLocaleString("sv-SE", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
  const fmtShort = (iso) => new Date(iso).toLocaleString("sv-SE", { month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
  const toDay = (iso) => new Date(iso).toLocaleDateString("sv-SE");

  let state = loadState();
  let timerInterval = null;
  let pendingCallLeadId = null;

  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return {
        ...defaultState(),
        ...parsed,
        ui: { ...defaultState().ui, ...(parsed.ui || {}) },
        timer: { ...defaultState().timer, ...(parsed.timer || {}) },
        leads: Array.isArray(parsed.leads) ? parsed.leads : [],
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      };
    }catch{
      return defaultState();
    }
  }

  function saveState(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function persistAndRender(){
    saveState();
    renderAll();
  }

  function toast(msg){
    const div = document.createElement("div");
    div.className = "toast";
    div.textContent = msg;
    els.toastWrap.appendChild(div);
    setTimeout(() => {
      div.style.opacity = "0";
      div.style.transform = "translateY(6px)";
      setTimeout(() => div.remove(), 180);
    }, 2100);
  }

  function escapeHtml(str=""){
    return String(str).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
  }

  function getLeadStatus(lead){
    const latest = lead.logs?.[0];
    if(!latest) return { key:"neutral", label:"Ej ringd" };
    if(latest.result === "Bokat möte") return { key:"success", label:"Bokat möte" };
    if(latest.outcome === "Svarade") return { key:"answered", label: latest.result || "Svarade" };
    if(latest.outcome === "Inget svar") return { key:"no-answer", label:"Inget svar" };
    return { key:"neutral", label:"Pågående" };
  }

  function getPreview(lead){
    const latestNote = lead.notes?.[0];
    const latestLog = lead.logs?.[0];
    if(latestNote && (!latestLog || latestNote.createdAt > latestLog.createdAt)){
      return { text: latestNote.text, time: latestNote.createdAt };
    }
    if(latestLog){
      return { text: [latestLog.event, latestLog.outcome, latestLog.result].filter(Boolean).join(" / "), time: latestLog.createdAt };
    }
    if(lead.seedNote){
      return { text: lead.seedNote, time: lead.createdAt };
    }
    return { text: "Ingen aktivitet ännu", time: null };
  }

  function parseExcelText(text){
    const rows = text.split(/\r?\n/).map(r => r.trimEnd()).filter(Boolean).map(r => r.split("\t"));
    if(!rows.length) return [];

    const first = rows[0].map(v => String(v || "").trim().toLowerCase());
    const expected = ["organisation","kontaktperson","telefon","e-post","vnr","anteckning"];
    const hasHeader = expected.every((v, i) => (first[i] || "") === v);
    const data = hasHeader ? rows.slice(1) : rows;

    return data
      .filter(cols => cols.some(cell => String(cell).trim() !== ""))
      .map(cols => buildLead({
        organization: (cols[0] || "").trim(),
        contactPerson: (cols[1] || "").trim(),
        phone: (cols[2] || "").trim(),
        email: (cols[3] || "").trim(),
        vnr: (cols[4] || "").trim(),
        note: (cols[5] || "").trim(),
      }))
      .filter(item => item.organization || item.contactPerson || item.phone || item.email || item.vnr);
  }

  function buildLead({ organization="", contactPerson="", phone="", email="", vnr="", note="" }){
    const createdAt = nowIso();
    const cleanedNote = note.trim();
    return {
      id: uid(),
      organization: organization.trim(),
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      email: email.trim(),
      vnr: vnr.trim(),
      seedNote: cleanedNote,
      createdAt,
      updatedAt: createdAt,
      marked: false,
      logs: [],
      notes: cleanedNote ? [{ id: uid(), text: cleanedNote, createdAt }] : [],
    };
  }

  function copy(text, label){
    if(!text){
      toast(`Ingen ${label.toLowerCase()} att kopiera.`);
      return;
    }
    navigator.clipboard.writeText(text)
      .then(() => toast(`${label} kopierad.`))
      .catch(() => toast(`Kunde inte kopiera ${label.toLowerCase()}.`));
  }

  function renderDate(){
    els.dateBlock.textContent = fmtTopDate();
  }

  function renderStats(){
    const today = todayKey();
    let calls = 0;
    let answers = 0;

    state.leads.forEach(lead => {
      (lead.logs || []).forEach(log => {
        if(toDay(log.createdAt) !== today) return;
        if(log.event === "Ringt") calls += 1;
        if(log.outcome === "Svarade") answers += 1;
      });
    });

    const callGoal = Math.max(1, Number(state.goalCalls) || 20);
    els.callsText.textContent = `${calls} / ${callGoal}`;
    els.answersText.textContent = `${answers}`;

    els.callsDots.innerHTML = "";
    for(let i=0;i<callGoal;i++){
      const dot = document.createElement("span");
      dot.className = `dot ${i < calls ? "active calls" : ""}`;
      els.callsDots.appendChild(dot);
    }

    const answerGoal = Math.max(10, Math.max(answers, Math.ceil(callGoal * 0.5)));
    els.answersDots.innerHTML = "";
    for(let i=0;i<answerGoal;i++){
      const dot = document.createElement("span");
      dot.className = `dot ${i < answers ? "active answers" : ""}`;
      els.answersDots.appendChild(dot);
    }
  }

  function renderTasks(){
    els.taskList.innerHTML = "";
    if(!state.tasks.length){
      els.taskList.innerHTML = `<div class="emptyState">Inga tasks ännu.</div>`;
      return;
    }

    state.tasks.forEach(task => {
      const div = document.createElement("div");
      div.className = `taskItem ${task.done ? "done" : ""}`;
      div.innerHTML = `
        <input class="taskCheck" type="checkbox" ${task.done ? "checked" : ""} />
        <div class="taskText">${escapeHtml(task.text)}</div>
        <button class="actionBtn small fixedMiniBtn ghost" type="button"><span>Ta bort</span></button>
      `;
      div.querySelector(".taskCheck").addEventListener("change", (e) => {
        task.done = e.target.checked;
        task.updatedAt = nowIso();
        persistAndRender();
      });
      div.querySelector("button").addEventListener("click", () => {
        state.tasks = state.tasks.filter(t => t.id !== task.id);
        persistAndRender();
      });
      els.taskList.appendChild(div);
    });
  }

  function buildCard(lead){
    const status = getLeadStatus(lead);
    const preview = getPreview(lead);
    const attempts = (lead.logs || []).filter(l => l.event === "Ringt").length;

    const article = document.createElement("article");
    article.className = `leadCard ${status.key === "success" ? "success" : ""} ${lead.marked ? "marked" : ""} ${state.ui.surpriseLeadId === lead.id ? "surprise" : ""}`;
    article.dataset.id = lead.id;
    article.innerHTML = `
      <div class="leadGlow"></div>
      <div class="leadHead">
        <div class="leadInfo">
          <div class="statusRow">
            <span class="statusDot ${status.key}"></span>
            <div class="orgName">${escapeHtml(lead.organization || "Namnlös")}</div>
          </div>
          <div class="contactLine">${escapeHtml(lead.contactPerson || "Kontakt saknas")}</div>
        </div>
        <button class="actionBtn small lampBtn ${lead.marked ? "on" : ""}" type="button" data-lamp="${lead.id}">
          <span class="btnIcon">💡</span>
        </button>
      </div>

      <div class="previewLine">${escapeHtml(preview.text)}</div>

      <div class="leadBottom">
        <div class="timeLine">${preview.time ? escapeHtml(fmtShort(preview.time)) : "-"}</div>
        <div class="sideMeta">
          <div class="stateBadge ${status.key}">${escapeHtml(status.label)}</div>
          <div class="timeLine">${attempts} försök</div>
        </div>
      </div>
    `;

    article.addEventListener("click", (e) => {
      if(e.target.closest("[data-lamp]")) return;
      openLead(lead.id);
    });

    article.querySelector("[data-lamp]").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleLamp(lead.id);
    });

    return article;
  }

  function renderLeads(){
    const visible = [...state.leads]
      .sort((a,b) => {
        const aSuccess = getLeadStatus(a).key === "success" ? 1 : 0;
        const bSuccess = getLeadStatus(b).key === "success" ? 1 : 0;
        if(aSuccess !== bSuccess) return aSuccess - bSuccess;
        return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
      });

    els.leadList.innerHTML = "";
    if(!visible.length){
      els.leadList.innerHTML = `<div class="emptyState">Ingen kundlista ännu. Öppna Data eller Addera kort för att komma igång.</div>`;
    } else {
      visible.forEach(lead => els.leadList.appendChild(buildCard(lead)));
    }

    els.leadCount.textContent = `${visible.length} kunder`;
  }

  function getActiveLead(){
    return state.leads.find(l => l.id === state.ui.activeLeadId) || null;
  }

  function openLead(id){
    state.ui.activeLeadId = id;
    pendingCallLeadId = null;
    els.answerFlow.classList.add("hidden");
    els.resultFlow.classList.add("hidden");
    saveState();
    renderModal();
    els.overlay.classList.add("open");
  }

  function closeLead(){
    state.ui.activeLeadId = null;
    pendingCallLeadId = null;
    saveState();
    els.overlay.classList.remove("open");
  }

  function openDataModal(){
    els.dataOverlay.classList.add("open");
    updateAppendReady();
  }

  function closeDataModal(){
    els.dataOverlay.classList.remove("open");
  }

  function renderModal(){
    const lead = getActiveLead();
    if(!lead){
      closeLead();
      return;
    }

    const status = getLeadStatus(lead);
    els.modalTitle.textContent = lead.organization || "Namnlös";
    els.modalMeta.textContent = `${lead.contactPerson || "Kontakt saknas"} • ${status.label}`;
    els.modalPhone.textContent = lead.phone || "-";
    els.modalEmail.textContent = lead.email || "-";
    els.modalVnr.textContent = lead.vnr || "-";
    els.crmMailBtn.disabled = !lead.vnr;
    els.crmMailBtn.querySelector("span:last-child").textContent = lead.vnr ? "Maila CRM" : "Saknar VNR";
    els.markBtn.className = `actionBtn small fixedMiniBtn ${lead.marked ? "amber" : ""}`;
    els.markBtn.querySelector("span:last-child").textContent = lead.marked ? "Markerad" : "Markera";

    const attempts = (lead.logs || []).filter(l => l.event === "Ringt").length;
    els.attemptsText.textContent = `${attempts} försök`;

    renderHistory(lead);
  }

  function renderHistory(lead){
    els.logList.innerHTML = "";
    els.noteList.innerHTML = "";

    if(!lead.logs?.length){
      els.logList.innerHTML = `<div class="emptyState">Ingen logg ännu.</div>`;
    } else {
      lead.logs.forEach(log => {
        const div = document.createElement("div");
        div.className = "historyItem";
        div.innerHTML = `
          <div class="historyTop">
            <span>${escapeHtml(fmtDateTime(log.createdAt))}</span>
            <span class="tag">${escapeHtml(log.event)}</span>
          </div>
          <div class="historyText">${escapeHtml([log.event, log.outcome, log.result].filter(Boolean).join(" / "))}</div>
          <div class="historyActions">
            <button class="actionBtn small fixedMiniBtn" type="button" data-edit-log="${log.id}"><span>Redigera</span></button>
            <button class="actionBtn small fixedMiniBtn ghost" type="button" data-del-log="${log.id}"><span>Ta bort</span></button>
          </div>
        `;
        els.logList.appendChild(div);
      });

      els.logList.querySelectorAll("[data-edit-log]").forEach(btn => {
        btn.addEventListener("click", () => editLog(lead.id, btn.dataset.editLog));
      });
      els.logList.querySelectorAll("[data-del-log]").forEach(btn => {
        btn.addEventListener("click", () => deleteLog(lead.id, btn.dataset.delLog));
      });
    }

    if(!lead.notes?.length){
      els.noteList.innerHTML = `<div class="emptyState">Inga anteckningar ännu.</div>`;
    } else {
      lead.notes.forEach(note => {
        const div = document.createElement("div");
        div.className = "historyItem";
        div.innerHTML = `
          <div class="historyTop">
            <span>${escapeHtml(fmtDateTime(note.createdAt))}</span>
            <span class="tag">Anteckning</span>
          </div>
          <div class="historyText">${escapeHtml(note.text)}</div>
          <div class="historyActions">
            <button class="actionBtn small fixedMiniBtn" type="button" data-edit-note="${note.id}"><span>Redigera</span></button>
            <button class="actionBtn small fixedMiniBtn ghost" type="button" data-del-note="${note.id}"><span>Ta bort</span></button>
          </div>
        `;
        els.noteList.appendChild(div);
      });

      els.noteList.querySelectorAll("[data-edit-note]").forEach(btn => {
        btn.addEventListener("click", () => editNote(lead.id, btn.dataset.editNote));
      });
      els.noteList.querySelectorAll("[data-del-note]").forEach(btn => {
        btn.addEventListener("click", () => deleteNote(lead.id, btn.dataset.delNote));
      });
    }
  }

  function addNote(lead, text){
    const cleaned = text.trim();
    if(!cleaned) return false;
    lead.notes = lead.notes || [];
    lead.notes.unshift({ id: uid(), text: cleaned, createdAt: nowIso() });
    lead.updatedAt = nowIso();
    return true;
  }

  function addLog(lead, payload){
    lead.logs = lead.logs || [];
    lead.logs.unshift({
      id: uid(),
      createdAt: nowIso(),
      event: payload.event || "Ringt",
      outcome: payload.outcome || null,
      result: payload.result || null,
    });
    lead.updatedAt = nowIso();
  }

  function toggleLamp(id){
    const lead = state.leads.find(l => l.id === id);
    if(!lead) return;
    lead.marked = !lead.marked;
    lead.updatedAt = nowIso();
    persistAndRender();
  }

  function editLog(leadId, logId){
    const lead = state.leads.find(l => l.id === leadId);
    const log = lead?.logs?.find(x => x.id === logId);
    if(!lead || !log) return;
    const current = [log.event, log.outcome, log.result].filter(Boolean).join(" / ");
    const value = prompt("Redigera logg:", current);
    if(value === null) return;
    const parts = value.split("/").map(s => s.trim()).filter(Boolean);
    log.event = parts[0] || "Ringt";
    log.outcome = parts[1] || null;
    log.result = parts[2] || null;
    lead.updatedAt = nowIso();
    persistAndRender();
  }

  function deleteLog(leadId, logId){
    const lead = state.leads.find(l => l.id === leadId);
    if(!lead) return;
    lead.logs = (lead.logs || []).filter(x => x.id !== logId);
    lead.updatedAt = nowIso();
    persistAndRender();
  }

  function editNote(leadId, noteId){
    const lead = state.leads.find(l => l.id === leadId);
    const note = lead?.notes?.find(x => x.id === noteId);
    if(!lead || !note) return;
    const value = prompt("Redigera anteckning:", note.text);
    if(value === null) return;
    note.text = value.trim();
    lead.updatedAt = nowIso();
    persistAndRender();
  }

  function deleteNote(leadId, noteId){
    const lead = state.leads.find(l => l.id === leadId);
    if(!lead) return;
    lead.notes = (lead.notes || []).filter(x => x.id !== noteId);
    lead.updatedAt = nowIso();
    persistAndRender();
  }

  function buildMailBody(lead){
    const latestNote = lead.notes?.[0];
    return [
      `Kontakt: ${lead.contactPerson || "-"}`,
      "",
      "Anteckning:",
      latestNote ? latestNote.text : "-",
    ].join("\n");
  }

  function openMail(to, subject, body){
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function renderTimer(){
    syncTimerState();
    const t = state.timer;
    const min = Math.floor(t.remainingSec / 60);
    const sec = t.remainingSec % 60;
    els.timerValue.textContent = `${String(min).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
    els.timerFill.style.width = `${Math.max(0, (t.remainingSec / t.durationSec) * 100)}%`;
    els.timerToggleBtn.querySelector("span:last-child").textContent = t.running ? "Pausa" : "Starta";
    els.timerHint.textContent = t.running ? "Pågår nu" : "Fokuspass utan loggning";
    els.timerPresetBtn.querySelector("span:last-child").textContent = t.preset === 25 ? "15 min" : "25 min";
    els.timerToggleBtn.querySelector(".btnIcon").textContent = t.running ? "❚❚" : "⏵";
  }

  function syncTimerState(){
    const t = state.timer;
    if(!t.running || !t.lastTickAt) return;
    const now = Date.now();
    const diff = Math.floor((now - t.lastTickAt) / 1000);
    if(diff <= 0) return;
    t.remainingSec = Math.max(0, t.remainingSec - diff);
    t.lastTickAt = now;
    if(t.remainingSec <= 0){
      t.running = false;
      toast("Timer klar.");
    }
  }

  function startTimerLoop(){
    if(timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      syncTimerState();
      saveState();
      renderTimer();
      renderDate();
    }, 1000);
  }

  function exportJson(){
    const name = `hyenax2-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    const blob = new Blob([JSON.stringify(state, null, 2)], { type:"application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }

  function updateAppendReady(){
    const hasText = !!els.pasteArea.value.trim();
    els.appendBtn.classList.toggle("appendReady", hasText);
  }

  function openAddDirect(){
    openDataModal();
    setTimeout(() => els.manualOrg.focus(), 40);
  }

  function roulettePick(){
    if(state.ui.rouletteRunning) return;
    const candidates = state.leads.filter(lead => getLeadStatus(lead).key !== "success");
    if(!candidates.length){
      toast("Inga kandidater kvar utan success.");
      return;
    }

    state.ui.rouletteRunning = true;
    state.ui.surpriseLeadId = null;
    saveState();
    renderLeads();

    const shuffled = candidates.slice().sort(() => Math.random() - 0.5);
    let sequence = [];
    const totalSteps = 14 + Math.floor(Math.random() * 8);
    while(sequence.length < totalSteps){
      sequence.push(shuffled[sequence.length % shuffled.length].id);
    }
    const finalLeadId = sequence[sequence.length - 1];
    let index = 0;

    const tick = () => {
      const id = sequence[index];
      state.ui.surpriseLeadId = id;
      saveState();
      renderLeads();

      const active = els.leadList.querySelector(`.leadCard[data-id="${id}"]`);
      if(active){
        active.scrollIntoView({ behavior:"smooth", block:"nearest", inline:"nearest" });
      }

      index += 1;
      if(index < sequence.length){
        const remaining = sequence.length - index;
        const delay = 70 + (sequence.length - remaining) * 10;
        setTimeout(tick, Math.min(delay, 220));
      } else {
        state.ui.surpriseLeadId = finalLeadId;
        state.ui.rouletteRunning = false;
        saveState();
        renderLeads();
      }
    };

    tick();
  }

  function renderAll(){
    renderDate();
    renderStats();
    renderTasks();
    renderLeads();
    renderTimer();
    updateAppendReady();
    if(state.ui.activeLeadId) renderModal();
  }

  // Events
  els.goalBtn.addEventListener("click", () => {
    const value = prompt("Ange dagens samtalsmål:", String(state.goalCalls || 20));
    if(value === null) return;
    const n = Number(value);
    if(!Number.isFinite(n) || n <= 0) return toast("Ogiltigt mål.");
    state.goalCalls = Math.round(n);
    persistAndRender();
  });

  els.timerToggleBtn.addEventListener("click", () => {
    syncTimerState();
    state.timer.running = !state.timer.running;
    state.timer.lastTickAt = Date.now();
    saveState();
    renderTimer();
  });

  els.timerRail.addEventListener("click", () => {
    els.timerToggleBtn.click();
  });

  els.timerResetBtn.addEventListener("click", () => {
    state.timer.running = false;
    state.timer.durationSec = state.timer.preset * 60;
    state.timer.remainingSec = state.timer.durationSec;
    state.timer.lastTickAt = null;
    persistAndRender();
  });

  els.timerPresetBtn.addEventListener("click", () => {
    state.timer.preset = state.timer.preset === 25 ? 15 : 25;
    state.timer.running = false;
    state.timer.durationSec = state.timer.preset * 60;
    state.timer.remainingSec = state.timer.durationSec;
    state.timer.lastTickAt = null;
    persistAndRender();
  });

  els.dataBtn.addEventListener("click", openDataModal);
  els.addLeadBtn.addEventListener("click", openAddDirect);
  els.closeDataModalBtn.addEventListener("click", closeDataModal);
  els.dataOverlay.addEventListener("click", (e) => {
    if(e.target === els.dataOverlay) closeDataModal();
  });

  els.copyTemplateBtn.addEventListener("click", async () => {
    try{
      await navigator.clipboard.writeText(TEMPLATE);
      toast("Mall kopierad.");
    }catch{
      toast("Kunde inte kopiera mall.");
    }
  });

  els.pasteArea.addEventListener("input", updateAppendReady);

  els.replaceBtn.addEventListener("click", () => {
    const leads = parseExcelText(els.pasteArea.value);
    if(!leads.length) return toast("Ingen giltig data hittades.");
    state.leads = leads;
    state.ui.surpriseLeadId = null;
    els.pasteArea.value = "";
    persistAndRender();
    toast("Listan ersatt.");
  });

  els.appendBtn.addEventListener("click", () => {
    const leads = parseExcelText(els.pasteArea.value);
    if(!leads.length) return toast("Ingen giltig data hittades.");
    state.leads.unshift(...leads);
    els.pasteArea.value = "";
    persistAndRender();
    toast("Rader tillagda.");
  });

  els.demoBtn.addEventListener("click", () => {
    const demo = demoLeads.map(row => buildLead({
      organization: row[0],
      contactPerson: row[1],
      phone: row[2],
      email: row[3],
      vnr: row[4],
      note: row[5],
    }));
    state.leads = demo;
    persistAndRender();
    toast("Demo laddad.");
  });

  els.exportBtn.addEventListener("click", exportJson);

  els.importJsonBtn.addEventListener("click", () => els.jsonFileInput.click());

  els.jsonFileInput.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if(!file) return;
    try{
      const text = await file.text();
      const parsed = JSON.parse(text);
      state = {
        ...defaultState(),
        ...parsed,
        ui: { ...defaultState().ui, ...(parsed.ui || {}) },
        timer: { ...defaultState().timer, ...(parsed.timer || {}) },
        leads: Array.isArray(parsed.leads) ? parsed.leads : [],
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      };
      saveState();
      renderAll();
      toast("Backup importerad.");
    }catch{
      toast("Kunde inte läsa backupfilen.");
    }
    e.target.value = "";
  });

  els.saveManualBtn.addEventListener("click", () => {
    const lead = buildLead({
      organization: els.manualOrg.value,
      contactPerson: els.manualContact.value,
      phone: els.manualPhone.value,
      email: els.manualEmail.value,
      vnr: els.manualVnr.value,
      note: els.manualNote.value,
    });

    if(!lead.organization && !lead.contactPerson) return toast("Fyll i åtminstone organisation eller kontaktperson.");

    state.leads.unshift(lead);
    [els.manualOrg, els.manualContact, els.manualPhone, els.manualEmail, els.manualVnr, els.manualNote].forEach(el => el.value = "");
    persistAndRender();
    toast("Kort sparat.");
  });

  els.surpriseBtn.addEventListener("click", roulettePick);

  els.addTaskBtn.addEventListener("click", () => {
    const text = els.taskInput.value.trim();
    if(!text) return;
    state.tasks.unshift({ id: uid(), text, done:false, createdAt: nowIso() });
    els.taskInput.value = "";
    persistAndRender();
  });

  els.taskInput.addEventListener("keydown", (e) => {
    if(e.key === "Enter"){
      e.preventDefault();
      els.addTaskBtn.click();
    }
  });

  els.closeModalBtn.addEventListener("click", closeLead);
  els.overlay.addEventListener("click", (e) => {
    if(e.target === els.overlay) closeLead();
  });

  els.copyPhoneBtn.addEventListener("click", () => {
    const lead = getActiveLead();
    if(lead) copy(lead.phone, "Telefon");
  });
  els.copyEmailBtn.addEventListener("click", () => {
    const lead = getActiveLead();
    if(lead) copy(lead.email, "E-post");
  });
  els.copyVnrBtn.addEventListener("click", () => {
    const lead = getActiveLead();
    if(lead) copy(lead.vnr, "VNR");
  });

  els.normalMailBtn.addEventListener("click", () => {
    const lead = getActiveLead();
    if(!lead) return;
    openMail(lead.email || "", "Kartläggning | Samtal", buildMailBody(lead));
  });

  els.crmMailBtn.addEventListener("click", () => {
    const lead = getActiveLead();
    if(!lead) return;
    if(!lead.vnr) return toast("Saknar VNR.");
    openMail(`${lead.vnr}.eventful@severamail.com`, "Kartläggning | Samtal", buildMailBody(lead));
  });

  els.markBtn.addEventListener("click", () => {
    const lead = getActiveLead();
    if(!lead) return;
    lead.marked = !lead.marked;
    lead.updatedAt = nowIso();
    persistAndRender();
  });

  els.logCallBtn.addEventListener("click", () => {
    const lead = getActiveLead();
    if(!lead) return;
    addLog(lead, { event:"Ringt" });
    pendingCallLeadId = lead.id;
    els.answerFlow.classList.remove("hidden");
    els.resultFlow.classList.add("hidden");
    persistAndRender();
  });

  els.noAnswerBtn.addEventListener("click", () => {
    const lead = getActiveLead();
    if(!lead || pendingCallLeadId !== lead.id) return;
    if(lead.logs?.[0]) lead.logs[0].outcome = "Inget svar";
    lead.updatedAt = nowIso();
    pendingCallLeadId = null;
    els.answerFlow.classList.add("hidden");
    persistAndRender();
  });

  els.answeredBtn.addEventListener("click", () => {
    const lead = getActiveLead();
    if(!lead || pendingCallLeadId !== lead.id) return;
    if(lead.logs?.[0]) lead.logs[0].outcome = "Svarade";
    lead.updatedAt = nowIso();
    els.resultFlow.classList.remove("hidden");
    persistAndRender();
  });

  els.meetingBtn.addEventListener("click", () => {
    const lead = getActiveLead();
    if(!lead || pendingCallLeadId !== lead.id) return;
    if(lead.logs?.[0]){
      lead.logs[0].outcome = "Svarade";
      lead.logs[0].result = "Bokat möte";
    }
    lead.updatedAt = nowIso();
    pendingCallLeadId = null;
    els.answerFlow.classList.add("hidden");
    els.resultFlow.classList.add("hidden");
    persistAndRender();
  });

  els.notInterestedBtn.addEventListener("click", () => {
    const lead = getActiveLead();
    if(!lead || pendingCallLeadId !== lead.id) return;
    if(lead.logs?.[0]){
      lead.logs[0].outcome = "Svarade";
      lead.logs[0].result = "Ej intresserad";
    }
    lead.updatedAt = nowIso();
    pendingCallLeadId = null;
    els.answerFlow.classList.add("hidden");
    els.resultFlow.classList.add("hidden");
    persistAndRender();
  });

  els.addNoteBtn.addEventListener("click", () => {
    const lead = getActiveLead();
    if(!lead) return;
    if(!addNote(lead, els.noteInput.value)) return toast("Skriv en anteckning först.");
    els.noteInput.value = "";
    persistAndRender();
  });

  setInterval(renderDate, 1000 * 30);
  startTimerLoop();
  renderAll();
})();
