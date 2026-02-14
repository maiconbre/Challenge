import { w as writable } from "./index.js";
const createModalStore = writable({
  isOpen: false,
  title: "",
  startDate: "",
  endDate: "",
  startTime: "09:00",
  endTime: "10:00",
  color: "#3b82f6",
  location: ""
});
const selectedDateStore = writable((/* @__PURE__ */ new Date()).toISOString().split("T")[0]);
const toastStore = writable([]);
Array.from({ length: 24 }, (_, i) => i);
function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function getMonthLabel(date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
export {
  createModalStore as c,
  formatDateISO as f,
  getMonthLabel as g,
  selectedDateStore as s,
  toastStore as t
};
