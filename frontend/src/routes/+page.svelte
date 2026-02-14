<script lang="ts">
    import { onMount } from "svelte";
    import type { CalendarEvent } from "$lib/types";
    import {
        fetchEvents,
        createEvent,
        deleteEvent,
        updateEvent,
    } from "$lib/api";
    import {
        createModalStore,
        openCreateModal,
        closeCreateModal,
        type Toast,
        toastStore,
        showToast,
        selectedDateStore,
        setSelectedDate,
    } from "$lib/stores";
    import {
        WEEKDAYS,
        HOURS,
        PIXELS_PER_HOUR,
        formatDateISO,
        getTodayISO,
        getMonthLabel,
        buildCalendarDays,
        getDatePart,
        getTimePart,
        getHourAndMinute,
        calculatePixelTop,
        calculateDurationMinutes,
        addWeeks,
        subWeeks,
        addMonths,
        subMonths,
        addDays,
        subDays,
    } from "$lib/utils/dateUtils";

    import WeekView from "$lib/components/WeekView.svelte";
    import MonthView from "$lib/components/MonthView.svelte";

    let events: CalendarEvent[] = [];
    let currentDate = new Date();
    let viewMode: "week" | "month" = "week";
    let loading = true;
    let eventsVersion = 0;

    // Modal state
    let showEventModal = false;
    let selectedEvent: CalendarEvent | null = null;

    // Confirmation Modal State
    let showConfirmModal = false;
    let pendingDropEvent: {
        event: CalendarEvent;
        newStart: Date;
        newEnd: Date;
    } | null = null;

    // Explicitly typed toast variable for template
    // Removed redundant toasts variable

    // Computed properties
    $: currentYear = currentDate.getFullYear();
    $: currentMonth = currentDate.getMonth();

    // Header Label based on View Mode
    $: headerLabel = (() => {
        return getMonthLabel(currentDate);
    })();

    // CRITICAL: Ensure events reactivity - any change to events array triggers re-render
    $: eventCount = events.length;

    // Store subscription
    $: selectedDate = $selectedDateStore;
    $: if (selectedDate) {
        currentDate = new Date(`${selectedDate}T00:00:00`);
    }

    // Navigation
    function prevPeriod(): void {
        if (viewMode === "week") {
            currentDate = subWeeks(currentDate, 1);
        } else {
            currentDate = subMonths(currentDate, 1);
        }
    }

    function nextPeriod(): void {
        if (viewMode === "week") {
            currentDate = addWeeks(currentDate, 1);
        } else {
            currentDate = addMonths(currentDate, 1);
        }
    }

    function goToday(): void {
        const today = new Date();
        currentDate = today;
        setSelectedDate(getTodayISO());
    }

    function formatDateTimeLocal(date: Date): string {
        const dateStr = formatDateISO(date);
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${dateStr}T${hours}:${minutes}:00`;
    }

    // Drag and Drop Logic for Page (updates via API)
    function handleEventDrop(event: CustomEvent) {
        const {
            event: calendarEvent,
            newHour,
            newMinute,
            newStart: droppedStart,
        } = event.detail;

        let newStart: Date;

        if (droppedStart) {
            // Week View logic provides full date
            newStart = droppedStart;
        } else {
            // Fallback (should not happen without DayView, but keep safe)
            const dateStr = selectedDate;
            newStart = new Date(
                `${dateStr}T${String(newHour).padStart(2, "0")}:${String(newMinute).padStart(2, "0")}:00`,
            );
        }

        const originalStart = new Date(calendarEvent.start);
        const originalEnd = new Date(calendarEvent.end);
        const durationMs = originalEnd.getTime() - originalStart.getTime();

        const newEnd = new Date(newStart.getTime() + durationMs);

        // Store pending logic and show confirmation modal
        pendingDropEvent = {
            event: calendarEvent,
            newStart,
            newEnd,
        };
        showConfirmModal = true;
    }

    async function confirmDrop() {
        if (!pendingDropEvent) return;

        const { event: calendarEvent, newStart, newEnd } = pendingDropEvent;

        const updated = {
            ...calendarEvent,
            start: formatDateTimeLocal(newStart),
            end: formatDateTimeLocal(newEnd),
        };

        // Optimistic update
        events = events.map((e) => (e.id === calendarEvent.id ? updated : e));
        eventsVersion += 1;

        // Reset modal state immediately
        showConfirmModal = false;
        pendingDropEvent = null;

        try {
            // API Call
            await updateEvent(calendarEvent.id, {
                start: updated.start,
                end: updated.end,
            });

            showToast("Evento atualizado com sucesso!", "success", 200);
        } catch (error) {
            // Revert
            events = events.map((e) =>
                e.id === calendarEvent.id ? calendarEvent : e,
            );
            eventsVersion += 1;
            showToast("Erro ao mover evento", "error", 500);
        }
    }

    function cancelDrop() {
        showConfirmModal = false;
        pendingDropEvent = null;
    }

    // Modal handlers
    function openCreateForDay(dateStr?: string, hour?: number): void {
        const d = dateStr || getTodayISO();
        const h = hour !== undefined ? String(hour).padStart(2, "0") : "09";
        const eh = (hour !== undefined ? hour + 1 : 10).toString();
        openCreateModal("", d, h, eh);
    }

    function openEventDetails(event: CalendarEvent): void {
        selectedEvent = event;
        showEventModal = true;
    }

    // Handle clicks from MonthView/WeekView
    // Handle clicks from MonthView
    function handleDayClick(dateStr: string, hour?: number) {
        // Switch to week view for that day
        setSelectedDate(dateStr);
        currentDate = new Date(dateStr + "T00:00:00");
        viewMode = "week";
    }

    // Wrapper for MonthView dispatch
    function handleMonthDayClick(event: CustomEvent<string>) {
        handleDayClick(event.detail);
    }

    // Wrapper for WeekView dispatch
    function handleWeekDayClick(
        event: CustomEvent<{ dateStr: string; hour: number }>,
    ) {
        // Maybe just open create modal for week view?
        openCreateForDay(event.detail.dateStr, event.detail.hour);
    }

    async function handleCreate(): Promise<void> {
        const { title, startDate, startTime, endDate, endTime } =
            $createModalStore;

        if (!title.trim() || !startDate || !endDate || !startTime || !endTime) {
            showToast("Preencha todos os campos", "warning");
            return;
        }

        try {
            const created = await createEvent({
                title: title.trim(),
                start: `${startDate}T${startTime}:00`,
                end: `${endDate}T${endTime}:00`,
            });

            if (created) {
                // CRITICAL: Force explicit reactivity - reassign to trigger updates
                events = [...events, created];

                // Also update selectedDay to show where event was created
                setSelectedDate(startDate);
                currentDate = new Date(startDate + "T00:00:00"); // Ensure we jump to it as well if needed

                // Show success toast with status code
                showToast(
                    `Evento "${created.title}" criado com sucesso!`,
                    "success",
                    200,
                    4000,
                );

                // Close modal
                closeCreateModal();
            } else {
                showToast(
                    "Erro ao criar evento - resposta vazia do servidor",
                    "error",
                    500,
                );
            }
        } catch (error) {
            console.error("[handleCreate]", error);
            showToast("Erro ao criar evento", "error", 500);
        }
    }

    async function handleDelete(): Promise<void> {
        if (!selectedEvent) return;

        if (!confirm(`Deletar evento "${selectedEvent.title}"?`)) return;

        const success = await deleteEvent(selectedEvent.id);
        if (success) {
            // Force explicit reactivity
            events = events.filter((e) => e.id !== selectedEvent!.id);

            showToast(
                `Evento "${selectedEvent.title}" deletado com sucesso!`,
                "success",
                200,
                3000,
            );
            showEventModal = false;
            selectedEvent = null;
        } else {
            showToast("Erro ao deletar evento", "error", 500);
        }
    }

    function handleEventClick(event: CustomEvent<CalendarEvent>): void {
        openEventDetails(event.detail);
    }

    onMount(async () => {
        events = await fetchEvents();
        // If no date selected, select today?
        if (!$selectedDateStore) {
            setSelectedDate(getTodayISO());
        }
        loading = false;
    });
</script>

<!-- Main Layout -->
<div class="flex flex-col h-screen bg-base-100">
    <!-- Header -->
    <header
        class="flex-none flex items-center justify-between px-6 py-4 border-b border-base-200"
    >
        <div class="flex items-center gap-4">
            <div class="flex items-center gap-4">
                <button
                    class="btn btn-sm btn-outline px-4"
                    on:click={goToday}
                    title="Voltar para hoje"
                >
                    Hoje
                </button>

                <!-- Navigation -->
                <div class="flex items-center gap-1">
                    <button
                        class="btn btn-sm btn-ghost btn-circle"
                        on:click={prevPeriod}
                        title="Anterior"
                    >
                        <svg
                            class="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                    </button>
                    <button
                        class="btn btn-sm btn-ghost btn-circle"
                        on:click={nextPeriod}
                        title="Próximo"
                    >
                        <svg
                            class="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9 5l7 7-7 7"
                            />
                        </svg>
                    </button>
                </div>

                <!-- Display formatted selected date -->
                <h2 class="text-xl font-normal capitalize min-w-[200px]">
                    {headerLabel}
                </h2>
            </div>
        </div>

        <!-- View Switcher -->
        <div class="flex items-center gap-2">
            <!-- Removidos botões de busca e settings -->

            <!-- View Mode Dropdown -->
            <div class="dropdown dropdown-end z-50">
                <label
                    tabindex="0"
                    class="btn btn-outline btn-sm m-1 min-w-[100px] justify-between"
                >
                    {viewMode === "week" ? "Semana" : "Mês"}
                    <svg
                        class="w-4 h-4 ml-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        ><path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 9l-7 7-7-7"
                        /></svg
                    >
                </label>
                <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                <ul
                    tabindex="0"
                    class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52 border border-base-200"
                >
                    <li>
                        <button
                            class={viewMode === "week" ? "active" : ""}
                            on:click={() => (viewMode = "week")}
                            >Semana <span class="text-xs opacity-50 ml-auto"
                                >S</span
                            ></button
                        >
                    </li>
                    <li>
                        <button
                            class={viewMode === "month" ? "active" : ""}
                            on:click={() => (viewMode = "month")}
                            >Mês <span class="text-xs opacity-50 ml-auto"
                                >M</span
                            ></button
                        >
                    </li>
                </ul>
            </div>
        </div>
    </header>

    {#if loading}
        <div class="flex-1 flex items-center justify-center">
            <span class="loading loading-spinner loading-lg"></span>
        </div>
    {:else}
        <!-- Main Content -->
        <div class="flex-1 overflow-hidden relative p-4 flex flex-col">
            {#key eventsVersion}
                <!-- Week View -->
                {#if viewMode === "week"}
                    <WeekView
                        {events}
                        {currentDate}
                        on:eventDrop={handleEventDrop}
                        on:eventClick={handleEventClick}
                        on:dayClick={handleWeekDayClick}
                    />

                    <!-- Month View -->
                {:else}
                    <MonthView
                        {events}
                        {currentDate}
                        on:eventClick={handleEventClick}
                        on:dayClick={handleMonthDayClick}
                    />
                {/if}
            {/key}
            <!-- Removed Floating Action Button -->
        </div>
    {/if}
</div>

<!-- Create Event Modal -->
{#if $createModalStore.isOpen}
    <div class="modal modal-open z-50">
        <div
            class="modal-box max-w-md"
            role="dialog"
            aria-labelledby="create-modal-title"
        >
            <h3 id="create-modal-title" class="text-lg font-bold mb-4">
                Criar Evento
            </h3>

            <div class="form-control w-full">
                <label class="label" for="event-title">
                    <span class="label-text font-semibold">Título</span>
                </label>
                <input
                    id="event-title"
                    type="text"
                    bind:value={$createModalStore.title}
                    placeholder="Ex: Reunião, Almoço..."
                    class="input input-bordered w-full"
                    autofocus
                />
            </div>

            <div class="mt-4 grid grid-cols-2 gap-3">
                <div class="form-control">
                    <label class="label" for="event-start-date">
                        <span class="label-text text-sm">Data Início</span>
                    </label>
                    <input
                        id="event-start-date"
                        type="date"
                        bind:value={$createModalStore.startDate}
                        class="input input-bordered input-sm"
                    />
                </div>
                <div class="form-control">
                    <label class="label" for="event-start-time">
                        <span class="label-text text-sm">Hora Início</span>
                    </label>
                    <input
                        id="event-start-time"
                        type="time"
                        bind:value={$createModalStore.startTime}
                        class="input input-bordered input-sm"
                    />
                </div>
            </div>

            <div class="mt-3 grid grid-cols-2 gap-3">
                <div class="form-control">
                    <label class="label" for="event-end-date">
                        <span class="label-text text-sm">Data Fim</span>
                    </label>
                    <input
                        id="event-end-date"
                        type="date"
                        bind:value={$createModalStore.endDate}
                        class="input input-bordered input-sm"
                    />
                </div>
                <div class="form-control">
                    <label class="label" for="event-end-time">
                        <span class="label-text text-sm">Hora Fim</span>
                    </label>
                    <input
                        id="event-end-time"
                        type="time"
                        bind:value={$createModalStore.endTime}
                        class="input input-bordered input-sm"
                    />
                </div>
            </div>

            <div class="modal-action mt-6">
                <button class="btn btn-outline" on:click={closeCreateModal}
                    >Cancelar</button
                >
                <button class="btn btn-primary" on:click={handleCreate}
                    >Criar</button
                >
            </div>
        </div>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="modal-backdrop" on:click={closeCreateModal} />
    </div>
{/if}

<!-- Confirmation Modal -->
{#if showConfirmModal && pendingDropEvent}
    <div class="modal modal-open z-50">
        <div class="modal-box">
            <h3 class="font-bold text-lg">Confirmar Alteração</h3>
            <p class="py-4">
                Deseja mover o evento <b>"{pendingDropEvent.event.title}"</b>
                para:
                <br />
                <b>
                    {pendingDropEvent.newStart.toLocaleDateString("pt-BR")} às {pendingDropEvent.newStart.toLocaleTimeString(
                        "pt-BR",
                        { hour: "2-digit", minute: "2-digit" },
                    )}
                </b>
                ?
            </p>
            <div class="modal-action">
                <button class="btn btn-outline" on:click={cancelDrop}
                    >Cancelar</button
                >
                <button class="btn btn-primary" on:click={confirmDrop}
                    >Confirmar</button
                >
            </div>
        </div>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="modal-backdrop" on:click={cancelDrop}></div>
    </div>
{/if}

<!-- Event Details Modal -->
{#if showEventModal && selectedEvent}
    <div class="modal modal-open z-50">
        <div
            class="modal-box max-w-sm"
            role="dialog"
            aria-labelledby="event-details-title"
        >
            <div class="flex justify-between items-start mb-4">
                <h3
                    id="event-details-title"
                    class="text-xl font-bold text-blue-600"
                >
                    {selectedEvent.title}
                </h3>
                <button
                    class="btn btn-sm btn-ghost btn-circle"
                    on:click={() => {
                        showEventModal = false;
                        selectedEvent = null;
                    }}
                    aria-label="Fechar"
                >
                    ✕
                </button>
            </div>

            <div class="space-y-4">
                <div class="flex items-start gap-3 text-sm">
                    <svg
                        class="w-5 h-5 text-base-content/60 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M8 7V3m8 4V3m-9 8h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                    </svg>
                    <div>
                        <div class="text-base-content/60 text-xs mb-1">
                            Data e Hora
                        </div>
                        <div class="font-semibold">
                            {new Date(selectedEvent.start).toLocaleDateString(
                                "pt-BR",
                            )}
                        </div>
                        <div class="text-sm text-base-content/80">
                            {new Date(selectedEvent.start).toLocaleTimeString(
                                "pt-BR",
                                {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                },
                            )}
                            -
                            {new Date(selectedEvent.end).toLocaleTimeString(
                                "pt-BR",
                                {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                },
                            )}
                        </div>
                    </div>
                </div>

                <div class="divider my-2" />
            </div>

            <div class="modal-action">
                <button
                    class="btn btn-outline btn-error btn-sm"
                    on:click={handleDelete}
                >
                    <svg
                        class="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                    </svg>
                    Deletar
                </button>
            </div>
        </div>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
            class="modal-backdrop"
            on:click={() => {
                showEventModal = false;
                selectedEvent = null;
            }}
        />
    </div>
{/if}

<!-- Toast Container -->
<div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
    {#each $toastStore as toast (toast.id)}
        <div
            class="alert {toast.type === 'success'
                ? 'alert-success'
                : toast.type === 'error'
                  ? 'alert-error'
                  : toast.type === 'warning'
                    ? 'alert-warning'
                    : 'alert-info'} shadow-lg animate-in slide-in-from-right-4"
        >
            <div class="flex items-start gap-3">
                <div>
                    {#if toast.type === "success"}
                        <svg
                            class="h-6 w-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    {:else if toast.type === "error"}
                        <svg
                            class="h-6 w-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    {:else}
                        <svg
                            class="h-6 w-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    {/if}
                </div>
                <div class="flex-1">
                    <p class="font-semibold">{toast.message}</p>
                    {#if toast.status}
                        <p class="text-xs opacity-75">
                            HTTP {toast.status}
                        </p>
                    {/if}
                </div>
            </div>
        </div>
    {/each}
</div>

<style>
    :global(html, body) {
        height: 100%;
    }
</style>
