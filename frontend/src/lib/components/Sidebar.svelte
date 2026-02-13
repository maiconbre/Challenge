<script lang="ts">
    import { openCreateModal } from "$lib/stores";

    const quickNotes = [
        { label: "Reunião", icon: "💼" },
        { label: "Aniversário", icon: "🎂" },
        { label: "Lembrete", icon: "⏰" },
        { label: "Daily", icon: "📅" },
        { label: "Evento", icon: "🎉" },
    ];

    // Mini Calendar Logic
    let currentDate = new Date();
    $: year = currentDate.getFullYear();
    $: month = currentDate.getMonth();
    $: monthLabel = currentDate.toLocaleString("default", {
        month: "long",
        year: "numeric",
    });

    $: days = getDaysInMonth(year, month);

    function getDaysInMonth(year: number, month: number) {
        const date = new Date(year, month, 1);
        const days = [];
        const firstDay = new Date(year, month, 1).getDay();
        const prevMonthLastDate = new Date(year, month, 0).getDate();

        // Prev month days
        for (let i = firstDay - 1; i >= 0; i--) {
            days.push({
                day: prevMonthLastDate - i,
                current: false,
                prev: true,
            });
        }

        // Current month days
        while (date.getMonth() === month) {
            days.push({
                day: date.getDate(),
                current: true,
                today: isToday(date),
            });
            date.setDate(date.getDate() + 1);
        }

        // Next month days (fill up to 42 for 6 rows)
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({ day: i, current: false, next: true });
        }
        return days;
    }

    function isToday(date: Date) {
        const today = new Date();
        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    }

    function prevMonth() {
        currentDate = new Date(year, month - 1, 1);
    }
    function nextMonth() {
        currentDate = new Date(year, month + 1, 1);
    }

    function handleCreate() {
        openCreateModal("", "");
    }

    function handleQuickNote(label: string) {
        openCreateModal(label, "");
    }
</script>

<aside
    class="w-64 flex-shrink-0 flex flex-col bg-base-100 border-r border-base-200 h-full p-4 gap-6"
>
    <!-- Create Button -->
    <button
        class="btn btn-primary btn-lg rounded-full shadow-md gap-3 w-full justify-start normal-case pl-6"
        on:click={handleCreate}
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            class="w-8 h-8"
        >
            <path
                d="M12 4V20M20 12H4"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
        </svg>
        <span class="text-lg">Criar</span>
    </button>

    <!-- Mini Calendar -->
    <div class="px-2">
        <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-semibold ml-2">{monthLabel}</span>
            <div class="flex">
                <button
                    class="btn btn-xs btn-ghost btn-circle"
                    on:click={prevMonth}
                >
                    <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        ><path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M15 19l-7-7 7-7"
                        ></path></svg
                    >
                </button>
                <button
                    class="btn btn-xs btn-ghost btn-circle"
                    on:click={nextMonth}
                >
                    <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        ><path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9 5l7 7-7 7"
                        ></path></svg
                    >
                </button>
            </div>
        </div>
        <div
            class="grid grid-cols-7 text-center text-[10px] text-base-content/60 mb-1"
        >
            <span>D</span><span>S</span><span>T</span><span>Q</span><span
                >Q</span
            ><span>S</span><span>S</span>
        </div>
        <div class="grid grid-cols-7 gap-y-1 text-center text-xs">
            {#each days as { day, current, today }}
                <div
                    class="w-6 h-6 flex items-center justify-center rounded-full mx-auto
                    {current ? 'text-base-content' : 'text-base-content/30'}
                    {today
                        ? 'bg-primary text-primary-content'
                        : 'hover:bg-base-200 cursor-pointer'}"
                >
                    {day}
                </div>
            {/each}
        </div>
    </div>

    <!-- Quick Notes -->
    <div class="flex-1 overflow-y-auto">
        <h3
            class="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-3 px-2"
        >
            Notas Rápidas
        </h3>
        <ul class="menu bg-base-100 w-full p-0 gap-1">
            {#each quickNotes as note}
                <li>
                    <button
                        class="flex gap-3 active:bg-primary active:text-primary-content"
                        on:click={() => handleQuickNote(note.label)}
                    >
                        <span class="text-xl">{note.icon}</span>
                        <span class="font-medium">{note.label}</span>
                    </button>
                </li>
            {/each}
        </ul>
    </div>
</aside>
