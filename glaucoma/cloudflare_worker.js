// ═══════════════════════════════════════════════════════════════
//  Glaucoma Fellowship — Cloudflare Worker v3 (Upgraded)
//
//  Endpoints:
//    POST /send          → push any LINE message (from app)
//    POST /webhook       → LINE webhook (Guided chatbot flow)
//    GET  /test          → health check
//    GET  /cron-test     → manually trigger cron logic
//
//  Cron triggers (evening only):
//    Evening : sends TOMORROW's preview at 20:00 Bangkok (13:00 UTC)
//
//  ENV/KV:
//    GF_KV                 → Cloudflare KV namespace binding
//    LINE_CHANNEL_ACCESS_TOKEN
//    FIREBASE_PROJECT_ID
//    FIREBASE_API_KEY
// ═══════════════════════════════════════════════════════════════

const LINE_PUSH = "https://api.line.me/v2/bot/message/push";
const FS_COL    = "gf_v6";   // must match COL in the HTML app

// ── Firestore REST ───────────────────────────────────────────
async function fsGet(projectId, apiKey, docPath) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${docPath}?key=${apiKey}`;
  const r = await fetch(url);
  if (!r.ok) { console.error("fsGet failed", r.status, docPath); return null; }
  return r.json();
}

async function fsAppendLogEntry(projectId, apiKey, entry) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${FS_COL}/logbook?key=${apiKey}`;

  // First get current entries
  const doc = await fsGet(projectId, apiKey, `${FS_COL}/logbook`);
  const current = decDoc(doc)?.entries || [];
  const updated = [...current, entry];

  // Encode updated array back to Firestore format
  const body = {
    fields: {
      entries: {
        arrayValue: {
          values: updated.map(e => ({
            mapValue: {
              fields: {
                id:         { stringValue: e.id },
                date:       { stringValue: e.date },
                fellow:     { stringValue: e.fellow },
                HN:         { stringValue: e.HN || "" },
                procedure:  { stringValue: e.procedure },
                laterality: { stringValue: e.laterality },
                supervisor: { stringValue: e.supervisor },
                diagnosis:  { stringValue: e.diagnosis || "" },
                notes:      { stringValue: e.notes || "" },
              }
            }
          }))
        }
      }
    }
  };

  const r = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return r.ok;
}

