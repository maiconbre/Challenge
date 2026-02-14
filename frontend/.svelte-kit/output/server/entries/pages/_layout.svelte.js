import { c as create_ssr_component, a as subscribe, e as escape, b as each, v as validate_component } from "../../chunks/ssr.js";
import { f as formatDateISO, s as selectedDateStore } from "../../chunks/dateUtils.js";
function isToday(date) {
  const today = /* @__PURE__ */ new Date();
  return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
}
const Sidebar = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let year;
  let month;
  let monthLabel;
  let days;
  let $selectedDateStore, $$unsubscribe_selectedDateStore;
  $$unsubscribe_selectedDateStore = subscribe(selectedDateStore, (value) => $selectedDateStore = value);
  const quickNotes = [
    { label: "Meeting", icon: "💼" },
    { label: "Birthday", icon: "🎂" },
    { label: "Reminder", icon: "⏰" },
    { label: "Daily", icon: "📅" },
    { label: "Event", icon: "🎉" }
  ];
  let currentDate = /* @__PURE__ */ new Date();
  function getDaysInMonth(year2, month2) {
    const date = new Date(year2, month2, 1);
    const days2 = [];
    const firstDay = new Date(year2, month2, 1).getDay();
    const prevMonthLastDate = new Date(year2, month2, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = new Date(year2, month2 - 1, prevMonthLastDate - i);
      days2.push({
        day: prevMonthLastDate - i,
        date: d,
        dateStr: formatDateISO(d),
        current: false,
        prev: true
      });
    }
    while (date.getMonth() === month2) {
      days2.push({
        day: date.getDate(),
        date: new Date(date),
        dateStr: formatDateISO(date),
        current: true,
        today: isToday(date)
      });
      date.setDate(date.getDate() + 1);
    }
    const remaining = 42 - days2.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year2, month2 + 1, i);
      days2.push({
        day: i,
        date: d,
        dateStr: formatDateISO(d),
        current: false,
        next: true
      });
    }
    return days2;
  }
  year = currentDate.getFullYear();
  month = currentDate.getMonth();
  monthLabel = currentDate.toLocaleString("en-US", { month: "long", year: "numeric" });
  days = getDaysInMonth(year, month);
  $$unsubscribe_selectedDateStore();
  return `<aside class="w-64 flex-shrink-0 flex flex-col bg-base-100 border-r border-base-200 h-full p-4 gap-6"> <button class="btn btn-primary btn-lg rounded-full shadow-md gap-3 w-full justify-start normal-case pl-6" data-svelte-h="svelte-jioxg8"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" class="w-8 h-8"><path d="M12 4V20M20 12H4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg> <span class="text-lg">Create</span></button>  <div class="px-2"><div class="flex items-center justify-between mb-2"><span class="text-sm font-semibold ml-2">${escape(monthLabel)}</span> <div class="flex"><button class="btn btn-xs btn-ghost btn-circle" data-svelte-h="svelte-gvhao4"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg></button> <button class="btn btn-xs btn-ghost btn-circle" data-svelte-h="svelte-t0bb1c"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></button></div></div> <div class="grid grid-cols-7 text-center text-[10px] text-base-content/60 mb-1" data-svelte-h="svelte-1awkled"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div> <div class="grid grid-cols-7 gap-y-1 text-center text-xs">${each(days, ({ day, dateStr, current, today }) => {
    return `<button class="${"w-6 h-6 flex items-center justify-center rounded-full mx-auto transition-colors " + escape(current ? "text-base-content" : "text-base-content/30", true) + " " + escape(
      today ? "bg-primary text-primary-content" : "hover:bg-primary/20 cursor-pointer",
      true
    ) + " " + escape(
      $selectedDateStore === dateStr ? "ring-2 ring-primary ring-offset-1" : "",
      true
    )}">${escape(day)} </button>`;
  })}</div></div>  <div class="flex-1 overflow-y-auto"><h3 class="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-3 px-2" data-svelte-h="svelte-yjykgx">Quick Notes</h3> <ul class="menu bg-base-100 w-full p-0 gap-1">${each(quickNotes, (note) => {
    return `<li><button class="flex gap-3 active:bg-primary active:text-primary-content"><span class="text-xl">${escape(note.icon)}</span> <span class="font-medium">${escape(note.label)}</span></button> </li>`;
  })}</ul></div></aside>`;
});
const Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<div class="flex h-screen bg-base-100 overflow-hidden">${validate_component(Sidebar, "Sidebar").$$render($$result, {}, {}, {})} <main class="flex-1 flex flex-col min-w-0 overflow-hidden relative p-4">${slots.default ? slots.default({}) : ``}</main></div>`;
});
export {
  Layout as default
};
