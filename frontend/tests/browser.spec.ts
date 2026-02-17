import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:4173";

let eventIdCounter = 0;

/**
 * Sets up API mock as fallback.
 * Tries real API first; if unavailable, uses in-memory mock.
 */
async function setupApiMock(page: import("@playwright/test").Page) {
  const mockEvents: Array<{
    id: string;
    title: string;
    start: string;
    end: string;
    color?: string;
    location?: string;
  }> = [];

  // Mock /api/events (GET + POST)
  await page.route("**/api/events", async (route) => {
    const method = route.request().method();

    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockEvents),
      });
    } else if (method === "POST") {
      const body = route.request().postDataJSON();
      const newEvent = {
        id: `test-${++eventIdCounter}`,
        title: body.title,
        start: body.start,
        end: body.end,
        color: body.color || "#8ab4f8",
        location: body.location || "",
      };
      mockEvents.push(newEvent);
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(newEvent),
      });
    } else {
      await route.fulfill({ status: 200 });
    }
  });

  // Mock /api/events/:id (DELETE + PUT)
  await page.route("**/api/events/**", async (route) => {
    const method = route.request().method();

    if (method === "DELETE") {
      const url = route.request().url();
      const id = url.split("/").pop() || "";
      const idx = mockEvents.findIndex((e) => e.id === id);
      if (idx !== -1) mockEvents.splice(idx, 1);
      await route.fulfill({ status: 200 });
    } else if (method === "PUT") {
      await route.fulfill({ status: 200 });
    } else {
      await route.fulfill({ status: 200 });
    }
  });
}

/**
 * Helper: creates an event via the UI and waits for it to appear.
 */
async function createEventViaUI(
  page: import("@playwright/test").Page,
  title: string,
) {
  const timeSlot = page.getByTestId("time-slot").first();
  await timeSlot.click();
  await page.waitForTimeout(500);

  const titleInput = page.getByTestId("event-title-input");
  await titleInput.fill(title);

  const saveButton = page.getByTestId("event-save-btn");
  await saveButton.click();
  await page.waitForTimeout(1500);
}

