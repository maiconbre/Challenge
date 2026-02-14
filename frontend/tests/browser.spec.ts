import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4173';

let eventIdCounter = 0;

/**
 * Sets up API mock as fallback.
 * Tries real API first; if unavailable, uses in-memory mock.
 */
async function setupApiMock(page: import('@playwright/test').Page) {
    const mockEvents: Array<{
        id: string;
        title: string;
        start: string;
        end: string;
        color?: string;
        location?: string;
    }> = [];

    // Mock /api/events (GET + POST)
    await page.route('**/api/events', async (route) => {
        const method = route.request().method();

        if (method === 'GET') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(mockEvents),
            });
        } else if (method === 'POST') {
            const body = route.request().postDataJSON();
            const newEvent = {
                id: `test-${++eventIdCounter}`,
                title: body.title,
                start: body.start,
                end: body.end,
                color: body.color || '#3b82f6',
                location: body.location || '',
            };
            mockEvents.push(newEvent);
            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify(newEvent),
            });
        } else {
            await route.fulfill({ status: 200 });
        }
    });

    // Mock /api/events/:id (DELETE + PUT)
    await page.route('**/api/events/**', async (route) => {
        const method = route.request().method();

        if (method === 'DELETE') {
            const url = route.request().url();
            const id = url.split('/').pop() || '';
            const idx = mockEvents.findIndex((e) => e.id === id);
            if (idx !== -1) mockEvents.splice(idx, 1);
            await route.fulfill({ status: 200 });
        } else if (method === 'PUT') {
            await route.fulfill({ status: 200 });
        } else {
            await route.fulfill({ status: 200 });
        }
    });
}

/**
 * Helper: creates an event via the UI and waits for it to appear.
 */
async function createEventViaUI(page: import('@playwright/test').Page, title: string) {
    const timeSlot = page.locator('[role="gridcell"]').first();
    await timeSlot.click();
    await page.waitForTimeout(500);

    const titleInput = page.locator('input[placeholder*="Meeting"]');
    await titleInput.fill(title);

    const createButton = page.locator('[role="dialog"] button').filter({ hasText: 'Create' });
    await createButton.click();
    await page.waitForTimeout(1500);
}

