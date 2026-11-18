// ================================
// تقویم مینا - JavaScript
// ================================

const monthNames = [
  "حمل", "ثور", "جوزا", "سرطان", "اسد", "سنبله",
  "میزان", "عقرب", "قوس", "جدی", "دلو", "حوت"
];

const gregorianMonths = [
  "ژانویه", "فوریه", "مارس", "آوریل", "مه", "ژوئن",
  "ژوئیه", "اوت", "سپتامبر", "اکتبر", "نوامبر", "دسامبر"
];

const weekdays = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

const state = {
  calendar: "jalali",
  viewYear: 1405,
  viewMonth: 4,
  selectedDate: new Date(),
  notes: JSON.parse(localStorage.getItem("minaCalendarNotes") || "[]")
};

const $ = id => document.getElementById(id);

function pad(n) {
  return String(n).padStart(2, "0");
}

// ---------- Gregorian / Jalali conversion ----------
function div(a, b) {
  return Math.floor(a / b);
}

function gregorianToJalali(gy, gm, gd) {
  const gDaysInMonth = [31,28,31,30,31,30,31,31,30,31,30,31];
  const jDaysInMonth = [31,31,31,31,31,31,30,30,30,30,30,29];

  let gy2 = gm > 2 ? gy + 1 : gy;
  let days = 355666 + (365 * gy) + div(gy2 + 3, 4) - div(gy2 + 99, 100)
           + div(gy2 + 399, 400) + gd;

  for (let i = 0; i < gm - 1; i++) days += gDaysInMonth[i];

  let jy = -1595 + (33 * div(days, 12053));
  days %= 12053;
  jy += 4 * div(days, 1461);
  days %= 1461;

  if (days > 365) {
    jy += div(days - 1, 365);
    days = (days - 1) % 365;
  }

  let jm = 0;
  while (jm < 11 && days >= jDaysInMonth[jm]) {
    days -= jDaysInMonth[jm];
    jm++;
  }

  return [jy, jm + 1, days + 1];
}

function jalaliToGregorian(jy, jm, jd) {
  jy += 1595;
  let days = -355668 + (365 * jy) + div(jy, 33) * 8 + div((jy % 33) + 3, 4) + jd;

  for (let i = 0; i < jm - 1; i++) {
    days += i < 6 ? 31 : 30;
  }

  let gy = 400 * div(days, 146097);
  days %= 146097;

  if (days > 36524) {
    gy += 100 * div(--days, 36524);
    days %= 36524;
    if (days >= 365) days++;
  }

  gy += 4 * div(days, 1461);
  days %= 1461;

  if (days > 365) {
    gy += div(days - 1, 365);
    days = (days - 1) % 365;
  }

  let gd = days + 1;
  const leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const monthDays = [31, leap ? 29 : 28,31,30,31,30,31,31,30,31,30,31];

  let gm = 0;
  while (gm < 12 && gd > monthDays[gm]) {
    gd -= monthDays[gm];
    gm++;
  }

  return [gy, gm + 1, gd];
}

function jalaliMonthLength(year, month) {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return isJalaliLeap(year) ? 30 : 29;
}

function isJalaliLeap(year) {
  const g = jalaliToGregorian(year, 12, 30);
  const back = gregorianToJalali(g[0], g[1], g[2]);
  return back[1] === 12 && back[2] === 30;
}

// ---------- Approximate Hijri display ----------
function gregorianToHijri(date) {
  const jd = Math.floor((date.getTime() / 86400000) + 2440587.5);
  let l = jd - 1948440 + 10632;
  let n = div(l - 1, 10631);
  l = l - 10631 * n + 354;
  let j = div(10985 - l, 5316) * div(50 * l, 17719)
        + div(l, 5670) * div(43 * l, 15238);
  l = l - div(30 - j, 15) * div(17719 * j, 50)
        - div(j, 16) * div(15238 * j, 43) + 29;
  let m = div(24 * l, 709);
  let d = l - div(709 * m, 24);
  let y = 30 * n + j - 30;
  return [y, m, d];
}