test.describe("Calendar Application", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMock(page);
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
  });

  // ─── Navigation & Layout Tests ───────────────────────────────

  test("should load the page and display the week view", async ({ page }) => {
    const header = page.locator("header");
    await expect(header).toBeVisible();

    const todayButton = page.getByTestId("today-btn");
    await expect(todayButton).toBeVisible();

    // Week view container in main area
    const weekView = page.getByTestId("week-view");
    await expect(weekView).toBeVisible();

    // 7 weekday headers
    const dayHeaders = page.getByTestId("day-header");
    await expect(dayHeaders).toHaveCount(7);
  });

  test("should navigate to previous and next week", async ({ page }) => {
    const headerLabel = page.getByTestId("header-label");
    const initialLabel = await headerLabel.textContent();

    const nextButton = page.getByTestId("next-btn");
    await nextButton.click();
    await page.waitForTimeout(500);

    const prevButton = page.getByTestId("prev-btn");
    await prevButton.click();
    await page.waitForTimeout(500);

    const labelAfterReturn = await headerLabel.textContent();
    expect(labelAfterReturn).toBe(initialLabel);
  });

  test("should navigate to today when clicking Today button", async ({
    page,
  }) => {
    const nextButton = page.getByTestId("next-btn");
    await nextButton.click();
    await nextButton.click();
    await page.waitForTimeout(500);

    const todayButton = page.getByTestId("today-btn");
    await todayButton.click();
    await page.waitForTimeout(500);

    // Today should have the blue circle (Google Calendar style)
    const todayHighlight = page.locator(
      'main [style*="background-color: var(--gcal-today-bg)"]',
    );
    await expect(todayHighlight.first()).toBeVisible();
  });

  test("should switch between week and month views", async ({ page }) => {
    const viewDropdown = page.getByTestId("view-switcher");
    await viewDropdown.click();
    await page.waitForTimeout(300);

    // Click Month option
    await page.getByTestId("view-month").click();
    await page.waitForTimeout(500);

    // Month grid should be visible
    const monthGrid = page.locator("main .grid-rows-6");
    await expect(monthGrid).toBeVisible();

    // Switch back
    await viewDropdown.click();
    await page.waitForTimeout(300);
    await page.getByTestId("view-week").click();
    await page.waitForTimeout(500);

    const weekView = page.getByTestId("week-view");
    await expect(weekView).toBeVisible();
  });

  // ─── Event CRUD Tests ────────────────────────────────────────

  test("should open create event modal when clicking a time slot", async ({
    page,
  }) => {
    const timeSlot = page.getByTestId("time-slot").first();
    await timeSlot.click();
    await page.waitForTimeout(500);

    // Modal should be visible
    const modal = page.locator(".gcal-modal");
    await expect(modal).toBeVisible();

    const titleInput = page.getByTestId("event-title-input");
    await expect(titleInput).toBeVisible();

    const saveBtn = page.getByTestId("event-save-btn");
    await expect(saveBtn).toBeVisible();
  });

  test("should create a new event", async ({ page }) => {
    await createEventViaUI(page, "Test Meeting");

    // Success snackbar should appear
    const toast = page.locator(".gcal-snackbar-item.success");
    await expect(toast).toBeVisible({ timeout: 5000 });

    // Event should appear on the calendar
    const eventEl = page
      .locator('main [role="button"]')
      .filter({ hasText: "Test Meeting" });
    await expect(eventEl).toBeVisible({ timeout: 5000 });
  });

  test("should open event detail modal when clicking an event", async ({
    page,
  }) => {
    await createEventViaUI(page, "Clickable Event");

    const eventEl = page
      .locator('main [role="button"]')
      .filter({ hasText: "Clickable Event" });
    await expect(eventEl).toBeVisible({ timeout: 5000 });
    await eventEl.click({ delay: 200 });
    await page.waitForTimeout(500);

    // Event detail modal should open
    const updateButton = page.getByTestId("event-save-btn");
    await expect(updateButton).toBeVisible({ timeout: 5000 });

    const deleteButton = page.getByTestId("event-delete-btn");
    await expect(deleteButton).toBeVisible();
  });

  test("should delete an event", async ({ page }) => {
    await createEventViaUI(page, "Event To Delete");

    const eventEl = page
      .locator('main [role="button"]')
      .filter({ hasText: "Event To Delete" });
    await expect(eventEl).toBeVisible({ timeout: 5000 });
    await eventEl.click();
    await page.waitForTimeout(500);

    // Click delete in details modal
    const deleteButton = page.getByTestId("event-delete-btn");
    await deleteButton.click();

    // Wait for custom confirmation modal
    const confirmModal = page.getByTestId("delete-confirm-modal");
    await expect(confirmModal).toBeVisible();

    // Confirm delete
    const confirmBtn = page.getByTestId("confirm-delete-btn");
    await confirmBtn.click();

    // Success snackbar should appear with specific text to avoid race with creation toast
    const toast = page
      .locator(".gcal-snackbar-item.success")
      .filter({ hasText: "Event deleted successfully" });
    await expect(toast).toBeVisible({ timeout: 5000 });
  });

  // ─── Sidebar Tests ───────────────────────────────────────────

  test("should create event from sidebar button", async ({ page }) => {
    const sidebarCreate = page.locator("aside .gcal-create-btn");
    await sidebarCreate.click();
    await page.waitForTimeout(500);

    const modal = page.locator(".gcal-modal");
    await expect(modal).toBeVisible();
  });

  test("should display time axis with hours", async ({ page }) => {
    const hourLabel8 = page.getByText("08:00");
    await expect(hourLabel8).toBeVisible();

    const hourLabel12 = page.getByText("12:00");
    await expect(hourLabel12).toBeVisible();
  });

  test("should display sidebar mini calendar", async ({ page }) => {
    const sidebar = page.locator("aside");
    await expect(sidebar).toBeVisible();

    const monthLabel = sidebar.locator(".text-sm.font-medium");
    await expect(monthLabel).toBeVisible();

    const dayHeaders = sidebar.locator(".grid.grid-cols-7").first();
    await expect(dayHeaders).toBeVisible();
  });

  test("should show my calendars in sidebar", async ({ page }) => {
    const myCalendars = page.getByText("My calendars");
    await expect(myCalendars).toBeVisible();

    const personalCal = page.locator("aside").getByText("Personal");
    await expect(personalCal).toBeVisible();
  });
});
