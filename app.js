"use strict";

let tripData = null;

const $ = (selector) => document.querySelector(selector);

/* ---------- 安全處理 ---------- */

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function safeUrl(value) {
  if (!value) return "";

  try {
    const url = new URL(value, window.location.href);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return "";
    }

    return url.href;
  } catch {
    return "";
  }
}

/* ---------- 日期處理 ---------- */

function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(dateString, options = {}) {
  const date = parseLocalDate(dateString);

  return new Intl.DateTimeFormat("zh-TW", {
    month: "numeric",
    day: "numeric",
    weekday: options.weekday === false ? undefined : "short"
  }).format(date);
}

function formatDateRange(start, end) {
  if (!start || !end) return "";

  return `${formatDate(start, { weekday: false })} – ${formatDate(end, { weekday: false })}`;
}

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDayId(day) {
  return `day-${day.date}`;
}

/* ---------- 儲存資料 ---------- */

function getStoragePrefix() {
  const tripId = tripData?.trip_id || "default-trip";
  return `travel-pwa:${tripId}:`;
}

function getNoteKey(date) {
  return `${getStoragePrefix()}note:${date}`;
}

function getTodoKey(todoId) {
  return `${getStoragePrefix()}todo:${todoId}`;
}

function loadTodoStatus(todoId, defaultValue = false) {
  const value = localStorage.getItem(getTodoKey(todoId));

  if (value === null) return defaultValue;

  return value === "true";
}

/* ---------- 主題設定 ---------- */

function applyTheme() {
  const theme = tripData.theme || {};
  const root = document.documentElement;

  const allowedColors = [
    "bg",
    "card",
    "text",
    "muted",
    "line",
    "accent",
    "accent_light",
    "accent_dark",
    "header_bg",
    "header_text",
    "summary_bg",
    "summary_border"
  ];

  const cssNames = {
    bg: "--bg",
    card: "--card",
    text: "--text",
    muted: "--muted",
    line: "--line",
    accent: "--accent",
    accent_light: "--accent-light",
    accent_dark: "--accent-dark",
    header_bg: "--header-bg",
    header_text: "--header-text",
    summary_bg: "--summary-bg",
    summary_border: "--summary-border"
  };

  allowedColors.forEach((key) => {
    const value = theme[key];

    if (typeof value === "string" && /^#[0-9a-fA-F]{3,8}$/.test(value)) {
      root.style.setProperty(cssNames[key], value);
    }
  });

  if (theme.theme_color && /^#[0-9a-fA-F]{3,8}$/.test(theme.theme_color)) {
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme.theme_color);
  }
}

/* ---------- 頁面基本資訊 ---------- */

function renderHeader() {
  const title = tripData.trip_name || "旅行行程";
  const subtitle = tripData.subtitle || formatDateRange(
    tripData.trip_start,
    tripData.trip_end
  );

  $("#trip-title").textContent = title;
  $("#trip-subtitle").textContent = subtitle;
  $("#summary-title").textContent = tripData.summary?.title || "行程總覽";
  $("#summary-description").textContent =
    tripData.summary?.description || "";

  document.title = title;

  const highlights = tripData.summary?.highlights || [];

  $("#summary-highlights").innerHTML = highlights
    .map((item) => `<span class="highlight">${escapeHTML(item)}</span>`)
    .join("");

  $("#app-footer").textContent =
    tripData.footer || "行程資料以 trip-data.json 為準。";
}

/* ---------- 航班 ---------- */

