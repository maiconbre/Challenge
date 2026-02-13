<script lang="ts">
    import "../app.css";
    import Sidebar from "$lib/components/Sidebar.svelte";
</script>

<div class="flex h-screen bg-base-100 overflow-hidden">
    <Sidebar />
    <main class="flex-1 flex flex-col min-w-0 overflow-hidden relative p-4">
        <slot />
    </main>
</div>
