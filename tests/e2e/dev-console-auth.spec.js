import { test, expect } from "playwright/test";

test("unauthenticated user is redirected away from dev console", async ({ page }) => {
  await page.goto("/dev-console/users");
  await expect(page).toHaveURL(/\/login|\/dev-login/);
});

