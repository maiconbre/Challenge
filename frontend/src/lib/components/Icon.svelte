<script lang="ts">
    /**
     * Reusable SVG icon component.
     * Usage: <Icon name="close" size={20} />
     */
    export let name: string;
    export let size: number = 20;
    export let className: string = "";

    const icons: Record<string, string> = {
        close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
        clock: "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z",
        "clock-hands": "M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z",
        calendar:
            "M7 11H9V13H7V11M21 5V19C21 20.11 20.11 21 19 21H5C3.89 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H6V1H8V3H16V1H18V3H19C20.11 3 21 3.9 21 5M5 7H19V5H5V7M19 19V9H5V19H19M15 13H17V11H15V13M11 13H13V11H11V13Z",
        location:
            "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
        bell: "M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z",
        description:
            "M14 17H4V19H14V17M20 9H4V11H20V9M20 13H4V15H20V13M4 5V7H20V5H4Z",
        palette:
            "M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z",
        "check-circle":
            "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z",
        error: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z",
        warning: "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
        info: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
        "chevron-left": "",
        "chevron-right": "",
        "chevron-down": "",
        plus: "M28.5 16.5H19.5V7.5H16.5V16.5H7.5V19.5H16.5V28.5H19.5V19.5H28.5V16.5Z",
        menu: "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",
    };

    // SVG path icons that use stroke instead of fill
    const strokeIcons: Record<string, { d: string; viewBox?: string }> = {
        "chevron-left": { d: "M15 19l-7-7 7-7" },
        "chevron-right": { d: "M9 5l7 7-7 7" },
        "chevron-down": { d: "M6 9l6 6 6-6" },
        "chevron-up": { d: "M5 15l7-7 7 7" },
        "plus-sm": { d: "M12 4v16m8-8H4" },
    };

    $: isStroke = name in strokeIcons;
    $: path = isStroke ? strokeIcons[name]?.d : icons[name];
</script>

{#if isStroke}
    <svg
        class={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
    >
        <path d={path}></path>
    </svg>
{:else if name === "clock"}
    <svg
        class={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
    >
        <path d={icons["clock"]} />
        <path d={icons["clock-hands"]} />
    </svg>
{:else}
    <svg
        class={className}
        width={size}
        height={size}
        viewBox={name === "plus" ? "0 0 36 36" : "0 0 24 24"}
        fill="currentColor"
    >
        <path d={path} />
    </svg>
{/if}