// ---------- Calendar rendering ----------
function getCurrentJalali() {
  const now = new Date();
  return gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function renderWeekdays() {
  $("weekdays").innerHTML = weekdays.map(d => `<div>${d}</div>`).join("");
}

function renderCalendar() {
  const grid = $("calendarGrid");
  grid.innerHTML = "";

  if (state.calendar === "jalali") renderJalali();
  else if (state.calendar === "gregorian") renderGregorian();
  else renderHijri();
}

function renderJalali() {
  $("monthName").textContent = monthNames[state.viewMonth - 1];
  $("yearName").textContent = `سال ${state.viewYear}`;

  const [gy, gm, gd] = jalaliToGregorian(state.viewYear, state.viewMonth, 1);
  const first = new Date(gy, gm - 1, gd);
  let start = (first.getDay() + 1) % 7; // شنبه = 0
  const days = jalaliMonthLength(state.viewYear, state.viewMonth);
  const prevMonth = state.viewMonth === 1 ? 12 : state.viewMonth - 1;
  const prevYear = state.viewMonth === 1 ? state.viewYear - 1 : state.viewYear;
  const prevDays = jalaliMonthLength(prevYear, prevMonth);

  for (let i = 0; i < start; i++) {
    addDay(prevDays - start + i + 1, true, null);
  }

  for (let d = 1; d <= days; d++) {
    const g = jalaliToGregorian(state.viewYear, state.viewMonth, d);
    addDay(d, false, new Date(g[0], g[1] - 1, g[2]));
  }

  const cells = gridCellCount();
  for (let d = 1; d <= cells; d++) addDay(d, true, null);
}

function renderGregorian() {
  const now = new Date();
  const year = state.viewYear;
  const month = state.viewMonth;
  $("monthName").textContent = gregorianMonths[month - 1];
  $("yearName").textContent = `سال ${year}`;

  const first = new Date(year, month - 1, 1);
  const start = (first.getDay() + 1) % 7;
  const days = new Date(year, month, 0).getDate();
  const prevDays = new Date(year, month - 1, 0).getDate();

  for (let i = 0; i < start; i++) addDay(prevDays - start + i + 1, true, null);
  for (let d = 1; d <= days; d++) addDay(d, false, new Date(year, month - 1, d));

  const cells = gridCellCount();
  for (let d = 1; d <= cells; d++) addDay(d, true, null);
}

function renderHijri() {
  // For simplicity, the calendar grid is based on Gregorian dates while
  // the header and day labels show the corresponding Hijri values.
  const now = new Date();
  const h = gregorianToHijri(new Date(state.viewYear, state.viewMonth - 1, 15));
  $("monthName").textContent = `ماه قمری ${h[1]}`;
  $("yearName").textContent = `سال ${h[0]}`;

  renderGregorian();
  $("monthName").textContent = `ماه قمری ${h[1]}`;
  $("yearName").textContent = `سال ${h[0]}`;
}

function gridCellCount() {
  const count = $("calendarGrid").children.length;
  return count <= 35 ? 35 - count : 42 - count;
}

function addDay(number, otherMonth, date) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "day" + (otherMonth ? " other-month" : "");

  if (date) {
    const today = new Date();
    if (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    ) el.classList.add("today");

    const key = dateKey(date);
    if (state.notes.some(n => n.date === key)) el.classList.add("has-event");

    const j = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const h = gregorianToHijri(date);

    if (state.calendar === "jalali") {
      el.innerHTML = `<span class="day-number">${number}</span><span class="day-sub">${h[2]}</span>`;
    } else if (state.calendar === "gregorian") {
      el.innerHTML = `<span class="day-number">${number}</span><span class="day-sub">${j[2]}</span>`;
    } else {
      el.innerHTML = `<span class="day-number">${h[2]}</span><span class="day-sub">${j[2]}</span>`;
    }

    el.addEventListener("click", () => selectDate(date));
  } else {
    el.innerHTML = `<span class="day-number">${number}</span>`;
  }

  $("calendarGrid").appendChild(el);
}

function selectDate(date) {
  state.selectedDate = date;
  $("noteDate").value = dateKey(date);
  renderEvents();
}

function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function syncViewToToday() {
  const j = getCurrentJalali();
  const now = new Date();

  if (state.calendar === "jalali") {
    state.viewYear = j[0];
    state.viewMonth = j[1];
  } else {
    state.viewYear = now.getFullYear();
    state.viewMonth = now.getMonth() + 1;
  }
}

function changeMonth(step) {
  if (state.calendar === "jalali") {
    state.viewMonth += step;
    if (state.viewMonth > 12) {
      state.viewMonth = 1;
      state.viewYear++;
    }
    if (state.viewMonth < 1) {
      state.viewMonth = 12;
      state.viewYear--;
    }
  } else {
    state.viewMonth += step;
    if (state.viewMonth > 12) {
      state.viewMonth = 1;
      state.viewYear++;
    }
    if (state.viewMonth < 1) {
      state.viewMonth = 12;
      state.viewYear--;
    }
  }
  renderCalendar();
  renderEvents();
}

