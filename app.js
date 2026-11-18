import "./config.js";

const GRIP_LABELS = {
  overhand: "正手 Overhand",
  underhand: "反手 Underhand",
  mixed: "混合 Mixed"
};

const TIERS = [
  { minMs: 90000, cls: "tier-immortal", label: "IMMORTAL · 非人類領域 (90s+)" },
  { minMs: 60000, cls: "tier-godlike", label: "GODLIKE · 單槓戰神 (60s+)" },
  { minMs: 30000, cls: "tier-overdrive", label: "OVERDRIVE · 極限燃燒 (30s+)" },
  { minMs: 15000, cls: "tier-ignition", label: "IGNITION · 能量點燃 (15s+)" },
  { minMs: 0, cls: "tier-warmup", label: "WARMUP · 鎖定抓槓中" }
];

const ARCADE_RANKS = [
  { minMs: 90000, title: "👑 非人類傳說" },
  { minMs: 60000, title: "⚡ 單槓戰神" },
  { minMs: 30000, title: "🦍 鋼鐵金剛" },
  { minMs: 15000, title: "🐒 猿猴戰士" },
  { minMs: 0, title: "🦥 樹懶學徒" }
];

const LS_KEYS = {
  RECORDS: "iron_bar_records_v1",
  PLAYER_NAME: "iron_bar_player_name",
  PLAYER_WEIGHT: "iron_bar_player_weight",
  PLAYER_GENDER: "iron_bar_player_gender",
  CLIENT_ID: "iron_bar_client_id",
  SOUND: "iron_bar_sound_on",
  BGM: "iron_bar_bgm_on",
  VOICE: "iron_bar_voice_on",
  CLOUD_OVERRIDE: "iron_bar_cloud_override"
};

// ============================================================
// 狀態管理
// ============================================================
const state = {
  records: [],
  phase: "idle", // idle | countdown | hanging
  grip: "overhand",
  activeTab: "pb", // pb | history
  scoreMode: "time", // time | relative
  gripFilter: "all",
  soundEnabled: localStorage.getItem(LS_KEYS.SOUND) !== "false",
  bgmEnabled: localStorage.getItem(LS_KEYS.BGM) !== "false",
  voiceEnabled: localStorage.getItem(LS_KEYS.VOICE) !== "false",
  bgmPlaying: false,
  bgmTimerId: null,
  bgmStep: 0,
  clientId: getOrCreateClientId(),
  supabase: null,
  realtimeChannel: null,
  isCloud: false,
  countdownTimerId: null,
  rafId: null,
  hangStartPerf: 0,
  lastTierCls: "tier-idle",
  wakeLock: null,
  personalPB: 0,
  spokenMilestones: new Set(),
  lastChallengeText: ""
};

// DOM 快取
const el = {
  syncStatusBtn: document.getElementById("sync-status-btn"),
  syncStatusText: document.getElementById("sync-status-text"),
  bgmToggleBtn: document.getElementById("bgm-toggle-btn"),
  bgmIcon: document.getElementById("bgm-icon"),
  bgmLabel: document.getElementById("bgm-label"),
  voiceToggleBtn: document.getElementById("voice-toggle-btn"),
  voiceIcon: document.getElementById("voice-icon"),
  voiceLabel: document.getElementById("voice-label"),
  soundToggleBtn: document.getElementById("sound-toggle-btn"),
  soundIcon: document.getElementById("sound-icon"),
  soundLabel: document.getElementById("sound-label"),

  barStage: document.getElementById("bar-stage"),
  tierName: document.getElementById("tier-name"),
  wakeBadge: document.getElementById("wake-badge"),
  countdownOverlay: document.getElementById("countdown-overlay"),
  countdownNumber: document.getElementById("countdown-number"),
  timerDisplay: document.getElementById("timer-display"),
  overtakeText: document.getElementById("overtake-text"),
  overtakeFill: document.getElementById("overtake-fill"),
  ghostText: document.getElementById("ghost-text"),
  ghostFill: document.getElementById("ghost-fill"),

  playerNameInput: document.getElementById("player-name-input"),
  countdownSelect: document.getElementById("countdown-select"),
  playerWeightInput: document.getElementById("player-weight-input"),
  playerGenderSelect: document.getElementById("player-gender-select"),
  quickPlayersWrap: document.getElementById("quick-players-wrap"),
  quickPlayers: document.getElementById("quick-players"),
  gripPills: document.querySelectorAll(".grip-pill"),
  mainActionBtn: document.getElementById("main-action-btn"),
  mainActionText: document.getElementById("main-action-text"),
  manualOpenBtn: document.getElementById("manual-open-btn"),

  pstatTier: document.getElementById("pstat-tier"),
  pstatTotal: document.getElementById("pstat-total"),
  pstatStreak: document.getElementById("pstat-streak"),
  pstatGripAge: document.getElementById("pstat-gripage"),

  boardStats: document.getElementById("board-stats"),
  refreshBtn: document.getElementById("refresh-btn"),
  podiumGrid: document.getElementById("podium-grid"),
  tabPb: document.getElementById("tab-pb"),
  tabHistory: document.getElementById("tab-history"),
  modeTimeBtn: document.getElementById("mode-time-btn"),
  modeRelativeBtn: document.getElementById("mode-relative-btn"),
  filterPills: document.querySelectorAll(".filter-pill"),
  leaderboardList: document.getElementById("leaderboard-list"),

  resultModal: document.getElementById("result-modal"),
  resultBadge: document.getElementById("result-badge"),
  resultTitle: document.getElementById("result-title"),
  resultTime: document.getElementById("result-time"),
  resultTierPill: document.getElementById("result-tier-pill"),
  resultMeta: document.getElementById("result-meta"),
  resultRankBanner: document.getElementById("result-rank-banner"),
  resultShareBtn: document.getElementById("result-share-btn"),
  resultRetryBtn: document.getElementById("result-retry-btn"),
  resultCloseBtn: document.getElementById("result-close-btn"),
  toast: document.getElementById("toast"),

  manualModal: document.getElementById("manual-modal"),
  manualForm: document.getElementById("manual-form"),
  manualPlayer: document.getElementById("manual-player"),
  manualMin: document.getElementById("manual-min"),
  manualSec: document.getElementById("manual-sec"),
  manualGrip: document.getElementById("manual-grip"),
  manualCloseX: document.getElementById("manual-close-x"),
  manualCancelBtn: document.getElementById("manual-cancel-btn"),

  cloudModal: document.getElementById("cloud-modal"),
  cloudCloseX: document.getElementById("cloud-close-x"),
  cloudCurrentState: document.getElementById("cloud-current-state"),
  cloudForm: document.getElementById("cloud-form"),
  cloudUrlInput: document.getElementById("cloud-url-input"),
  cloudKeyInput: document.getElementById("cloud-key-input"),
  cloudResetBtn: document.getElementById("cloud-reset-btn")
};