async function fsWriteOnCallDoc(projectId, apiKey, call, offDuty) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${FS_COL}/oncall?key=${apiKey}`;

  const callFields = {};
  for (const [k, v] of Object.entries(call || {})) {
    callFields[k] = { stringValue: v };
  }

  const offFields = {};
  for (const [k, v] of Object.entries(offDuty || {})) {
    const val = typeof v === 'string' ? { fellow: v, reason: "" } : v;
    offFields[k] = {
      mapValue: {
        fields: {
          fellow: { stringValue: val.fellow || "" },
          reason: { stringValue: val.reason || "" }
        }
      }
    };
  }

  const body = {
    fields: {
      call: {
        mapValue: { fields: callFields }
      },
      offDuty: {
        mapValue: { fields: offFields }
      }
    }
  };

  const r = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return r.ok;
}

function dec(v) {
  if (!v) return null;
  if ("stringValue"  in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue"  in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue"    in v) return null;
  if ("arrayValue"   in v) return (v.arrayValue.values || []).map(dec);
  if ("mapValue"     in v) {
    const o = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) o[k] = dec(val);
    return o;
  }
  return null;
}
const decDoc = doc => {
  if (!doc?.fields) return null;
  const o = {};
  for (const [k, v] of Object.entries(doc.fields)) o[k] = dec(v);
  return o;
};

// ── Thai holidays ─────────────────────────────────────────────
const HOL = new Set([
  "2026-7-21","2026-7-22","2026-7-28","2026-8-12",
  "2026-10-13","2026-10-23","2026-12-5","2026-12-10","2026-12-31",
  "2027-1-1","2027-2-20","2027-4-6",
  "2027-4-13","2027-4-14","2027-4-15",
  "2027-5-1","2027-5-4","2027-5-11"
]);
const HOL_NAMES = {
  "2026-7-21":"อาสาฬหบูชา","2026-7-22":"เข้าพรรษา","2026-7-28":"วันเฉลิมฯ ร.10",
  "2026-8-12":"วันแม่แห่งชาติ","2026-10-13":"วันคล้ายวันสวรรคต ร.9","2026-10-23":"วันปิยมหาราช",
  "2026-12-5":"วันพ่อแห่งชาติ","2026-12-10":"วันรัฐธรรมนูญ","2026-12-31":"วันสิ้นปี",
  "2027-1-1":"วันขึ้นปีใหม่","2027-2-20":"วันมาฆบูชา","2027-4-6":"วันจักรี",
  "2027-4-13":"วันสงกรานต์","2027-4-14":"วันสงกรานต์","2027-4-15":"วันสงกรานต์",
  "2027-5-1":"วันแรงงานแห่งชาติ","2027-5-4":"วันฉัตรมงคล","2027-5-11":"วันวิสาขบูชา"
};
const hk  = (y,m,d) => `${y}-${m}-${d}`;
const isHol = (y,m,d) => HOL.has(hk(y,m,d));
const holName = (y,m,d) => HOL_NAMES[hk(y,m,d)] || "";
const weekOcc = date => Math.ceil(date.getDate() / 7);

// ── Resolve W1–W5 cell for a specific date ───────────────────
function resolveCell(mr, fellow, y, m, date) {
  const wr = mr?.[`${fellow}-${y}-${m}`];
  if (!wr) return null;
  const dow = date.getDay();
  if (dow < 1 || dow > 5) return null;
  const di  = dow - 1;
  const occ = weekOcc(date);
  
  // compatibility with both older 'template' and newer 'amTemplate/pmTemplate' rotation model
  const amT = wr.amTemplate || wr.template || 'none';
  const pmT = wr.pmTemplate || wr.template || 'none';
  
  const amCell = wr.am?.[di];
  const pmCell = wr.pm?.[di];
  const amW = amCell?.wo?.[occ] || { act: "", sup: "" };
  const pmW = pmCell?.wo?.[occ] || { act: "", sup: "" };
  return {
    am: { act: amW.act || "OPD", sup: amW.sup || "" },
    pm: { act: pmW.act || "OPD", sup: pmW.sup || "" },
  };
}

// ── Bangkok date helpers ──────────────────────────────────────
function bkkNow() {
  const n = new Date();
  // UTC+7
  return new Date(n.getTime() + 7 * 3_600_000);
}
function bkkDate(offsetDays = 0) {
  const b = bkkNow();
  b.setUTCDate(b.getUTCDate() + offsetDays);
  return {
    y:   b.getUTCFullYear(),
    m:   b.getUTCMonth(),
    d:   b.getUTCDate(),
    dow: b.getUTCDay(),
    date: b,
  };
}

// ── Build message for a given date (today or tomorrow) ───────
function buildDayMsg(fellow, mr, callData, offDutyData, morningActSched, preop, offsetDays = 0) {
  const { y, m, d, dow, date } = bkkDate(offsetDays);
  const isWorkday = dow >= 1 && dow <= 5 && !isHol(y, m, d);
  const label = offsetDays === 0 ? "📅 Today" : "📅 Tomorrow";

  // Build dateStr from the already-correct Bangkok y/m/d components.
  // We must NOT use `date` with timeZone:'Asia/Bangkok' because bkkNow() stores
  // Bangkok local time as the UTC field → a second Bangkok conversion doubles the shift
  // and pushes the displayed date 1 day forward (e.g. Saturday cron shows Monday).
  const dispDate = new Date(Date.UTC(y, m, d, 12, 0, 0)); // noon UTC — day components are Bangkok local
  const dateStr = dispDate.toLocaleDateString("th-TH", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
    timeZone: "UTC",  // components already represent Bangkok local day; no extra shift needed
  });


  const dutyKey = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  let msg = `🏥 Glaucoma Fellowship — ${fellow}\n`;
  msg    += `${label}: ${dateStr}\n`;
  msg    += `──────────────\n`;

  if (!isWorkday) {
    if (isHol(y, m, d)) {
      msg += `🏖️ วันหยุดราชการ — ${holName(y, m, d)}\n`;
    } else {
      msg += `📴 Weekend — No activity\n`;
    }
  } else {
    const di      = dow - 1;
    // IMPORTANT: mr keys use 0-indexed months (matching JS getMonth()), same as the MONTHS array in the main app
    const cell    = resolveCell(mr, fellow, y, m, date);
    const am      = cell?.am || { act: "—", sup: "" };
    const pm      = cell?.pm || { act: "—", sup: "" };
    const mas     = morningActSched?.[di] || "Morning Activity";
    const offEntry = offDutyData?.[dutyKey];
    const isOff   = offEntry?.fellow === fellow || offEntry === fellow;

    if (isOff) {
      msg += `📴 OFF DUTY\n   ${offEntry.reason || "—"}\n`;
    } else {
      msg += `⏰ 07:00  Ward Round\n`;
      msg += `⏰ 08:00  ${mas}\n`;
      msg += `⏰ 09:00  ${am.act}${am.sup ? ` (${am.sup})` : ""}\n`;
      msg += `⏰ 13:00  ${pm.act}${pm.sup ? ` (${pm.sup})` : ""}\n`;
    }
  }

  msg += `──────────────\n`;
  const duty = callData?.[dutyKey];
  const isOnCall = duty === fellow || duty?.fellow === fellow;
  msg += isOnCall ? `🌙 ON CALL${offsetDays === 0 ? " tonight" : " tomorrow night"}\n`
                  : `✅ No night duty\n`;

  // Append pre-op list if any
  const tomorrowPreop = (preop || []).filter(e =>
    e.date === dutyKey &&
    (e.surgeon === fellow || e.fellow === fellow) &&
    e.status !== 'Done'
  );

  if (tomorrowPreop.length > 0) {
    msg += `──────────────\n`;
    msg += `🟡 Pre-Op Tomorrow (${tomorrowPreop.length})\n`;
    tomorrowPreop.forEach(po => {
      msg += `  • ${po.procedure || '—'} (${po.laterality || ''})`;
      msg += po.readyForSurgery ? ' ✅ Ready\n' : '\n';
    });
  }

  return msg;
}

// ── LINE push ─────────────────────────────────────────────────
async function pushLine(token, userId, text) {
  const r = await fetch(LINE_PUSH, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      to: userId,
      messages: [{ type: "text", text }],
    }),
  });
  if (!r.ok) {
    const body = await r.text();
    console.error(`LINE push to ${userId} failed:`, r.status, body);
  }
  return r.ok;
}

// ── Fetch all needed docs ─────────────────────────────────────
async function fetchDocs(proj, key) {
  const [schedDoc, oncallDoc, settDoc, preopDoc] = await Promise.all([
    fsGet(proj, key, `${FS_COL}/schedule`),
    fsGet(proj, key, `${FS_COL}/oncall`),
    fsGet(proj, key, `${FS_COL}/settings`),
    fsGet(proj, key, `${FS_COL}/preop`),
  ]);
  const sched    = decDoc(schedDoc);
  const oncall   = decDoc(oncallDoc);
  const settings = decDoc(settDoc);
  const preopData = decDoc(preopDoc);
  return {
    mr:               sched?.mr              || {},
    callData:         oncall?.call            || {},
    offDutyData:      oncall?.offDuty         || {},
    morningActSched:  settings?.morningActSched || [],
    preop:            preopData?.entries       || [],
    ssId:             settings?.ssLineId       || null,
    mnId:             settings?.mnLineId       || null,
  };
}

// ── Notification Trigger Check ────────────────────────────────
function shouldNotify(fellow, callData, offDutyData, preop, tomorrowKey) {
  const isOnCall      = callData[tomorrowKey] === fellow || callData[tomorrowKey]?.fellow === fellow;
  const hasPreop      = (preop || []).some(e =>
    e.date === tomorrowKey &&
    (e.surgeon === fellow || e.fellow === fellow) &&
    e.status !== 'Done'
  );
  const isOffTomorrow = offDutyData[tomorrowKey]?.fellow === fellow || offDutyData[tomorrowKey] === fellow;

  return isOnCall || hasPreop || isOffTomorrow;
}

// ── Core cron handler ─────────────────────────────────────────
async function handleCron(env, cronType) {
  const proj  = env.FIREBASE_PROJECT_ID;
  const key   = env.FIREBASE_API_KEY;
  const token = env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!proj || !key || !token) {
    console.error("Missing env vars");
    return;
  }

  const { mr, callData, offDutyData, morningActSched, preop, ssId, mnId } =
    await fetchDocs(proj, key);

  // Always evening (offset 1 day for tomorrow preview)
  const { y, m, d } = bkkDate(1);
  const tomorrowKey = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const results    = [];

  for (const [fellow, userId] of [["SS", ssId], ["MN", mnId]]) {
    if (!userId) { results.push(`${fellow}: no userId`); continue; }
    
    // Only notify if there's any notable event tomorrow
    const notify = shouldNotify(fellow, callData, offDutyData, preop, tomorrowKey);
    if (!notify) {
      results.push(`${fellow}: skipped (nothing tomorrow)`);
      continue;
    }

    const msg = buildDayMsg(fellow, mr, callData, offDutyData, morningActSched, preop, 1);
    const ok  = await pushLine(token, userId, msg);
    results.push(`${fellow}: ${ok ? "✅" : "❌"}`);
  }

  console.log(`Cron [${cronType}] result:`, results.join(" | "));
}

// ── LINE Chatbot Guided Flow Helpers ───────────────────────────
function identifyFellow(userId, settings) {
  if (userId === settings.ssLineId) return "SS";
  if (userId === settings.mnLineId) return "MN";
  return null;
}

async function getPending(kv, userId) {
  const v = await kv.get(`pending:${userId}`);
  return v ? JSON.parse(v) : null;
}

async function setPending(kv, userId, data) {
  await kv.put(`pending:${userId}`, JSON.stringify(data), { expirationTtl: 600 });
}

async function clearPending(kv, userId) {
  await kv.delete(`pending:${userId}`);
}

function quickReply(items) {
  return {
    items: items.slice(0, 13).map(label => ({
      type: "action",
      action: {
        type: "message",
        label: label.slice(0, 20),
        text: label
      }
    }))
  };
}

async function replyWithQuickReply(token, replyToken, text, items) {
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      replyToken,
      messages: [{
        type: "text",
        text,
        quickReply: quickReply(items)
      }]
    })
  });
}

async function replyLine(token, replyToken, text) {
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }]
    })
  });
}

function helpMessage(fellow) {
  return (
    `🏥 Glaucoma Fellowship Bot\n` +
    `──────────────\n` +
    `👋 Hello ${fellow}!\n\n` +
    `Available commands/menu actions:\n` +
    `  📅 Today / วันนี้\n` +
    `  📊 Stats / สถิติ\n   → Get case log totals vs targets\n` +
    `  📴 Off Day / วันลา\n   → View booked off days\n` +
    `  🔄 Swap / แลกเวร\n   → Coordinate shift swaps\n` +
    `  ➕ Log Case / ผ่าตัด\n   → Log completed OR case\n` +
    `  ❌ Cancel / ยกเลิก\n` +
    `──────────────\n` +
    `Tap any menu option at the bottom to begin!`
  );
}

function checkDuplicateWorker(hn, procedure, todayKey, logbook) {
  if (!hn) return null;
  const dateObj = new Date(todayKey + 'T12:00:00');
  const cutoff = new Date(dateObj.getTime() - 7 * 86400000);
  const cy = cutoff.getFullYear();
  const cm = String(cutoff.getMonth() + 1).padStart(2, '0');
  const cd = String(cutoff.getDate()).padStart(2, '0');
  const cutoffStr = `${cy}-${cm}-${cd}`;
  
  return logbook.find(e =>
    e.HN === hn &&
    e.procedure === procedure &&
    e.date >= cutoffStr &&
    e.date <= todayKey
  ) || null;
}

// ── Main Chatbot Handler ───────────────────────────────────────
async function handleIncoming(event, env, settings, logbook, preop, oncall = {}) {
  const userId     = event.source?.userId;
  const replyToken = event.replyToken;
  const text       = (event.message?.text || "").trim();
  const token      = env.LINE_CHANNEL_ACCESS_TOKEN;
  const kv         = env.GF_KV;

  const fellow = identifyFellow(userId, settings);
  if (!fellow) {
    // Unknown user → echo back User ID
    await replyLine(token, replyToken, `Your LINE User ID:\n${userId}\n\nPaste into app ⚙️ Settings.`);
    return;
  }

  // 🔄 Intercept Swap Requests responders
  const swapRequestJson = await kv.get(`swap_req:${userId}`);
  if (swapRequestJson && (text === "✅ Accept Swap" || text === "❌ Decline Swap")) {
    const req = JSON.parse(swapRequestJson);
    const otherFellow = fellow === "SS" ? "MN" : "SS";
    if (text === "✅ Accept Swap") {
      const callData = oncall.call || {};
      const offDutyData = oncall.offDuty || {};
      // Swap assignments
      callData[req.myDate] = otherFellow;
      callData[req.otherDate] = fellow;

      const ok = await fsWriteOnCallDoc(env.FIREBASE_PROJECT_ID, env.FIREBASE_API_KEY, callData, offDutyData);
      if (ok) {
        await pushLine(token, req.requesterUserId, `🔄 Swap Accepted!\n${fellow} accepted your swap request. Shifts on ${req.myDate} and ${req.otherDate} have been exchanged. 🎉`);
        await replyLine(token, replyToken, `🔄 Swap Completed!\nShifts on ${req.myDate} and ${req.otherDate} have been successfully exchanged. 🎉`);
      } else {
        await replyLine(token, replyToken, "❌ Swap database write failed. Please try again.");
      }
    } else {
      await pushLine(token, req.requesterUserId, `❌ Swap Declined\n${fellow} declined your swap request for shifts on ${req.myDate} and ${req.otherDate}.`);
      await replyLine(token, replyToken, "Swap request declined. ❌");
    }
    await kv.delete(`swap_req:${userId}`);
    return;
  }

  // Cancel keyword
  if (text.toLowerCase() === "cancel" || text === "ยกเลิก") {
    await clearPending(kv, userId);
    await replyLine(token, replyToken, "ยกเลิกแล้ว ✅");
    return;
  }

  // Today/Tomorrow/Help commands
  if (text.toLowerCase() === "today" || text === "วันนี้") {
    const msg = buildDayMsg(fellow, settings.mr || {}, oncall.call || {}, oncall.offDuty || {}, settings.morningActSched || [], preop, 0);
    await replyLine(token, replyToken, msg);
    return;
  }
  if (text.toLowerCase() === "tomorrow" || text === "พรุ่งนี้") {
    const msg = buildDayMsg(fellow, settings.mr || {}, oncall.call || {}, oncall.offDuty || {}, settings.morningActSched || [], preop, 1);
    await replyLine(token, replyToken, msg);
    return;
  }
  if (text.toLowerCase() === "help" || text === "ช่วย") {
    await replyLine(token, replyToken, helpMessage(fellow));
    return;
  }

  // Stats command (📊 Stats)
  if (text.toLowerCase() === "stats" || text === "สถิติ") {
    const stats = {};
    const procs = settings.procs || [];
    procs.forEach(p => { stats[p] = 0; });
    logbook.forEach(e => {
      if (e.fellow === fellow && procs.includes(e.procedure)) {
        stats[e.procedure]++;
      }
    });
    
    let msg = `📊 ${fellow} Fellow Statistics\n`;
    msg    += `──────────────\n`;
    procs.forEach(p => {
      const count = stats[p];
      const target = (settings.targets || {})[p] || 0;
      msg += `• ${p}: ${count}${target ? ` / ${target}` : ""} cases\n`;
    });
    msg += `──────────────\n`;
    msg += `Total Logged: ${logbook.filter(e => e.fellow === fellow).length} cases`;
    await replyLine(token, replyToken, msg);
    return;
  }

  // Off Day command (📴 Off Day)
  if (text.toLowerCase() === "offday" || text === "วันลา") {
    const offDutyData = oncall.offDuty || {};
    const upcomingOff = [];
    const todayStr = bkkNow().toISOString().slice(0,10);
    
    for (const [date, val] of Object.entries(offDutyData)) {
      const fName = typeof val === 'string' ? val : val.fellow;
      const reason = typeof val === 'string' ? "" : val.reason;
      if (fName === fellow && date >= todayStr) {
        upcomingOff.push({ date, reason });
      }
    }
    upcomingOff.sort((a,b) => a.date.localeCompare(b.date));
    
    let msg = `📴 ${fellow} Booked Off Days\n`;
    msg    += `──────────────\n`;
    if (upcomingOff.length === 0) {
      msg += "No upcoming off days booked.";
    } else {
      upcomingOff.forEach(e => {
        msg += `• ${e.date}${e.reason ? `: ${e.reason}` : ""}\n`;
      });
    }
    await replyLine(token, replyToken, msg);
    return;
  }

  // Swap command (🔄 Swap shift)
  if (text.toLowerCase() === "swap" || text === "แลกเวร") {
    const callData = oncall.call || {};
    const todayStr = bkkNow().toISOString().slice(0,10);
    const myShifts = [];
    for (const [date, f] of Object.entries(callData)) {
      if (f === fellow && date >= todayStr) {
        myShifts.push(date);
      }
    }
    myShifts.sort().splice(12); // max 12
    
    if (myShifts.length === 0) {
      await replyLine(token, replyToken, "🌙 You have no upcoming on-call shifts scheduled.");
      return;
    }
    
    await setPending(kv, userId, { step: "swap_my_date", fellow });
    await replyWithQuickReply(token, replyToken, "🔄 Which of your on-call dates do you want to swap?", myShifts);
    return;
  }

  const pending = await getPending(kv, userId);

  if (!pending) {
    const isTrigger = ["or", "log", "ผ่าตัด", "เพิ่มเคส"].includes(text.toLowerCase());
    if (isTrigger) {
      await setPending(kv, userId, { step: "procedure", fellow });
      const procs = settings.procs || [];
      await replyWithQuickReply(token, replyToken, "⚕️ Select procedure:", procs);
    } else {
      await replyLine(token, replyToken, helpMessage(fellow));
    }
    return;
  }

  // ── Swap Coordinator Step 1: My Date selected
  if (pending.step === "swap_my_date") {
    const otherFellow = fellow === "SS" ? "MN" : "SS";
    const callData = oncall.call || {};
    const todayStr = bkkNow().toISOString().slice(0,10);
    const otherShifts = [];
    for (const [date, f] of Object.entries(callData)) {
      if (f === otherFellow && date >= todayStr) {
        otherShifts.push(date);
      }
    }
    otherShifts.sort().splice(12);

    if (otherShifts.length === 0) {
      await clearPending(kv, userId);
      await replyLine(token, replyToken, `🌙 ${otherFellow} has no upcoming on-call shifts to swap with.`);
      return;
    }

    await setPending(kv, userId, { ...pending, step: "swap_other_date", myDate: text });
    await replyWithQuickReply(token, replyToken, `🔄 Which of ${otherFellow}'s shifts do you want to trade for?`, otherShifts);
    return;
  }

  // ── Swap Coordinator Step 2: Other Date selected
  if (pending.step === "swap_other_date") {
    await setPending(kv, userId, { ...pending, step: "swap_confirm", otherDate: text });
    await replyWithQuickReply(token, replyToken,
      `🔄 Confirm swap request:\nTrade your shift on ${pending.myDate} with shift on ${text}?`,
      ["✅ Confirm Trade", "❌ Cancel"]
    );
    return;
  }

  // ── Swap Coordinator Step 3: Swap Confirmation Request
  if (pending.step === "swap_confirm") {
    if (text === "✅ Confirm Trade") {
      const otherFellow = fellow === "SS" ? "MN" : "SS";
      const otherUserId = otherFellow === "SS" ? settings.ssLineId : settings.mnLineId;
      
      if (!otherUserId) {
        await clearPending(kv, userId);
        await replyLine(token, replyToken, `❌ Cannot send swap request: ${otherFellow} has not registered their LINE User ID in Settings.`);
        return;
      }

      // Save swap request under other fellow's key in KV
      const requestData = {
        requester: fellow,
        requesterUserId: userId,
        myDate: pending.myDate,
        otherDate: pending.otherDate
      };
      await kv.put(`swap_req:${otherUserId}`, JSON.stringify(requestData), { expirationTtl: 3600 });
      
      // Proactively notify the other fellow
      await pushLine(token, otherUserId, 
        `🔄 Swap Request from ${fellow}:\n` +
        `Trade your shift on ${pending.otherDate} for ${fellow}'s shift on ${pending.myDate}?\n\n` +
        `Respond with buttons below:`
      );
      await pushLine(token, otherUserId, "✅ Accept Swap / ❌ Decline Swap"); // wait, pushing text for quick replies or using standard quick reply
      
      await clearPending(kv, userId);
      await replyLine(token, replyToken, `📨 Swap request sent to ${otherFellow}! Waiting for confirmation.`);
    } else {
      await clearPending(kv, userId);
      await replyLine(token, replyToken, "Swap request cancelled. ❌");
    }
    return;
  }

  // Step 1: Procedure
  if (pending.step === "procedure") {
    const procs = settings.procs || [];
    if (!procs.includes(text)) {
      await replyWithQuickReply(token, replyToken, "⚕️ Please select from the list:", procs);
      return;
    }
    await setPending(kv, userId, { ...pending, step: "laterality", procedure: text });
    await replyWithQuickReply(token, replyToken, "👁️ Which eye?", ["OD", "OS", "OU"]);
    return;
  }

  // Step 2: Laterality
  if (pending.step === "laterality") {
    if (!["OD", "OS", "OU"].includes(text)) {
      await replyWithQuickReply(token, replyToken, "👁️ Please select:", ["OD", "OS", "OU"]);
      return;
    }
    await setPending(kv, userId, { ...pending, step: "supervisor", laterality: text });
    const sups = settings.sups || [];
    await replyWithQuickReply(token, replyToken, "👩‍⚕️ Supervisor?", sups);
    return;
  }

  // Step 3: Supervisor
  if (pending.step === "supervisor") {
    const sups = settings.sups || [];
    if (!sups.includes(text)) {
      await replyWithQuickReply(token, replyToken, "👩‍⚕️ Please select supervisor:", sups);
      return;
    }
    await setPending(kv, userId, { ...pending, step: "hn", supervisor: text });
    await replyLine(token, replyToken, '🏥 HN number?\n(Type HN or type  -  to skip)');
    return;
  }

  // Step 4: HN entry (triggers duplicate check)
  if (pending.step === "hn") {
    const hn = text === "-" ? "" : text;
    const { y, m, d } = bkkDate();
    const todayKey = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    if (hn) {
      const dupe = checkDuplicateWorker(hn, pending.procedure, todayKey, logbook);
      if (dupe) {
        // Quick Reply for duplicate warning
        await setPending(kv, userId, { ...pending, step: "confirm_dupe", hn });
        await replyWithQuickReply(token, replyToken,
          `⚠️ HN ${hn} — ${pending.procedure} was logged on ${dupe.date}.\nSave anyway?`,
          ['✅ Yes, save', '❌ Cancel']
        );
        return;
      }
    }

    // Save immediately if no duplicate
    await saveLogEntryAndConfirm(env, replyToken, token, kv, pending, hn, todayKey, logbook, settings);
    return;
  }

  // Step 5: Duplicate confirmation
  if (pending.step === "confirm_dupe") {
    if (text === '✅ Yes, save') {
      const { y, m, d } = bkkDate();
      const todayKey = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      await saveLogEntryAndConfirm(env, replyToken, token, kv, pending, pending.hn, todayKey, logbook, settings);
    } else {
      await clearPending(kv, userId);
      await replyLine(token, replyToken, 'ยกเลิกแล้ว ✅');
    }
    return;
  }
}