// ---------- Clock ----------
function updateClock() {
  const now = new Date();
  $("liveClock").textContent = now.toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  const j = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const h = gregorianToHijri(now);
  $("todayText").textContent =
    `شمسی: ${j[2]} ${monthNames[j[1]-1]} ${j[0]}  •  قمری: ${h[2]} / ${h[1]} / ${h[0]}`;
}

// ---------- Events / Notes ----------
function renderEvents() {
  const monthEvents = state.notes.filter(n => {
    const d = new Date(n.date + "T00:00:00");
    if (state.calendar === "jalali") {
      const j = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
      return j[0] === state.viewYear && j[1] === state.viewMonth;
    }
    return d.getFullYear() === state.viewYear && d.getMonth() + 1 === state.viewMonth;
  });

  $("eventCount").textContent = monthEvents.length;

  if (!monthEvents.length) {
    $("eventsList").innerHTML = "برای این ماه مناسبتی ثبت نشده است.";
    return;
  }

  $("eventsList").innerHTML = monthEvents.map(n => `
    <div class="event-item">
      <strong>${escapeHTML(n.title)}</strong>
      <span>${n.date}${n.time ? " • " + n.time : ""}</span>
      ${n.description ? `<p>${escapeHTML(n.description)}</p>` : ""}
    </div>
  `).join("");
}

function renderNotes() {
  const list = $("notesList");

  if (!state.notes.length) {
    list.innerHTML = `<div class="empty-state">هنوز یادداشتی اضافه نکرده‌اید.</div>`;
    return;
  }

  list.innerHTML = state.notes.map((n, i) => `
    <div class="note-item">
      <div>
        <strong>${escapeHTML(n.title)}</strong>
        <span>${n.date}${n.time ? " • " + n.time : ""}</span>
        ${n.description ? `<p>${escapeHTML(n.description)}</p>` : ""}
      </div>
      <button class="delete-note" data-index="${i}" type="button">حذف</button>
    </div>
  `).join("");

  document.querySelectorAll(".delete-note").forEach(btn => {
    btn.addEventListener("click", () => {
      state.notes.splice(Number(btn.dataset.index), 1);
      saveNotes();
      renderNotes();
      renderCalendar();
      renderEvents();
    });
  });
}

function saveNotes() {
  localStorage.setItem("minaCalendarNotes", JSON.stringify(state.notes));
}

function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

// ---------- Theme ----------
function loadTheme() {
  const dark = localStorage.getItem("minaCalendarDark") === "true";
  document.body.classList.toggle("dark", dark);
  $("themeBtn").textContent = dark ? "☀️" : "🌙";
}

// ---------- Buttons ----------
$("prevBtn").addEventListener("click", () => changeMonth(-1));
$("nextBtn").addEventListener("click", () => changeMonth(1));

$("todayBtn").addEventListener("click", () => {
  syncViewToToday();
  state.selectedDate = new Date();
  $("noteDate").value = dateKey(state.selectedDate);
  renderCalendar();
  renderEvents();
});

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    state.calendar = tab.dataset.calendar;
    syncViewToToday();
    renderCalendar();
    renderEvents();
  });
});

$("themeBtn").addEventListener("click", () => {
  const dark = document.body.classList.toggle("dark");
  localStorage.setItem("minaCalendarDark", dark);
  $("themeBtn").textContent = dark ? "☀️" : "🌙";
});

$("openNoteBtn").addEventListener("click", () => {
  $("notePanel").classList.remove("hidden");
  $("noteDate").value = dateKey(state.selectedDate);
  $("noteTitle").focus();
});

$("closeNoteBtn").addEventListener("click", () => {
  $("notePanel").classList.add("hidden");
});

$("saveNoteBtn").addEventListener("click", () => {
  const title = $("noteTitle").value.trim();
  const date = $("noteDate").value;

  if (!title || !date) {
    alert("لطفاً عنوان و تاریخ را وارد کنید.");
    return;
  }

  state.notes.push({
    title,
    date,
    time: $("noteTime").value,
    description: $("noteDescription").value.trim()
  });

  state.notes.sort((a, b) => a.date.localeCompare(b.date));
  saveNotes();
  renderNotes();
  renderCalendar();
  renderEvents();

  $("noteTitle").value = "";
  $("noteTime").value = "";
  $("noteDescription").value = "";
  $("notePanel").classList.add("hidden");
});

// ---------- Start ----------
function init() {
  syncViewToToday();
  state.selectedDate = new Date();
  $("noteDate").value = dateKey(state.selectedDate);
  renderWeekdays();
  renderCalendar();
  renderEvents();
  renderNotes();
  loadTheme();
  updateClock();
  setInterval(updateClock, 1000);
}

init();