// ============================================================
// 工具函式
// ============================================================
function getOrCreateClientId() {
  let id = localStorage.getItem(LS_KEYS.CLIENT_ID);
  if (!id) {
    id = "c_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem(LS_KEYS.CLIENT_ID, id);
  }
  return id;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDuration(ms) {
  const safe = Math.max(0, Math.floor(ms));
  const totalSec = Math.floor(safe / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const centis = Math.floor((safe % 1000) / 10);
  return {
    main: `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`,
    ms: `.${String(centis).padStart(2, "0")}`,
    full: `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(centis).padStart(2, "0")}`
  };
}

function formatDateShort(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${m}/${day} ${hh}:${mm}`;
}

function getArcadeRank(ms) {
  return ARCADE_RANKS.find((r) => ms >= r.minMs) || ARCADE_RANKS[ARCADE_RANKS.length - 1];
}

function estimateGripAge(pbMs) {
  if (!pbMs || pbMs <= 0) return "-- 歲";
  const sec = pbMs / 1000;
  if (sec >= 120) return "18 歲 (巔峰)";
  if (sec >= 90) return "20 歲";
  if (sec >= 60) return "24 歲";
  if (sec >= 45) return "29 歲";
  if (sec >= 30) return "35 歲";
  if (sec >= 15) return "44 歲";
  return "52 歲";
}

function calcRelativeScore(record) {
  const sec = (record.duration_ms || 0) / 1000;
  const w = Number(record.weight_kg);
  if (!w || w <= 0) return sec;
  return sec * (w / 70);
}

let toastTimer = null;
function showToast(msg) {
  el.toast.textContent = msg;
  el.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.toast.hidden = true;
  }, 2400);
}

function speakCue(text) {
  if (!state.voiceEnabled || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-TW";
    u.rate = 1.15;
    u.pitch = 1.05;
    u.volume = 0.95;
    window.speechSynthesis.speak(u);
  } catch {}
}

// ============================================================
// Web Audio API 街機音效 ＋ 138 BPM 熱血沸騰 BGM 引擎
// ============================================================
let audioCtx = null;
let noiseBuffer = null;

function ensureAudio(force = false) {
  if (!force && !state.soundEnabled && !state.bgmEnabled) return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) audioCtx = new Ctx();
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  if (audioCtx && !noiseBuffer) {
    const sr = audioCtx.sampleRate;
    noiseBuffer = audioCtx.createBuffer(1, sr * 0.25, sr);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return audioCtx;
}

function playTone(freq, duration, type = "sine", gainVal = 0.14, delay = 0) {
  if (!state.soundEnabled) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(gainVal, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration);
}

function playTick() {
  playTone(660, 0.12, "triangle", 0.16);
}

function playGo() {
  playTone(880, 0.12, "sawtooth", 0.15, 0);
  playTone(1318.5, 0.28, "triangle", 0.2, 0.08);
}

function playTierUp() {
  playTone(587.33, 0.1, "triangle", 0.12, 0);
  playTone(880, 0.18, "triangle", 0.15, 0.09);
}

function playFinish(isNewPB) {
  if (isNewPB) {
    playTone(523.25, 0.14, "triangle", 0.18, 0);
    playTone(659.25, 0.14, "triangle", 0.18, 0.1);
    playTone(783.99, 0.14, "triangle", 0.18, 0.2);
    playTone(1046.5, 0.35, "sawtooth", 0.16, 0.3);
  } else {
    playTone(523.25, 0.15, "sine", 0.15, 0);
    playTone(659.25, 0.24, "sine", 0.16, 0.12);
  }
}

// 138 BPM 熱血節拍合成器 (E 小調進行：E - C - G - D)
const BGM_BASS_BARS = [82.41, 65.41, 98.0, 73.42]; // E2, C2, G2, D2
const BGM_LEAD_PATTERN = [
  329.63, 0, 392.0, 493.88, 0, 440.0, 392.0, 329.63,
  261.63, 0, 329.63, 392.0, 0, 493.88, 440.0, 392.0
];

function bgmKick(ctx, t) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(145, t);
  osc.frequency.exponentialRampToValueAtTime(42, t + 0.12);
  gain.gain.setValueAtTime(0.32, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.15);
}

function bgmSnare(ctx, t) {
  if (!noiseBuffer) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(1100, t);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.16, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(t);
  src.stop(t + 0.13);
}

function bgmHat(ctx, t, accent = false) {
  if (!noiseBuffer) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(6500, t);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(accent ? 0.08 : 0.04, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(t);
  src.stop(t + 0.05);
}

function bgmBass(ctx, t, freq) {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(freq, t);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(520, t);
  filter.frequency.exponentialRampToValueAtTime(160, t + 0.09);
  gain.gain.setValueAtTime(0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.11);
}

function bgmLead(ctx, t, freq, octaveMult = 1) {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  osc1.type = "sawtooth";
  osc2.type = "square";
  osc1.frequency.setValueAtTime(freq * octaveMult, t);
  osc2.frequency.setValueAtTime(freq * octaveMult * 1.004, t);
  gain.gain.setValueAtTime(0.055, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);
  osc1.start(t);
  osc2.start(t);
  osc1.stop(t + 0.15);
  osc2.stop(t + 0.15);
}

function stepBgm() {
  if (!state.bgmPlaying || !state.bgmEnabled) return;
  const ctx = ensureAudio(true);
  if (!ctx) return;
  const t = ctx.currentTime + 0.015;
  const step = state.bgmStep % 64;
  const stepInBar = step % 16;
  const barIdx = Math.floor(step / 16);
  const bassRoot = BGM_BASS_BARS[barIdx];
  const isIntense = state.phase === "hanging";
  const isOverdrive =
    state.lastTierCls === "tier-overdrive" ||
    state.lastTierCls === "tier-godlike" ||
    state.lastTierCls === "tier-immortal";

  // 強勁四四拍大鼓
  if (stepInBar % 4 === 0 || (barIdx === 3 && stepInBar === 14)) {
    bgmKick(ctx, t);
  }
  // 反拍軍鼓
  if (stepInBar === 4 || stepInBar === 12) {
    bgmSnare(ctx, t);
  }
  // 踩鈸（懸吊進入高潮時加密成 16 分音符）
  if (isIntense || stepInBar % 2 === 0) {
    bgmHat(ctx, t, stepInBar % 4 === 2);
  }
  // 滾動電音貝斯（八度跳動）
  const bassFreq = stepInBar % 2 === 1 ? bassRoot * 2 : bassRoot;
  bgmBass(ctx, t, bassFreq);

  // 熱血主旋律（懸吊中或高階時升八度燃燒）
  const leadFreq = BGM_LEAD_PATTERN[stepInBar];
  if (leadFreq > 0 && (isIntense || state.phase === "idle")) {
    bgmLead(ctx, t, leadFreq, isOverdrive ? 2 : 1);
  }
  state.bgmStep += 1;
}

function startBgm() {
  if (!state.bgmEnabled || state.bgmPlaying) return;
  ensureAudio(true);
  state.bgmPlaying = true;
  state.bgmStep = 0;
  // 138 BPM 16分音符約 108.7ms
  state.bgmTimerId = setInterval(stepBgm, 109);
  updateBgmUI();
}

function stopBgm() {
  state.bgmPlaying = false;
  if (state.bgmTimerId) {
    clearInterval(state.bgmTimerId);
    state.bgmTimerId = null;
  }
  updateBgmUI();
}

function updateBgmUI() {
  const on = state.bgmEnabled;
  el.bgmToggleBtn.classList.toggle("bgm-on", on && state.bgmPlaying);
  el.bgmToggleBtn.setAttribute("aria-pressed", String(on));
  el.bgmIcon.textContent = on ? (state.bgmPlaying ? "🔥" : "🎵") : "🔇";
  el.bgmLabel.textContent = on ? (state.bgmPlaying ? "熱血燃燒中" : "熱血音樂開") : "音樂關閉";
}

// ============================================================
// 背景動態粒子 & 勝利煙火特效畫布
// ============================================================
const bgCanvas = document.getElementById("bg-particles");
const bgCtx = bgCanvas.getContext("2d");
const fxCanvas = document.getElementById("fx-canvas");
const fxCtx = fxCanvas.getContext("2d");

let bgDots = [];
let confettiPieces = [];

function resizeCanvases() {
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;
  fxCanvas.width = window.innerWidth;
  fxCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvases);
resizeCanvases();

function initBgParticles() {
  const count = Math.min(55, Math.floor(window.innerWidth / 24));
  bgDots = Array.from({ length: count }, () => ({
    x: Math.random() * bgCanvas.width,
    y: Math.random() * bgCanvas.height,
    r: Math.random() * 2.2 + 0.8,
    vy: -(Math.random() * 0.6 + 0.25),
    alpha: Math.random() * 0.55 + 0.15,
    hue: Math.random() > 0.5 ? "0, 245, 255" : "255, 0, 127"
  }));
}
initBgParticles();

function spawnConfetti(count = 90) {
  const colors = ["#00f5ff", "#ff007f", "#fbbf24", "#39ff14", "#c084fc", "#ffffff"];
  const originX = fxCanvas.width / 2;
  const originY = fxCanvas.height * 0.42;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 9 + 3;
    confettiPieces.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3.5,
      size: Math.random() * 7 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1,
      rot: Math.random() * Math.PI,
      vRot: (Math.random() - 0.5) * 0.22
    });
  }
}

function animateCanvases() {
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
  const speedMultiplier = state.phase === "hanging" ? 3.2 : 1;
  for (const d of bgDots) {
    d.y += d.vy * speedMultiplier;
    if (d.y < -10) {
      d.y = bgCanvas.height + 10;
      d.x = Math.random() * bgCanvas.width;
    }
    bgCtx.beginPath();
    bgCtx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    bgCtx.fillStyle = `rgba(${d.hue}, ${d.alpha})`;
    bgCtx.fill();
  }

  if (confettiPieces.length > 0) {
    fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
    confettiPieces = confettiPieces.filter((p) => p.life > 0.02);
    for (const p of confettiPieces) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22;
      p.rot += p.vRot;
      p.life -= 0.014;
      fxCtx.save();
      fxCtx.translate(p.x, p.y);
      fxCtx.rotate(p.rot);
      fxCtx.globalAlpha = p.life;
      fxCtx.fillStyle = p.color;
      fxCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      fxCtx.restore();
    }
  } else {
    fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
  }
  requestAnimationFrame(animateCanvases);
}
requestAnimationFrame(animateCanvases);

// ============================================================
// Supabase / 本地資料存取層
// ============================================================
function getEffectiveCloudConfig() {
  try {
    const override = JSON.parse(localStorage.getItem(LS_KEYS.CLOUD_OVERRIDE) || "null");
    if (override && override.url && override.key) {
      return { url: override.url.trim(), key: override.key.trim() };
    }
  } catch {}
  const cfg = window.ARENA_CONFIG || {};
  if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY) {
    return { url: cfg.SUPABASE_URL.trim(), key: cfg.SUPABASE_ANON_KEY.trim() };
  }
  return null;
}

function getDemoRecords() {
  const now = Date.now();
  return [
    {
      id: "demo-1",
      player_name: "鋼鐵阿豪",
      duration_ms: 82450,
      grip_type: "overhand",
      weight_kg: 76,
      gender: "male",
      client_id: "demo",
      is_manual: false,
      created_at: new Date(now - 3600000 * 6).toISOString()
    },
    {
      id: "demo-2",
      player_name: "霓虹小雪",
      duration_ms: 64120,
      grip_type: "underhand",
      weight_kg: 54,
      gender: "female",
      client_id: "demo",
      is_manual: false,
      created_at: new Date(now - 3600000 * 4).toISOString()
    },
    {
      id: "demo-3",
      player_name: "閃電凱文",
      duration_ms: 48900,
      grip_type: "mixed",
      weight_kg: 82,
      gender: "male",
      client_id: "demo",
      is_manual: false,
      created_at: new Date(now - 3600000 * 2).toISOString()
    }
  ];
}

function loadLocalRecords() {
  try {
    const raw = localStorage.getItem(LS_KEYS.RECORDS);
    if (!raw) {
      const seed = getDemoRecords();
      localStorage.setItem(LS_KEYS.RECORDS, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw);
  } catch {
    return getDemoRecords();
  }
}

function saveLocalRecords(list) {
  localStorage.setItem(LS_KEYS.RECORDS, JSON.stringify(list));
}

async function initBackend() {
  const cloud = getEffectiveCloudConfig();
  if (state.realtimeChannel && state.supabase) {
    try {
      await state.supabase.removeChannel(state.realtimeChannel);
    } catch {}
    state.realtimeChannel = null;
  }

  if (!cloud) {
    state.supabase = null;
    state.isCloud = false;
    updateSyncStatusUI(false);
    state.records = loadLocalRecords();
    renderAll();
    return;
  }

  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    state.supabase = createClient(cloud.url, cloud.key);
    state.isCloud = true;
    updateSyncStatusUI(true);
    await fetchRecords();

    state.realtimeChannel = state.supabase
      .channel("hang-records-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hang_records" },
        () => {
          fetchRecords();
        }
      )
      .subscribe();
  } catch (err) {
    console.error("Supabase 連線失敗，退回本地模式:", err);
    state.supabase = null;
    state.isCloud = false;
    updateSyncStatusUI(false, "雲端連線失敗，已切換本地");
    state.records = loadLocalRecords();
    renderAll();
  }
}

function updateSyncStatusUI(isCloud, customText = "") {
  el.syncStatusBtn.classList.toggle("status-cloud", isCloud);
  el.syncStatusBtn.classList.toggle("status-local", !isCloud);
  el.syncStatusText.textContent = customText || (isCloud ? "雲端即時連線中" : "本地展示模式");
  el.cloudCurrentState.textContent = isCloud
    ? "✅ 目前已連線至 Supabase 雲端資料庫，所有裝置即時同步中！"
    : "⚠️ 目前為「本地展示模式」，成績僅儲存在此裝置瀏覽器。設定 Supabase 後即可跨裝置即時排行！";
}

async function fetchRecords() {
  if (state.isCloud && state.supabase) {
    const { data, error } = await state.supabase
      .from("hang_records")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);

    if (error) {
      console.error("讀取 Supabase 失敗:", error);
      return;
    }
    state.records = data || [];
  } else {
    state.records = loadLocalRecords();
  }
  renderAll();
}

async function insertRecord(payload) {
  if (state.isCloud && state.supabase) {
    let res = await state.supabase.from("hang_records").insert([payload]).select().single();
    if (res.error && (res.error.message || "").includes("column")) {
      // 相容 1.0 舊資料表：移除新欄位後重試
      const { weight_kg, gender, ...legacyPayload } = payload;
      res = await state.supabase.from("hang_records").insert([legacyPayload]).select().single();
    }
    if (res.error) throw res.error;
    state.records.unshift(res.data);
    renderAll();
    return res.data;
  } else {
    const item = {
      id: "loc_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      ...payload,
      created_at: new Date().toISOString()
    };
    state.records.unshift(item);
    saveLocalRecords(state.records);
    renderAll();
    return item;
  }
}

async function deleteRecord(id) {
  if (state.isCloud && state.supabase) {
    const { error } = await state.supabase.from("hang_records").delete().eq("id", id);
    if (error) {
      alert("刪除失敗：" + error.message);
      return;
    }
    state.records = state.records.filter((r) => r.id !== id);
  } else {
    state.records = state.records.filter((r) => r.id !== id);
    saveLocalRecords(state.records);
  }
  renderAll();
}

// ============================================================
// 排行榜計算與渲染
// ============================================================
function getFilteredRecords() {
  if (state.gripFilter === "all") return state.records;
  return state.records.filter((r) => r.grip_type === state.gripFilter);
}

function buildPBLeaderboard(recordsList, mode = state.scoreMode) {
  const bestByPlayer = new Map();
  for (const r of recordsList) {
    const key = r.player_name.trim().toLowerCase();
    const scoreVal = mode === "relative" ? calcRelativeScore(r) : r.duration_ms;
    const existing = bestByPlayer.get(key);
    if (!existing) {
      bestByPlayer.set(key, { ...r, attempts: 1, _sortScore: scoreVal });
    } else {
      existing.attempts += 1;
      if (scoreVal > existing._sortScore) {
        bestByPlayer.set(key, { ...r, attempts: existing.attempts, _sortScore: scoreVal });
      }
    }
  }
  return Array.from(bestByPlayer.values()).sort((a, b) => b._sortScore - a._sortScore);
}

function calcStreakDays(playerRecords) {
  if (playerRecords.length === 0) return 0;
  const daySet = new Set(
    playerRecords.map((r) => {
      const d = new Date(r.created_at);
      return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    })
  );
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 365; i++) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth() + 1}-${cursor.getDate()}`;
    if (daySet.has(key)) {
      streak += 1;
    } else if (i > 0) {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function renderPersonalStats() {
  const name = el.playerNameInput.value.trim().toLowerCase();
  const mine = name
    ? state.records.filter((r) => r.player_name.trim().toLowerCase() === name)
    : [];

  if (mine.length === 0) {
    state.personalPB = 0;
    el.pstatTier.textContent = "🦥 樹懶學徒";
    el.pstatTotal.textContent = "0.0s";
    el.pstatStreak.textContent = "0 天";
    el.pstatGripAge.textContent = "-- 歲";
    if (state.phase === "idle") {
      el.ghostText.textContent = "👻 Ghost 對戰：完成一次挑戰後自動開啟";
      el.ghostFill.style.width = "0%";
    }
    return;
  }

  const pbMs = mine.reduce((m, r) => Math.max(m, r.duration_ms), 0);
  const totalSec = mine.reduce((sum, r) => sum + r.duration_ms / 1000, 0);
  state.personalPB = pbMs;

  el.pstatTier.textContent = getArcadeRank(pbMs).title;
  el.pstatTotal.textContent = `${totalSec.toFixed(1)}s`;
  el.pstatStreak.textContent = `${calcStreakDays(mine)} 天`;
  el.pstatGripAge.textContent = estimateGripAge(pbMs);
  if (state.phase === "idle") {
    el.ghostText.textContent = `👻 Ghost 目標：你的 PB ${formatDuration(pbMs).full}`;
    el.ghostFill.style.width = "0%";
  }
}

function renderAll() {
  renderQuickPlayers();
  renderPersonalStats();
  renderPodium();
  renderLeaderboardList();
}

function renderQuickPlayers() {
  const names = [];
  const seen = new Set();
  for (const r of state.records) {
    const n = r.player_name.trim();
    const k = n.toLowerCase();
    if (!seen.has(k) && r.client_id !== "demo") {
      seen.add(k);
      names.push(n);
    }
  }
  if (names.length === 0) {
    for (const r of state.records) {
      const n = r.player_name.trim();
      const k = n.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        names.push(n);
      }
    }
  }

  if (names.length === 0) {
    el.quickPlayersWrap.hidden = true;
    return;
  }
  el.quickPlayersWrap.hidden = false;
  const current = el.playerNameInput.value.trim().toLowerCase();
  el.quickPlayers.innerHTML = names
    .slice(0, 10)
    .map(
      (n) =>
        `<button type="button" class="quick-chip ${n.toLowerCase() === current ? "active" : ""}" data-name="${escapeHtml(n)}">${escapeHtml(n)}</button>`
    )
    .join("");
}

function renderPodium() {
  const pbList = buildPBLeaderboard(getFilteredRecords(), state.scoreMode);
  const totalCount = getFilteredRecords().length;
  const modeLabel = state.scoreMode === "relative" ? " · 體重相對強度榜 (70kg基準)" : "";
  el.boardStats.textContent = `共 ${pbList.length} 位選手 · ${totalCount} 筆挑戰紀錄${modeLabel}`;

  if (pbList.length === 0) {
    el.podiumGrid.innerHTML = "";
    return;
  }

  const medals = ["👑", "🥈", "🥉"];
  const top3 = [0, 1, 2].map((idx) => {
    const item = pbList[idx];
    if (!item) {
      return `
        <div class="podium-card rank-${idx + 1}">
          <div class="podium-medal">${medals[idx]}</div>
          <div class="podium-name">虛位以待</div>
          <div class="podium-time">--:--.--</div>
          <div class="podium-grip">等待挑戰者</div>
        </div>`;
    }
    const scoreStr =
      state.scoreMode === "relative"
        ? `強度 ${calcRelativeScore(item).toFixed(1)}`
        : formatDuration(item.duration_ms).full;
    const subStr =
      state.scoreMode === "relative"
        ? `${formatDuration(item.duration_ms).full}${item.weight_kg ? ` · ${item.weight_kg}kg` : ""}`
        : `${getArcadeRank(item.duration_ms).title}`;
    return `
      <div class="podium-card rank-${idx + 1}">
        <div class="podium-medal">${medals[idx]}</div>
        <div class="podium-name">${escapeHtml(item.player_name)}</div>
        <div class="podium-time">${scoreStr}</div>
        <div class="podium-grip">${subStr}</div>
      </div>`;
  });

  el.podiumGrid.innerHTML = top3.join("");
}

function renderLeaderboardList() {
  const filtered = getFilteredRecords();
  const currentPlayer = el.playerNameInput.value.trim().toLowerCase();

  if (filtered.length === 0) {
    el.leaderboardList.innerHTML = `<div class="empty-state">目前還沒有符合條件的紀錄，快上槓搶下頭香！</div>`;
    return;
  }

  if (state.activeTab === "pb") {
    const pbList = buildPBLeaderboard(filtered, state.scoreMode);
    el.leaderboardList.innerHTML = pbList
      .map((item, i) => {
        const rank = i + 1;
        const topCls = rank <= 3 ? `top-${rank}` : "";
        const isMe = currentPlayer && item.player_name.trim().toLowerCase() === currentPlayer;
        const tierTitle = getArcadeRank(item.duration_ms).title;
        const rightScore =
          state.scoreMode === "relative"
            ? `${calcRelativeScore(item).toFixed(1)} <small style="font-size:11px;color:#94a3b8">(${formatDuration(item.duration_ms).full})</small>`
            : formatDuration(item.duration_ms).full;
        return `
          <div class="rank-row ${isMe ? "is-me" : ""}">
            <div class="rank-left">
              <div class="rank-num ${topCls}">#${rank}</div>
              <div class="rank-info">
                <div class="rank-name">${escapeHtml(item.player_name)}<span class="rank-tier-tag">${tierTitle}</span></div>
                <div class="rank-meta">
                  <span>${GRIP_LABELS[item.grip_type] || item.grip_type}</span>
                  ${item.weight_kg ? `<span>${item.weight_kg}kg</span>` : ""}
                  <span>挑戰 ${item.attempts} 次</span>
                  <span>${formatDateShort(item.created_at)}</span>
                </div>
              </div>
            </div>
            <div class="rank-right">
              <div class="rank-score">${rightScore}</div>
            </div>
          </div>`;
      })
      .join("");
  } else {
    const sorted = [...filtered].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    el.leaderboardList.innerHTML = sorted
      .map((item, i) => {
        const canDelete = !state.isCloud || item.client_id === state.clientId;
        const isMe = item.client_id === state.clientId;
        return `
          <div class="rank-row ${isMe ? "is-me" : ""}">
            <div class="rank-left">
              <div class="rank-num">${i + 1}</div>
              <div class="rank-info">
                <div class="rank-name">${escapeHtml(item.player_name)}${item.is_manual ? " ✍️" : ""}</div>
                <div class="rank-meta">
                  <span>${GRIP_LABELS[item.grip_type] || item.grip_type}</span>
                  <span>${formatDateShort(item.created_at)}</span>
                </div>
              </div>
            </div>
            <div class="rank-right">
              <div class="rank-score">${formatDuration(item.duration_ms).full}</div>
              ${canDelete ? `<button class="del-btn" data-del-id="${escapeHtml(item.id)}" type="button">刪除</button>` : ""}
            </div>
          </div>`;
      })
      .join("");
  }
}

// ============================================================
// 計時器、Wake Lock 與即時超車進度
// ============================================================
async function requestWakeLock() {
  if (!("wakeLock" in navigator)) return;
  try {
    state.wakeLock = await navigator.wakeLock.request("screen");
    el.wakeBadge.hidden = false;
  } catch {}
}

async function releaseWakeLock() {
  if (state.wakeLock) {
    try {
      await state.wakeLock.release();
    } catch {}
    state.wakeLock = null;
  }
  el.wakeBadge.hidden = true;
}

function setStageState(phase) {
  state.phase = phase;
  el.barStage.classList.remove("state-idle", "state-countdown", "state-hanging");
  el.barStage.classList.add(`state-${phase}`);
  document.body.classList.toggle("combat-mode", phase !== "idle");

  el.mainActionBtn.classList.remove("btn-start", "btn-stop", "btn-cancel");
  if (phase === "idle") {
    el.mainActionBtn.classList.add("btn-start");
    el.mainActionText.textContent = "開始挑戰";
    el.mainActionBtn.querySelector(".btn-icon").textContent = "⚡";
    el.countdownOverlay.hidden = true;
    applyTier(0, true);
  } else if (phase === "countdown") {
    el.mainActionBtn.classList.add("btn-cancel");
    el.mainActionText.textContent = "取消倒數";
    el.mainActionBtn.querySelector(".btn-icon").textContent = "✕";
    el.countdownOverlay.hidden = false;
  } else if (phase === "hanging") {
    el.mainActionBtn.classList.add("btn-stop");
    el.mainActionText.textContent = "落地停止 (STOP)";
    el.mainActionBtn.querySelector(".btn-icon").textContent = "🛑";
    el.countdownOverlay.hidden = true;
  }
}

function applyTier(elapsedMs, isIdle = false) {
  if (isIdle) {
    document.body.classList.remove("tier-warmup", "tier-ignition", "tier-overdrive", "tier-godlike", "tier-immortal");
    document.body.classList.add("tier-idle");
    state.lastTierCls = "tier-idle";
    el.tierName.textContent = "READY TO HANG";
    return;
  }
  const tier = TIERS.find((t) => elapsedMs >= t.minMs) || TIERS[TIERS.length - 1];
  if (tier.cls !== state.lastTierCls) {
    if (state.lastTierCls !== "tier-idle" && state.lastTierCls !== "tier-warmup") {
      playTierUp();
    }
    document.body.classList.remove("tier-idle", "tier-warmup", "tier-ignition", "tier-overdrive", "tier-godlike", "tier-immortal");
    document.body.classList.add(tier.cls);
    state.lastTierCls = tier.cls;
    el.tierName.textContent = tier.label;
  }
}

function updateGhostBar(elapsedMs) {
  const pb = state.personalPB;
  if (!pb || pb <= 0) {
    el.ghostText.textContent = "👻 Ghost 對戰：創造你的第一個個人紀錄！";
    el.ghostFill.style.width = "100%";
    return;
  }
  if (elapsedMs >= pb) {
    const ahead = ((elapsedMs - pb) / 1000).toFixed(1);
    el.ghostText.textContent = `🔥 已超越自己的 PB (${formatDuration(pb).full}) +${ahead}s！`;
    el.ghostFill.style.width = "100%";
  } else {
    const left = ((pb - elapsedMs) / 1000).toFixed(1);
    const pct = Math.min(100, Math.max(2, (elapsedMs / pb) * 100));
    el.ghostText.textContent = `👻 Ghost 對戰 PB (${formatDuration(pb).full}) · 還差 ${left}s`;
    el.ghostFill.style.width = `${pct}%`;
  }
}

function checkVoiceMilestones(elapsedMs) {
  const sec = Math.floor(elapsedMs / 1000);
  if (sec >= 15 && !state.spokenMilestones.has("15s")) {
    state.spokenMilestones.add("15s");
    speakCue("撐住！已經 15 秒了！");
  } else if (sec >= 30 && !state.spokenMilestones.has("30s")) {
    state.spokenMilestones.add("30s");
    speakCue("30 秒！進入極限燃燒！");
  } else if (sec >= 45 && !state.spokenMilestones.has("45s")) {
    state.spokenMilestones.add("45s");
    speakCue("45 秒！繼續咬緊牙關！");
  } else if (sec >= 60 && !state.spokenMilestones.has("60s")) {
    state.spokenMilestones.add("60s");
    speakCue("60 秒！單槓戰神誕生！");
  } else if (sec >= 90 && !state.spokenMilestones.has("90s")) {
    state.spokenMilestones.add("90s");
    speakCue("90 秒！進入非人類傳說領域！");
  }

  if (state.personalPB > 5000) {
    const diff = state.personalPB - elapsedMs;
    if (diff > 0 && diff <= 3000 && !state.spokenMilestones.has("pb_near")) {
      state.spokenMilestones.add("pb_near");
      speakCue("還差 3 秒就破個人紀錄！撐住！");
    } else if (elapsedMs >= state.personalPB && !state.spokenMilestones.has("pb_beat")) {
      state.spokenMilestones.add("pb_beat");
      speakCue("太強了！個人新紀錄達成！");
    }
  }
}

function updateOvertakeBar(elapsedMs) {
  const pbList = buildPBLeaderboard(state.records, "time");
  if (pbList.length === 0) {
    el.overtakeText.textContent = "你是首位挑戰者，全力撐住寫下第一筆紀錄！";
    el.overtakeFill.style.width = "100%";
    return;
  }
  let target = null;
  let targetRank = pbList.length;
  for (let i = pbList.length - 1; i >= 0; i--) {
    if (pbList[i].duration_ms > elapsedMs) {
      target = pbList[i];
      targetRank = i + 1;
      break;
    }
  }
  if (!target) {
    el.overtakeText.textContent = "👑 已超越全場所有選手！創造全新傳奇紀錄中！";
    el.overtakeFill.style.width = "100%";
  } else {
    const diffSec = ((target.duration_ms - elapsedMs) / 1000).toFixed(1);
    const pct = Math.min(100, Math.max(3, (elapsedMs / target.duration_ms) * 100));
    el.overtakeText.textContent = `目標超越 #${targetRank} ${target.player_name} (${formatDuration(target.duration_ms).full}) · 還差 ${diffSec}s`;
    el.overtakeFill.style.width = `${pct}%`;
  }
}

function startChallenge() {
  const name = el.playerNameInput.value.trim();
  if (!name) {
    el.playerNameInput.focus();
    el.overtakeText.textContent = "⚠️ 請先輸入你的選手暱稱再開始！";
    return;
  }
  localStorage.setItem(LS_KEYS.PLAYER_NAME, name);
  if (el.playerWeightInput.value) localStorage.setItem(LS_KEYS.PLAYER_WEIGHT, el.playerWeightInput.value);
  localStorage.setItem(LS_KEYS.PLAYER_GENDER, el.playerGenderSelect.value);

  state.spokenMilestones = new Set();
  ensureAudio();
  if (state.bgmEnabled && !state.bgmPlaying) {
    startBgm();
  }
  requestWakeLock();

  const countdownSec = Number(el.countdownSelect.value) || 0;
  if (countdownSec <= 0) {
    beginHangTimer();
    return;
  }

  setStageState("countdown");
  let left = countdownSec;
  el.countdownNumber.textContent = left;
  playTick();
  speakCue(`準備上槓，${left}`);

  state.countdownTimerId = setInterval(() => {
    left -= 1;
    if (left > 0) {
      el.countdownNumber.textContent = left;
      playTick();
      if (left <= 3) speakCue(String(left));
    } else {
      clearInterval(state.countdownTimerId);
      state.countdownTimerId = null;
      beginHangTimer();
    }
  }, 1000);
}

function cancelCountdown() {
  if (state.countdownTimerId) {
    clearInterval(state.countdownTimerId);
    state.countdownTimerId = null;
  }
  releaseWakeLock();
  setStageState("idle");
}

function beginHangTimer() {
  playGo();
  speakCue("開始！");
  setStageState("hanging");
  state.hangStartPerf = performance.now();

  const loop = () => {
    if (state.phase !== "hanging") return;
    const elapsed = performance.now() - state.hangStartPerf;
    const fmt = formatDuration(elapsed);
    el.timerDisplay.innerHTML = `${fmt.main}<span class="ms">${fmt.ms}</span>`;
    applyTier(elapsed, false);
    updateOvertakeBar(elapsed);
    updateGhostBar(elapsed);
    checkVoiceMilestones(elapsed);
    state.rafId = requestAnimationFrame(loop);
  };
  state.rafId = requestAnimationFrame(loop);
}

async function stopAndSaveHang() {
  if (state.phase !== "hanging") return;
  const elapsedMs = Math.max(100, Math.round(performance.now() - state.hangStartPerf));
  if (state.rafId) {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }
  releaseWakeLock();
  setStageState("idle");

  const playerName = el.playerNameInput.value.trim() || "無名挑戰者";
  await saveAndCelebrate(playerName, elapsedMs, state.grip, false);
}

async function saveAndCelebrate(playerName, durationMs, gripType, isManual) {
  const prevPB = state.records
    .filter((r) => r.player_name.trim().toLowerCase() === playerName.trim().toLowerCase())
    .reduce((max, r) => Math.max(max, r.duration_ms), 0);

  const isNewPB = durationMs > prevPB;
  const weightVal = Number(el.playerWeightInput.value);
  const weightKg = weightVal >= 25 && weightVal <= 250 ? weightVal : null;
  const genderVal = el.playerGenderSelect.value || "unspecified";

  try {
    await insertRecord({
      player_name: playerName.trim(),
      duration_ms: durationMs,
      grip_type: gripType,
      weight_kg: weightKg,
      gender: genderVal,
      client_id: state.clientId,
      is_manual: isManual
    });
  } catch (err) {
    alert("儲存成績至雲端失敗：" + (err.message || err));
    return;
  }

  const pbList = buildPBLeaderboard(state.records, "time");
  const rankIdx = pbList.findIndex(
    (r) => r.player_name.trim().toLowerCase() === playerName.trim().toLowerCase()
  );
  const rankTier = getArcadeRank(durationMs).title;
  const fmtFull = formatDuration(durationMs).full;

  playFinish(isNewPB);
  spawnConfetti(isNewPB ? 120 : 55);
  speakCue(isNewPB ? `恭喜突破個人紀錄！${(durationMs / 1000).toFixed(1)} 秒！` : `挑戰完成，${(durationMs / 1000).toFixed(1)} 秒！`);

  el.resultBadge.textContent = isNewPB ? "🔥 NEW PERSONAL BEST!" : "CHALLENGE COMPLETE";
  el.resultTitle.textContent = isNewPB ? "個人紀錄突破！" : "挑戰完成！";
  el.resultTime.textContent = fmtFull;
  el.resultTierPill.textContent = rankTier;
  el.resultMeta.textContent = `${playerName} · ${GRIP_LABELS[gripType] || gripType}${weightKg ? ` · ${weightKg}kg` : ""}`;
  el.resultRankBanner.textContent =
    rankIdx >= 0 ? `🏆 目前總排名第 ${rankIdx + 1} 名！` : "已記錄至挑戰歷史！";

  state.lastChallengeText = `🔥【IRON BAR ARENA 單槓持久戰】\n我在單槓撐了 ${fmtFull}！\n解鎖段位：${rankTier}${rankIdx >= 0 ? `\n目前總排名：第 ${rankIdx + 1} 名` : ""}\n敢來挑戰我的紀錄嗎？👇\n${window.location.href}`;

  el.resultModal.hidden = false;
}

// ============================================================
// 事件綁定
// ============================================================
el.mainActionBtn.addEventListener("click", () => {
  if (state.phase === "idle") startChallenge();
  else if (state.phase === "countdown") cancelCountdown();
  else if (state.phase === "hanging") stopAndSaveHang();
});

el.bgmToggleBtn.addEventListener("click", () => {
  if (!state.bgmEnabled) {
    state.bgmEnabled = true;
    localStorage.setItem(LS_KEYS.BGM, "true");
    startBgm();
  } else if (!state.bgmPlaying) {
    startBgm();
  } else {
    state.bgmEnabled = false;
    localStorage.setItem(LS_KEYS.BGM, "false");
    stopBgm();
  }
});

el.voiceToggleBtn.addEventListener("click", () => {
  state.voiceEnabled = !state.voiceEnabled;
  localStorage.setItem(LS_KEYS.VOICE, String(state.voiceEnabled));
  el.voiceIcon.textContent = state.voiceEnabled ? "🗣️" : "🔇";
  el.voiceLabel.textContent = state.voiceEnabled ? "語音播報開" : "語音關閉";
  el.voiceToggleBtn.setAttribute("aria-pressed", String(state.voiceEnabled));
  if (state.voiceEnabled) speakCue("語音播報已開啟！");
});

el.soundToggleBtn.addEventListener("click", () => {
  state.soundEnabled = !state.soundEnabled;
  localStorage.setItem(LS_KEYS.SOUND, String(state.soundEnabled));
  el.soundIcon.textContent = state.soundEnabled ? "🔊" : "🔇";
  el.soundLabel.textContent = state.soundEnabled ? "音效開啟" : "靜音中";
  el.soundToggleBtn.setAttribute("aria-pressed", String(state.soundEnabled));
});

el.gripPills.forEach((btn) => {
  btn.addEventListener("click", () => {
    el.gripPills.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.grip = btn.dataset.grip;
  });
});

el.quickPlayers.addEventListener("click", (e) => {
  const chip = e.target.closest(".quick-chip");
  if (!chip) return;
  el.playerNameInput.value = chip.dataset.name;
  localStorage.setItem(LS_KEYS.PLAYER_NAME, chip.dataset.name);
  renderQuickPlayers();
  renderPersonalStats();
  renderLeaderboardList();
});

el.playerNameInput.addEventListener("input", () => {
  renderQuickPlayers();
  renderPersonalStats();
  renderLeaderboardList();
});

el.modeTimeBtn.addEventListener("click", () => {
  state.scoreMode = "time";
  el.modeTimeBtn.classList.add("active");
  el.modeRelativeBtn.classList.remove("active");
  renderPodium();
  renderLeaderboardList();
});

el.modeRelativeBtn.addEventListener("click", () => {
  state.scoreMode = "relative";
  el.modeRelativeBtn.classList.add("active");
  el.modeTimeBtn.classList.remove("active");
  renderPodium();
  renderLeaderboardList();
});

el.tabPb.addEventListener("click", () => {
  state.activeTab = "pb";
  el.tabPb.classList.add("active");
  el.tabHistory.classList.remove("active");
  renderLeaderboardList();
});

el.tabHistory.addEventListener("click", () => {
  state.activeTab = "history";
  el.tabHistory.classList.add("active");
  el.tabPb.classList.remove("active");
  renderLeaderboardList();
});

el.filterPills.forEach((btn) => {
  btn.addEventListener("click", () => {
    el.filterPills.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.gripFilter = btn.dataset.filter;
    renderPodium();
    renderLeaderboardList();
  });
});

el.leaderboardList.addEventListener("click", async (e) => {
  const delBtn = e.target.closest("[data-del-id]");
  if (!delBtn) return;
  const id = delBtn.dataset.delId;
  if (confirm("確定要刪除這筆紀錄嗎？")) {
    await deleteRecord(id);
  }
});

el.refreshBtn.addEventListener("click", () => {
  fetchRecords();
});

// 完賽彈窗
el.resultShareBtn.addEventListener("click", async () => {
  if (!state.lastChallengeText) return;
  try {
    await navigator.clipboard.writeText(state.lastChallengeText);
    showToast("✅ 已複製挑釁戰書！快貼到 LINE / IG 約戰！");
  } catch {
    prompt("請手動複製下方戰書：", state.lastChallengeText);
  }
});
el.resultCloseBtn.addEventListener("click", () => {
  el.resultModal.hidden = true;
});
el.resultRetryBtn.addEventListener("click", () => {
  el.resultModal.hidden = true;
  startChallenge();
});

// 手動補登彈窗
el.manualOpenBtn.addEventListener("click", () => {
  el.manualPlayer.value = el.playerNameInput.value.trim();
  el.manualGrip.value = state.grip;
  el.manualModal.hidden = false;
});
el.manualCloseX.addEventListener("click", () => (el.manualModal.hidden = true));
el.manualCancelBtn.addEventListener("click", () => (el.manualModal.hidden = true));
el.manualForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = el.manualPlayer.value.trim();
  const mins = Math.max(0, Number(el.manualMin.value) || 0);
  const secs = Math.max(0, Number(el.manualSec.value) || 0);
  const totalMs = Math.round((mins * 60 + secs) * 1000);
  if (!name || totalMs <= 0) {
    alert("請輸入正確的選手名稱與大於 0 的時間！");
    return;
  }
  el.manualModal.hidden = true;
  el.playerNameInput.value = name;
  localStorage.setItem(LS_KEYS.PLAYER_NAME, name);
  await saveAndCelebrate(name, totalMs, el.manualGrip.value, true);
});

// 雲端設定彈窗
el.syncStatusBtn.addEventListener("click", () => {
  const cloud = getEffectiveCloudConfig();
  el.cloudUrlInput.value = cloud ? cloud.url : "";
  el.cloudKeyInput.value = cloud ? cloud.key : "";
  el.cloudModal.hidden = false;
});
el.cloudCloseX.addEventListener("click", () => (el.cloudModal.hidden = true));
el.cloudForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = el.cloudUrlInput.value.trim();
  const key = el.cloudKeyInput.value.trim();
  if (!url || !key) {
    alert("請同時填入 Supabase Project URL 與 Anon Key");
    return;
  }
  localStorage.setItem(LS_KEYS.CLOUD_OVERRIDE, JSON.stringify({ url, key }));
  el.cloudModal.hidden = true;
  await initBackend();
});
el.cloudResetBtn.addEventListener("click", async () => {
  localStorage.removeItem(LS_KEYS.CLOUD_OVERRIDE);
  el.cloudModal.hidden = true;
  await initBackend();
});

// 初始化啟動
(function bootstrap() {
  const savedName = localStorage.getItem(LS_KEYS.PLAYER_NAME);
  if (savedName) el.playerNameInput.value = savedName;
  const savedWeight = localStorage.getItem(LS_KEYS.PLAYER_WEIGHT);
  if (savedWeight) el.playerWeightInput.value = savedWeight;
  const savedGender = localStorage.getItem(LS_KEYS.PLAYER_GENDER);
  if (savedGender) el.playerGenderSelect.value = savedGender;

  if (!state.soundEnabled) {
    el.soundIcon.textContent = "🔇";
    el.soundLabel.textContent = "靜音中";
    el.soundToggleBtn.setAttribute("aria-pressed", "false");
  }
  if (!state.voiceEnabled) {
    el.voiceIcon.textContent = "🔇";
    el.voiceLabel.textContent = "語音關閉";
    el.voiceToggleBtn.setAttribute("aria-pressed", "false");
  }
  updateBgmUI();
  initBackend();
})();
