// ============================================================================
// 1. CONFIGURAÇÃO DO FIREBASE (COLE SUAS CHAVES AQUI QUANDO CRIAR O PROJETO)
// ============================================================================
const firebaseConfig = {https://console.firebase.google.com/project/rotina-familia-alves/database/rotina-familia-alves-default-rtdb/data/~2F?hl=pt-br}
  apiKey: "", // Cole aqui sua apiKey
  authDomain: "",
  databaseURL: "", // Ex: "https://seu-projeto-default-rtdb.firebaseio.com"
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

let db = null;
const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.databaseURL);

if (isFirebaseConfigured) {
  firebase.initializeApp(firebaseConfig);
  db = firebase.database().ref('familia_alves');
}

// ============================================================================
// 2. ESTADO INICIAL PADRÃO (USADO NO PRIMEIRO ACESSO OU MODO LOCAL)
// ============================================================================
const defaultState = {
  pin: "1234",
  casalHoje: [
    { id: 1, texto: "Paulo: Turno até 18h" },
    { id: 2, texto: "Isabela: Compromisso às 15h" }
  ],
  pendencias: [
    { id: 1, texto: "Pagar boleto da escola", done: true },
    { id: 2, texto: "Comprar ração", done: false }
  ],
  mural: [
    { id: 1, autor: "Isabela", texto: "Deixei a autorização na mochila da Duda" }
  ],
  logistica: {
    leva: "Paulo (07:30)",
    busca: "Isabela (12:00)"
  },
  agenda: [
    { id: 1, categoria: "Duda", dia: "Seg", texto: "Escola 07:30 · Paulo leva / Isabela busca" },
    { id: 2, categoria: "Casal", dia: "Qua", texto: "Alinhar programação do fim de semana" },
    { id: 3, categoria: "Casa", dia: "Sáb", texto: "Compras da semana no mercado" }
  ],
  mercado: [
    { id: 1, texto: "Frutas para lancheira", done: false },
    { id: 2, texto: "Leite e café", done: false }
  ],
  saude: {
    remedioNome: "Nenhum remédio ativo",
    ultimaDose: "-",
    proximaDose: "-",
    alergias: "Nenhuma registrada",
    tipoSanguineo: "O+",
    vacinas: "Em dia"
  },
  missoes: [
    { id: 1, turno: "Manhã", titulo: "Escovar os dentes", done: true },
    { id: 2, turno: "Manhã", titulo: "Arrumar a mochila", done: true },
    { id: 3, turno: "Tarde", titulo: "Fazer lição de casa", done: false },
    { id: 4, turno: "Tarde", titulo: "Guardar brinquedos", done: false },
    { id: 5, turno: "Noite", titulo: "Separar uniforme de amanhã", done: false }
  ]
};

let appState = JSON.parse(localStorage.getItem('familia_alves_state')) || defaultState;
let currentFilter = 'Todos';

// ============================================================================
// 3. SINCRONIZAÇÃO (FIREBASE EM TEMPO REAL OU LOCALSTORAGE)
// ============================================================================
function saveState() {
  localStorage.setItem('familia_alves_state', JSON.stringify(appState));
  if (db) {
    db.set(appState);
  } else {
    renderAll();
  }
}

if (db) {
  db.on('value', (snapshot) => {
    const remoteData = snapshot.val();
    if (remoteData) {
      appState = { ...defaultState, ...remoteData };
      localStorage.setItem('familia_alves_state', JSON.stringify(appState));
      renderAll();
    } else {
      db.set(appState);
    }
  });
}

// ============================================================================
// 4. CONTROLE DE PERFIS (PAULO, ISABELA E MODO DUDA)
// ============================================================================
function initProfile() {
  const savedProfile = localStorage.getItem('familia_alves_profile');
  if (!savedProfile) {
    document.getElementById('profile-gate').classList.remove('hidden');
    return;
  }
  applyProfileView(savedProfile);
  renderAll();
}

function selectInitialProfile(profile) {
  localStorage.setItem('familia_alves_profile', profile);
  document.getElementById('profile-gate').classList.add('hidden');
  applyProfileView(profile);
  renderAll();
}

function applyProfileView(profile) {
  const adultApp = document.getElementById('adult-app');
  const dudaApp = document.getElementById('duda-app');

  if (profile === 'Duda') {
    adultApp.classList.add('hidden');
    dudaApp.classList.remove('hidden');
  } else {
    dudaApp.classList.add('hidden');
    adultApp.classList.remove('hidden');
    document.getElementById('current-user-label').textContent = profile;
  }
}

function enterDudaMode() {
  localStorage.setItem('familia_alves_last_adult', localStorage.getItem('familia_alves_profile') || 'Paulo');
  localStorage.setItem('familia_alves_profile', 'Duda');
  applyProfileView('Duda');
  renderAll();
}