// ── Save case & push final confirmation ───────────────────────
async function saveLogEntryAndConfirm(env, replyToken, token, kv, pending, hn, todayKey, logbook, settings) {
  const entry = {
    id:         `c_${Date.now()}`,
    date:       todayKey,
    fellow:     pending.fellow,
    HN:         hn,
    procedure:  pending.procedure,
    laterality: pending.laterality,
    supervisor: pending.supervisor,
    diagnosis:  "",
    notes:      ""
  };

  const proj = env.FIREBASE_PROJECT_ID;
  const key  = env.FIREBASE_API_KEY;
  const ok   = await fsAppendLogEntry(proj, key, entry);

  const userId = pending.fellow === "SS" ? settings.ssLineId : settings.mnLineId;
  if (userId) await clearPending(kv, userId);

  if (!ok) {
    await replyLine(token, replyToken, "❌ Failed to save. Please try again.");
    return;
  }

  const allEntries = [...logbook, entry];
  const count = allEntries.filter(e => e.fellow === pending.fellow && e.procedure === pending.procedure).length;
  const target = (settings.targets || {})[pending.procedure] || 0;

  const confirmMsg =
    `✅ Case Logged!\n` +
    `──────────────\n` +
    `👨‍⚕️ Fellow: ${pending.fellow}\n` +
    `⚕️ ${pending.procedure} (${pending.laterality})\n` +
    `👩‍⚕️ Supervisor: ${pending.supervisor}\n` +
    `🏥 HN: ${hn || "—"}\n` +
    `📅 ${todayKey}\n` +
    `──────────────\n` +
    `📊 ${pending.procedure}: ${count}${target ? ` / ${target}` : ""} cases`;

  await replyLine(token, replyToken, confirmMsg);
}

