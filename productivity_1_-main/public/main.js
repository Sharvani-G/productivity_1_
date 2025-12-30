// public/main.js
import {
  loadTasksFromBackend,
  saveTasksToBackend,
  clearWeekOnBackend
} from "./storage.js";

import { updateWeekUI } from "./ui.js";

window.tasksByWeek = {};
window.currentDate = new Date();

function formatDateLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
} 

async function init() {
  const monday = getMonday(window.currentDate);
  const weekKey = formatDateLocal(monday);
  window.currentWeekKey = weekKey; 

  window.tasksByWeek[weekKey] = window.tasksByWeek[weekKey] || {};

  const tasksFromBackend = await loadTasksFromBackend(weekKey);
  window.tasksByWeek[weekKey] = tasksFromBackend;
  updateWeekUI(window.tasksByWeek[weekKey], weekKey);
}

init();

window.loadAndRenderWeek = async function (dateObj) {
  const monday = getMonday(dateObj);
  const weekKey = formatDateLocal(monday);
  window.currentWeekKey = weekKey;

  window.tasksByWeek[weekKey] = window.tasksByWeek[weekKey] || {};

  const tasksFromBackend = await loadTasksFromBackend(weekKey);
  window.tasksByWeek[weekKey] = tasksFromBackend;
  updateWeekUI(window.tasksByWeek[weekKey], weekKey);
};

window.saveCurrentWeek = async function () {
  await saveTasksToBackend(window.currentWeekKey);
  console.log("✅ Week saved");
};

window.clearCurrentWeek = async function () {
  await clearWeekOnBackend(window.currentWeekKey);

  window.tasksByWeek[window.currentWeekKey] = {};

  updateWeekUI(window.tasksByWeek[window.currentWeekKey], window.currentWeekKey);
  console.log("✅ Week cleared");
};

// Navigation buttons
document.addEventListener("DOMContentLoaded", () => {
  const left = document.getElementById("pre-week");
  const right = document.getElementById("post-week");

  left?.addEventListener("click", async () => {
    window.currentDate.setDate(window.currentDate.getDate() - 7);
    await window.loadAndRenderWeek(window.currentDate);
  });

  right?.addEventListener("click", async () => {
    window.currentDate.setDate(window.currentDate.getDate() + 7);
    await window.loadAndRenderWeek(window.currentDate);
  });
});
