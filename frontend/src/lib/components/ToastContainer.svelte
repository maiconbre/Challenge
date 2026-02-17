<script lang="ts">
    import { toastStore } from "$lib/stores";
    import Icon from "./Icon.svelte";
</script>

<div class="gcal-snackbar" role="status" aria-live="polite">
    {#each $toastStore as toast (toast.id)}
        <div class="gcal-snackbar-item {toast.type}">
            {#if toast.type === "success"}
                <Icon
                    name="check-circle"
                    size={20}
                    className="flex-shrink-0 text-[#81c995]"
                />
            {:else if toast.type === "error"}
                <Icon
                    name="error"
                    size={20}
                    className="flex-shrink-0 text-[#f28b82]"
                />
            {:else if toast.type === "warning"}
                <Icon
                    name="warning"
                    size={20}
                    className="flex-shrink-0 text-[#fdd663]"
                />
            {:else}
                <Icon
                    name="info"
                    size={20}
                    className="flex-shrink-0 text-[#8ab4f8]"
                />
            {/if}
            <span>{toast.message}</span>
            {#if toast.status}
                <span class="text-xs gcal-text-muted-color ml-auto"
                    >HTTP {toast.status}</span
                >
            {/if}
        </div>
    {/each}
</div>