test.describe('Calendar Application', () => {
    test.beforeEach(async ({ page }) => {
        await setupApiMock(page);
        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');
    });

    // ─── Navigation & Layout Tests ───────────────────────────────

    test('should load the page and display the week view', async ({ page }) => {
        const header = page.locator('header');
        await expect(header).toBeVisible();

        const todayButton = page.getByRole('button', { name: /Today/i });
        await expect(todayButton).toBeVisible();

        // Week view container in main area
        const weekView = page.locator('main .select-none');
        await expect(weekView).toBeVisible();

        // 7 weekday headers (Sun-Sat)
        const dayHeaders = page.locator('main .text-xs.uppercase.font-semibold');
        await expect(dayHeaders).toHaveCount(7);
    });

    test('should navigate to previous and next week', async ({ page }) => {
        const headerLabel = page.locator('h2');
        const initialLabel = await headerLabel.textContent();

        const nextButton = page.getByRole('button', { name: /Next/i });
        await nextButton.click();
        await page.waitForTimeout(500);

        const prevButton = page.getByRole('button', { name: /Previous/i });
        await prevButton.click();
        await page.waitForTimeout(500);

        const labelAfterReturn = await headerLabel.textContent();
        expect(labelAfterReturn).toBe(initialLabel);
    });

    test('should navigate to today when clicking Today button', async ({ page }) => {
        const nextButton = page.getByRole('button', { name: /Next/i });
        await nextButton.click();
        await nextButton.click();
        await page.waitForTimeout(500);

        const todayButton = page.getByRole('button', { name: /Today/i });
        await todayButton.click();
        await page.waitForTimeout(500);

        const todayHighlight = page.locator('main .bg-primary.text-primary-content');
        await expect(todayHighlight).toBeVisible();
    });

    test('should switch between week and month views', async ({ page }) => {
        const viewDropdown = page.locator('label.btn.btn-outline');
        await viewDropdown.click();

        const monthOption = page.locator('ul.dropdown-content li').filter({ hasText: 'Month' });
        await monthOption.click();
        await page.waitForTimeout(500);

        const monthGrid = page.locator('main .grid-rows-6');
        await expect(monthGrid).toBeVisible();

        await viewDropdown.click();
        const weekOption = page.locator('ul.dropdown-content li').filter({ hasText: 'Week' });
        await weekOption.click();
        await page.waitForTimeout(500);

        const weekView = page.locator('main .select-none');
        await expect(weekView).toBeVisible();
    });

    // ─── Event CRUD Tests ────────────────────────────────────────

    test('should open create event modal when clicking a time slot', async ({ page }) => {
        const timeSlot = page.locator('[role="gridcell"]').first();
        await timeSlot.click();
        await page.waitForTimeout(500);

        const modalTitle = page.getByText('Create Event');
        await expect(modalTitle).toBeVisible();

        const titleInput = page.locator('input[placeholder*="Meeting"]');
        await expect(titleInput).toBeVisible();

        const cancelButton = page.locator('[role="dialog"] button').filter({ hasText: 'Cancel' });
        await expect(cancelButton).toBeVisible();

        const createBtn = page.locator('[role="dialog"] button').filter({ hasText: 'Create' });
        await expect(createBtn).toBeVisible();
    });

    test('should create a new event', async ({ page }) => {
        await createEventViaUI(page, 'Test Meeting');

        // Success toast should appear
        const toast = page.locator('.alert-success');
        await expect(toast).toBeVisible({ timeout: 5000 });

        // Event should appear on the calendar
        const eventEl = page.locator('main [role="button"]').filter({ hasText: 'Test Meeting' });
        await expect(eventEl).toBeVisible({ timeout: 5000 });
    });

    test('should open event detail modal when clicking an event', async ({ page }) => {
        await createEventViaUI(page, 'Clickable Event');

        // Click the event using the role=button container (events use mousedown/mouseup)
        const eventEl = page.locator('main [role="button"]').filter({ hasText: 'Clickable Event' });
        await expect(eventEl).toBeVisible({ timeout: 5000 });
        await eventEl.click();
        await page.waitForTimeout(500);

        // Event detail modal should open
        const updateButton = page.getByRole('button', { name: /Update/i });
        await expect(updateButton).toBeVisible({ timeout: 5000 });

        const deleteButton = page.getByRole('button', { name: /Delete/i });
        await expect(deleteButton).toBeVisible();
    });

    test('should delete an event', async ({ page }) => {
        await createEventViaUI(page, 'Event To Delete');

        // Click the event
        const eventEl = page.locator('main [role="button"]').filter({ hasText: 'Event To Delete' });
        await expect(eventEl).toBeVisible({ timeout: 5000 });
        await eventEl.click();
        await page.waitForTimeout(500);

        // Setup dialog handler before clicking delete
        page.on('dialog', async (dialog) => {
            await dialog.accept();
        });

        const deleteButton = page.getByRole('button', { name: 'Delete', exact: true });
        await deleteButton.click();
        await page.waitForTimeout(1000);

        // Success toast should appear
        const toast = page.locator('.alert-success').first();
        await expect(toast).toBeVisible({ timeout: 5000 });
    });

    // ─── Sidebar Tests ───────────────────────────────────────────

    test('should create event from sidebar button', async ({ page }) => {
        const sidebarCreate = page.locator('aside button').filter({ hasText: 'Create' });
        await sidebarCreate.click();
        await page.waitForTimeout(500);

        const modalTitle = page.getByText('Create Event');
        await expect(modalTitle).toBeVisible();
    });

    test('should display time axis with hours', async ({ page }) => {
        const hourLabel8 = page.getByText('08:00');
        await expect(hourLabel8).toBeVisible();

        const hourLabel12 = page.getByText('12:00');
        await expect(hourLabel12).toBeVisible();
    });

    test('should display sidebar mini calendar', async ({ page }) => {
        const sidebar = page.locator('aside');
        await expect(sidebar).toBeVisible();

        const monthLabel = sidebar.locator('.text-sm.font-semibold');
        await expect(monthLabel).toBeVisible();

        const dayHeaders = sidebar.locator('.grid.grid-cols-7').first();
        await expect(dayHeaders).toBeVisible();
    });

    test('should show quick notes in sidebar', async ({ page }) => {
        const quickNotes = page.getByText('Quick Notes');
        await expect(quickNotes).toBeVisible();

        const meetingNote = page.locator('aside').getByText('Meeting');
        await expect(meetingNote).toBeVisible();
    });
});