// ── CORS ──────────────────────────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

// ── HTTP handler ──────────────────────────────────────────────
async function handleRequest(request, env) {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

  const proj = env.FIREBASE_PROJECT_ID;
  const key  = env.FIREBASE_API_KEY;
  const token = env.LINE_CHANNEL_ACCESS_TOKEN;

  // POST /send  — manual push from app
  if (url.pathname === "/send" && request.method === "POST") {
    try {
      const { userId, message } = await request.json();
      if (!userId || !message) return json({ ok: false, error: "Missing userId or message" }, 400);
      const ok = await pushLine(token, userId, message);
      return json({ ok });
    } catch (e) {
      return json({ ok: false, error: e.message }, 500);
    }
  }

  // POST /webhook  — LINE Webhook with Guided Chatbot Flow
  if (url.pathname === "/webhook" && request.method === "POST") {
    try {
      const body   = await request.json();
      const events = body.events || [];

      // Fetch config + records including oncall and schedule docs
      const [settDoc, logDoc, preopDoc, oncallDoc, schedDoc] = await Promise.all([
        fsGet(proj, key, `${FS_COL}/settings`),
        fsGet(proj, key, `${FS_COL}/logbook`),
        fsGet(proj, key, `${FS_COL}/preop`),
        fsGet(proj, key, `${FS_COL}/oncall`),
        fsGet(proj, key, `${FS_COL}/schedule`),
      ]);
      const settings = decDoc(settDoc) || {};
      const sched    = decDoc(schedDoc) || {};
      // Merge rotation data (mr) from schedule doc into settings for handleIncoming
      settings.mr    = sched.mr || {};
      const logbook  = decDoc(logDoc)?.entries || [];
      const preop    = decDoc(preopDoc)?.entries || [];
      const oncall   = decDoc(oncallDoc) || {};

      for (const evt of events) {
        if (evt.type === "message" && evt.message?.type === "text") {
          await handleIncoming(evt, env, settings, logbook, preop, oncall);
        }
      }
    } catch (e) {
      console.error("Webhook error:", e);
    }
    return new Response("OK", { headers: CORS });
  }

  // GET /test  — health check
  if (url.pathname === "/test" && request.method === "GET") {
    return json({
      ok:             true,
      service:        "Glaucoma Fellowship Worker v3 (Upgraded)",
      time:           new Date().toISOString(),
      bkkTime:        bkkNow().toISOString(),
      firebaseProject: proj || "not set",
      lineTokenSet:   !!token,
      collection:     FS_COL,
    });
  }

  // GET /cron-test?type=evening  — manual trigger
  if (url.pathname === "/cron-test" && request.method === "GET") {
    const t = url.searchParams.get("type") || "evening";
    await handleCron(env, t);
    return json({ ok: true, triggered: t });
  }

  return json({ ok: false, error: "Not found" }, 404);
}

// ── Worker entry point ────────────────────────────────────────
export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  },

  async scheduled(event, env, ctx) {
    // Evening cron only — triggers at 13:00 UTC (20:00 Bangkok)
    ctx.waitUntil(handleCron(env, "evening"));
  },
};
