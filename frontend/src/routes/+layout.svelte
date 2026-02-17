<script lang="ts">
    import "../app.css";
    import Sidebar from "$lib/components/Sidebar.svelte";
    import { sidebarOpenStore } from "$lib/stores";
</script>

<div class="flex h-screen overflow-hidden" style="background-color: var(--gcal-bg); color: var(--gcal-text);">
    {#if $sidebarOpenStore}
        <div class="flex-shrink-0 transition-all duration-200" style="width: 256px;">
            <Sidebar />
        </div>
    {/if}
    <main class="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <slot />
    </main>
</div>