function renderFlights() {
  const flights = tripData.flights || [];
  const root = $("#flights");

  if (!flights.length) {
    root.innerHTML = "";
    return;
  }

  root.innerHTML = flights.map((flight) => {
    const from = escapeHTML(flight.from || "—");
    const to = escapeHTML(flight.to || "—");
    const number = escapeHTML(flight.flight || "航班");
    const date = flight.date
      ? escapeHTML(formatDate(flight.date, { weekday: false }))
      : "";

    const departure = flight.departure
      ? escapeHTML(flight.departure)
      : "";

    const arrival = flight.arrival
      ? escapeHTML(flight.arrival)
      : "";

    const fromTerminal = flight.from_terminal
      ? escapeHTML(flight.from_terminal)
      : "";

    const toTerminal = flight.to_terminal
      ? escapeHTML(flight.to_terminal)
      : "";

    const extra = [
      date,
      number,
      flight.passenger_count
        ? `${escapeHTML(flight.passenger_count)} 人`
        : "",
      flight.note ? escapeHTML(flight.note) : ""
    ].filter(Boolean).join("・");

    return `
      <div class="flight-card">
        <div class="flight-side">
          <strong>${from}</strong>
          <small>${departure}</small>
          <small>${fromTerminal}</small>
        </div>

        <div class="flight-middle">→</div>

        <div class="flight-side">
          <strong>${to}</strong>
          <small>${arrival}</small>
          <small>${toTerminal}</small>
        </div>

        <div class="flight-extra">${extra}</div>
      </div>
    `;
  }).join("");
}

/* ---------- 待辦事項 ---------- */

function renderTodos() {
  const todos = tripData.todos || [];
  const root = $("#todos");
  const section = $("#todos-section");

  if (!todos.length) {
    section.hidden = true;
    return;
  }

  section.hidden = false;

  root.innerHTML = todos.map((todo, index) => {
    const id = todo.id || `todo-${index}`;
    const checked = loadTodoStatus(id, todo.done === true);

    return `
      <label class="todo-item ${checked ? "done" : ""}">
        <input
          type="checkbox"
          data-todo-id="${escapeHTML(id)}"
          ${checked ? "checked" : ""}
        >
        <span class="todo-content">
          <span class="todo-title">${escapeHTML(todo.title)}</span>
          ${todo.description
            ? `<span class="todo-description">${escapeHTML(todo.description)}</span>`
            : ""}
        </span>
      </label>
    `;
  }).join("");

  root.querySelectorAll("input[data-todo-id]").forEach((input) => {
    input.addEventListener("change", () => {
      const id = input.dataset.todoId;

      localStorage.setItem(getTodoKey(id), String(input.checked));

      input.closest(".todo-item")
        ?.classList.toggle("done", input.checked);

      updateTodoProgress();
    });
  });

  updateTodoProgress();
}

function updateTodoProgress() {
  const inputs = [...document.querySelectorAll("#todos input[type=checkbox]")];
  const completed = inputs.filter((input) => input.checked).length;

  $("#todo-progress").textContent =
    `${completed} / ${inputs.length} 已完成`;
}

/* ---------- 地圖連結 ---------- */

function getMapUrl(item) {
  const explicitUrl = safeUrl(item.map_url);

  if (explicitUrl) return explicitUrl;

  const searchText = item.location || item.title;

  if (!searchText) return "";

  return "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(searchText);
}

/* ---------- 活動類型 ---------- */

function getTypeLabel(type) {
  const labels = {
    transport: "交通",
    hotel: "住宿",
    food: "餐食",
    activity: "活動",
    shopping: "購物",
    cycling: "騎乘",
    hiking: "健行",
    note: "備註"
  };

  return labels[type] || "";
}

function renderTag(type) {
  const label = getTypeLabel(type);

  if (!label) return "";

  return `<span class="tag ${escapeHTML(type)}">${escapeHTML(label)}</span>`;
}

/* ---------- 每日行程 ---------- */

