import { expect, test } from "@playwright/test";

test("renders the approved tracker and management flows", async ({ page }) => {
  await page.route("**/api/habits/week?start=*", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        weekStart: "2026-08-10",
        days: [
          { date: "2026-08-10", weekday: "Mon", dayOfMonth: 10, isToday: false },
          { date: "2026-08-11", weekday: "Tue", dayOfMonth: 11, isToday: false },
          { date: "2026-08-12", weekday: "Wed", dayOfMonth: 12, isToday: false },
          { date: "2026-08-13", weekday: "Thu", dayOfMonth: 13, isToday: false },
          { date: "2026-08-14", weekday: "Fri", dayOfMonth: 14, isToday: false },
          { date: "2026-08-15", weekday: "Sat", dayOfMonth: 15, isToday: false },
          { date: "2026-08-16", weekday: "Sun", dayOfMonth: 16, isToday: true }
        ],
        groups: [
          {
            slot: "Morning",
            habits: [
              { id: "h1", name: "Drink water", slot: "Morning", status: "Active", completions: {} }
            ]
          }
        ]
      })
    });
  });
  await page.route("**/api/habits", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ id: "h2", name: "Walk", slot: "Midday", status: "Active" })
    });
  });
  await page.route("**/api/habits/h1", async (route) => {
    if (route.request().method() === "DELETE") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ id: "h1", name: "Drink water", slot: "Morning", status: "Archived" })
      });
      return;
    }
    await route.continue();
  });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "pockt habits" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: /Sun 16 Today/ })).toBeVisible();
  await expect(page.getByRole("rowheader", { name: "Drink water" })).toBeVisible();
  const gridMetrics = await page.evaluate(() => {
    const scroller = document.querySelector(".gridScroller");
    const table = document.querySelector(".habitGrid");
    if (!(scroller instanceof HTMLElement) || !(table instanceof HTMLElement)) {
      throw new Error("Habit grid did not render");
    }
    return {
      scrollerWidth: scroller.getBoundingClientRect().width,
      tableWidth: table.getBoundingClientRect().width
    };
  });
  expect(gridMetrics.tableWidth).toBeLessThanOrEqual(gridMetrics.scrollerWidth + 1);

  await page.getByRole("button", { name: "Add habit" }).click();
  const addDialog = page.getByRole("dialog", { name: "Add habit" });
  await addDialog.getByLabel("Habit name").fill("Walk");
  await addDialog.getByLabel("Slot").selectOption("Midday");
  await addDialog.getByRole("button", { name: "Add habit" }).click();

  await page.getByRole("button", { name: "Drink water", exact: true }).click();
  await page.getByRole("button", { name: "Archive habit" }).click();
  await expect(page.getByText("Drink water will disappear from active tracking, but historical check-ins remain.")).toBeVisible();
});