function switchAdultProfile(name) {
  localStorage.setItem('familia_alves_profile', name);
  applyProfileView(name);
}

function openPinModal() {
  document.getElementById('pin-input').value = '';
  document.getElementById('pin-modal').classList.remove('hidden');
}

function closePinModal() {
  document.getElementById('pin-modal').classList.add('hidden');
}

function verifyPin() {
  const entered = document.getElementById('pin-input').value;
  if (entered === (appState.pin || "1234")) {
    closePinModal();
    const lastAdult = localStorage.getItem('familia_alves_last_adult') || 'Paulo';
    localStorage.setItem('familia_alves_profile', lastAdult);
    applyProfileView(lastAdult);
    renderAll();
  } else {
    alert("PIN incorreto!");
  }
}

// ============================================================================
// 5. NAVEGAÇÃO ENTRE ABAS
// ============================================================================
function switchTab(tabId, title, btn) {
  document.querySelectorAll('.tab-view').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${tabId}`).classList.add('active');
  btn.classList.add('active');
  document.getElementById('header-title').textContent = title;
}

function setAgendaFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  renderAgenda();
}

// ============================================================================
// 6. RENDERIZAÇÃO DAS TELAS
// ============================================================================
function renderAll() {
  renderHoje();
  renderAgenda();
  renderMercado();
  renderSaude();
  renderMissoes();
}

function renderHoje() {
  // Casal
  const casalEl = document.getElementById('casal-hoje-list');
  casalEl.innerHTML = (appState.casalHoje || []).map(item => `<p>• ${item.texto}</p>`).join('');

  // Pendências da Casa
  const pendEl = document.getElementById('pendencias-list');
  pendEl.innerHTML = (appState.pendencias || []).map((item, idx) => `
    <div class="check-item ${item.done ? 'done' : ''}" onclick="togglePendencia(${idx})">
      <span>${item.done ? '✅' : '⬜'} ${item.texto}</span>
      <small onclick="event.stopPropagation(); deletePendencia(${idx})">🗑️</small>
    </div>
  `).join('');

  // Mural
  const muralEl = document.getElementById('mural-list');
  muralEl.innerHTML = (appState.mural || []).map((m, idx) => `
    <div class="check-item" style="border:none; padding:4px 0;">
      <span><strong>${m.autor}:</strong> ${m.texto}</span>
      <small onclick="deleteMural(${idx})">✕</small>
    </div>
  `).join('');

  // Logística
  document.getElementById('hoje-leva').textContent = appState.logistica.leva;
  document.getElementById('hoje-busca').textContent = appState.logistica.busca;
}

function renderAgenda() {
  const agendaEl = document.getElementById('agenda-list');
  const filtered = (appState.agenda || []).filter(a => currentFilter === 'Todos' || a.categoria === currentFilter);
  agendaEl.innerHTML = filtered.map((item, idx) => `
    <div class="agenda-item">
      <span class="agenda-tag">${item.categoria}</span>
      <strong>${item.dia}:</strong> ${item.texto}
    </div>
  `).join('');
}

function renderMercado() {
  const mercEl = document.getElementById('mercado-list');
  mercEl.innerHTML = (appState.mercado || []).map((item, idx) => `
    <div class="check-item ${item.done ? 'done' : ''}" onclick="toggleMercado(${idx})">
      <span>${item.done ? '✅' : '⬜'} ${item.texto}</span>
      <small onclick="event.stopPropagation(); deleteMercado(${idx})">🗑️</small>
    </div>
  `).join('');
}

function renderSaude() {
  const s = appState.saude;
  document.getElementById('remedio-box').innerHTML = `
    <div class="remedio-card">
      <strong>${s.remedioNome}</strong>
      <p style="font-size:13px; margin-top:4px;">Última dose: ${s.ultimaDose}</p>
      <p style="font-size:13px;">Próxima dose: ${s.proximaDose}</p>
      <button class="btn-dose" onclick="registrarDose()">✔️ Registrar Dose Agora</button>
    </div>
  `;

  document.getElementById('ficha-saude-box').innerHTML = `
    <p><strong>Alergias:</strong> ${s.alergias}</p>
    <p><strong>Tipo Sanguíneo:</strong> ${s.tipoSanguineo}</p>
    <p><strong>Vacinas:</strong> ${s.vacinas}</p>
  `;
}

function renderMissoes() {
  const missoes = appState.missoes || [];
  const total = missoes.length;
  const feitas = missoes.filter(m => m.done).length;
  const pct = total > 0 ? Math.round((feitas / total) * 100) : 0;

  // Atualiza barra na visão Adulto
  document.getElementById('adult-duda-progress-text').textContent = `${feitas} de ${total} (${pct}%)`;
  document.getElementById('adult-duda-progress-fill').style.width = `${pct}%`;

  // Atualiza barra na visão Duda
  document.getElementById('duda-counter-text').textContent = `${feitas} de ${total} Missões Feitas!`;
  document.getElementById('duda-progress-fill').style.width = `${pct}%`;

  // Lista na visão Duda (agrupada por turno)
  const turnos = ['Manhã', 'Tarde', 'Noite'];
  const icons = { 'Manhã': '☀️', 'Tarde': '🌤️', 'Noite': '🌙' };
  const dudaContainer = document.getElementById('duda-missoes-container');

  dudaContainer.innerHTML = turnos.map(turno => {
    const doTurno = missoes.map((m, idx) => ({ ...m, idx })).filter(m => m.turno === turno);
    if (doTurno.length === 0) return '';
    return `
      <h3 class="duda-turno-title">${icons[turno]} ${turno}</h3>
      ${doTurno.map(m => `
        <div class="duda-mission-card ${m.done ? 'completed' : ''}" onclick="toggleMissao(${m.idx})">
          <span>${m.titulo}</span>
          <div class="mission-circle">${m.done ? '✓' : ''}</div>
        </div>
      `).join('')}
    `;
  }).join('');

  // Lista na visão Admin
  const adminEl = document.getElementById('admin-missoes-list');
  adminEl.innerHTML = missoes.map((m, idx) => `
    <div class="check-item">
      <span><strong>[${m.turno}]</strong> ${m.titulo} ${m.done ? '✅' : ''}</span>
      <small onclick="deleteMissao(${idx})">🗑️</small>
    </div>
  `).join('');
}

// ============================================================================
// 7. AÇÕES INTERATIVAS
// ============================================================================
function togglePendencia(idx) { appState.pendencias[idx].done = !appState.pendencias[idx].done; saveState(); }
function deletePendencia(idx) { appState.pendencias.splice(idx, 1); saveState(); }
function promptAddCasa() {
  const texto = prompt("Nova pendência da casa:");
  if (texto) { appState.pendencias.push({ id: Date.now(), texto, done: false }); saveState(); }
}

function promptAddMural() {
  const autor = localStorage.getItem('familia_alves_profile') || 'Paulo';
  const texto = prompt("Recado rápido para o mural:");
  if (texto) { appState.mural.unshift({ id: Date.now(), autor, texto }); saveState(); }
}
function deleteMural(idx) { appState.mural.splice(idx, 1); saveState(); }

function swapLogistica() {
  const temp = appState.logistica.leva;
  appState.logistica.leva = appState.logistica.busca.replace('12:00', '07:30');
  appState.logistica.busca = temp.replace('07:30', '12:00');
  saveState();
}

function promptAddAgenda() {
  const categoria = prompt("Categoria (Casal, Casa ou Duda):", "Duda");
  const dia = prompt("Dia da semana (ex: Sex):", "Sex");
  const texto = prompt("Descrição do compromisso:");
  if (categoria && dia && texto) {
    appState.agenda.push({ id: Date.now(), categoria, dia, texto });
    saveState();
  }
}

function toggleMercado(idx) { appState.mercado[idx].done = !appState.mercado[idx].done; saveState(); }
function deleteMercado(idx) { appState.mercado.splice(idx, 1); saveState(); }
function promptAddMercado() {
  const texto = prompt("Item para lista compartilhada:");
  if (texto) { appState.mercado.push({ id: Date.now(), texto, done: false }); saveState(); }
}

function promptSetRemedio() {
  const nome = prompt("Nome do remédio e intervalo (ex: Ibuprofeno 6/6h):", appState.saude.remedioNome);
  if (nome) { appState.saude.remedioNome = nome; saveState(); }
}

function registrarDose() {
  const quem = localStorage.getItem('familia_alves_profile') || 'Paulo';
  const agora = new Date();
  const hora = agora.toTimeString().slice(0, 5);
  appState.saude.ultimaDose = `${hora} (${quem})`;
  saveState();
}

function promptEditFicha() {
  const alergias = prompt("Alergias:", appState.saude.alergias);
  const vacinas = prompt("Status das vacinas:", appState.saude.vacinas);
  if (alergias !== null) appState.saude.alergias = alergias;
  if (vacinas !== null) appState.saude.vacinas = vacinas;
  saveState();
}

function toggleMissao(idx) { appState.missoes[idx].done = !appState.missoes[idx].done; saveState(); }
function deleteMissao(idx) { appState.missoes.splice(idx, 1); saveState(); }
function promptAddMissao() {
  const turno = prompt("Turno (Manhã, Tarde ou Noite):", "Tarde");
  const titulo = prompt("Nome da missão para a Duda:");
  if (turno && titulo) {
    appState.missoes.push({ id: Date.now(), turno, titulo, done: false });
    saveState();
  }
}

// Inicialização
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
initProfile();