function renderDay(day) {
  const section = document.createElement("section");
  const dayId = getDayId(day);
  const items = day.items || [];

  section.className = "day";
  section.id = dayId;

  const dateLabel = day.date_label || formatDate(day.date);

  section.innerHTML = `
    <div class="day-head">
      <div class="day-title">
        ${escapeHTML(dateLabel)}
        <span>${escapeHTML(day.city || "")}</span>
        ${day.lodging
          ? `<span class="lodging">🏨 ${escapeHTML(day.lodging)}</span>`
          : ""}
      </div>
      <span class="day-badge">${items.length} 個行程</span>
    </div>

    <div class="timeline"></div>

    <div class="notes">
      <label>
        📝 今日筆記
        <textarea
          data-note-date="${escapeHTML(day.date)}"
          placeholder="輸入今日心得、實際花費、餐廳、交通或臨時變更……"
        ></textarea>
      </label>
    </div>
  `;

  const timeline = section.querySelector(".timeline");

  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "item";

    const mapUrl = getMapUrl(item);
    const typeTag = renderTag(item.type);

    const actionLink = mapUrl
      ? `
        <div class="item-actions">
          <a
            href="${escapeHTML(mapUrl)}"
            target="_blank"
            rel="noopener noreferrer"
          >📍 開啟地圖 ↗</a>
        </div>
      `
      : "";

    div.innerHTML = `
      <div class="time">${escapeHTML(item.time || "")}</div>
      <div class="dot"></div>
      <div class="content">
        <h3>${escapeHTML(item.title || "")}</h3>
        ${item.description
          ? `<p>${escapeHTML(item.description)}</p>`
          : ""}
        ${typeTag}
        ${actionLink}
      </div>
    `;

    timeline.appendChild(div);
  });

  return section;
}

function renderDays() {
  const days = tripData.days || [];
  const root = $("#days");
  const nav = $("#day-nav");

  root.innerHTML = "";
  nav.innerHTML = "";

  days.forEach((day) => {
    const dayId = getDayId(day);
    const label = day.nav_label || formatDate(day.date, {
      weekday: false
    });

    const link = document.createElement("a");
    link.href = `#${dayId}`;
    link.textContent = label;
    nav.appendChild(link);

    root.appendChild(renderDay(day));
  });

  restoreNotes();
  setupDayObserver();
  scrollToRelevantDay();
}

/* ---------- 每日筆記 ---------- */

function restoreNotes() {
  document.querySelectorAll("textarea[data-note-date]").forEach((area) => {
    const date = area.dataset.noteDate;
    const key = getNoteKey(date);

    area.value = localStorage.getItem(key) || "";

    area.addEventListener("input", () => {
      localStorage.setItem(key, area.value);
    });
  });
}

/* ---------- 日期導覽狀態 ---------- */

function setupDayObserver() {
  const navLinks = [...document.querySelectorAll("#day-nav a")];
  const daySections = [...document.querySelectorAll(".day")];

  if (!("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      navLinks.forEach((link) => {
        link.classList.toggle(
          "active",
          link.getAttribute("href") === `#${entry.target.id}`
        );
      });
    });
  }, {
    rootMargin: "-145px 0px -65% 0px"
  });

  daySections.forEach((section) => observer.observe(section));
}

function scrollToRelevantDay() {
  const days = tripData.days || [];
  if (!days.length) return;

  const today = getTodayString();
  const currentDay = days.find((day) => day.date === today);

  if (currentDay) {
    setTimeout(() => {
      document.getElementById(getDayId(currentDay))
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
    }, 250);
  }
}

/* ---------- 頁面事件 ---------- */

function setupPageActions() {
  $("#top-button").addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });
}

/* ---------- 載入資料 ---------- */

async function loadTrip() {
  try {
    const response = await fetch("./trip-data.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    tripData = await response.json();

    if (!Array.isArray(tripData.days)) {
      throw new Error("trip-data.json 缺少 days 陣列");
    }

    applyTheme();
    renderHeader();
    renderFlights();
    renderTodos();
    renderDays();
    setupPageActions();

  } catch (error) {
    console.error("Trip loading failed:", error);

    $("#days").innerHTML = `
      <div class="error-card">
        <strong>行程資料載入失敗</strong>
        <p>請確認 trip-data.json 是否存在，且 JSON 格式正確。</p>
        <p>${escapeHTML(error.message)}</p>
      </div>
    `;
  }
}

/* ---------- 啟動 ---------- */

loadTrip();

/* ---------- Service Worker ---------- */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .catch((error) => {
        console.warn("Service Worker registration failed:", error);
      });
  });
}