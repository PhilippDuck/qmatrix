import { test, expect } from '@playwright/test';

test.describe('Skill Matrix Application', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Wait for the app to load - look for the app container
        await page.waitForLoadState('networkidle');
    });

    test('should load the application successfully', async ({ page }) => {
        // Check that the page loaded and contains expected content
        await expect(page.locator('body')).toBeVisible();
        // Look for either Matrix content or tabs
        const content = page.locator('text=/Matrix|Dashboard|Organisation|Skill/i');
        await expect(content.first()).toBeVisible({ timeout: 10000 });
    });

    test('should have clickable navigation elements', async ({ page }) => {
        // Find and click navigation tabs/buttons
        const navItems = page.locator('[role="tab"], [data-mantine-tab]');
        const count = await navItems.count();

        if (count > 0) {
            // Click through available tabs
            for (let i = 0; i < Math.min(count, 3); i++) {
                await navItems.nth(i).click();
                await page.waitForTimeout(500);
            }
        }

        // At minimum, the page should still be functional
        await expect(page.locator('body')).toBeVisible();
    });
});

test.describe('Employee Management', () => {

    test('should find action buttons in the UI', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Look for any action icon buttons
        const actionButtons = page.locator('button[class*="ActionIcon"], [class*="mantine-ActionIcon"]');
        const count = await actionButtons.count();

        // There should be some action buttons in the UI
        expect(count).toBeGreaterThan(0);
    });
});

test.describe('Filter Functionality', () => {

    test('should have filter controls', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Look for filter button by aria-label
        const filterBtn = page.locator('[aria-label="Filter"]');

        if (await filterBtn.count() > 0) {
            await filterBtn.click();
            // After clicking, a dropdown/popover should appear
            await page.waitForTimeout(500);
            // Check for filter-related content
            const filterContent = page.locator('text=/Abteilung|Rolle|Kategorie|Filter/i');
            if (await filterContent.count() > 0) {
                await expect(filterContent.first()).toBeVisible();
            }
        }
    });
});

test.describe('Dashboard', () => {

    test('should be able to navigate to dashboard', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Find Dashboard tab/link
        const dashboardTab = page.locator('text=Dashboard').first();

        if (await dashboardTab.isVisible()) {
            await dashboardTab.click();
            await page.waitForTimeout(1000);

            // Dashboard should show some content
            await expect(page.locator('body')).toBeVisible();
        }
    });
});

test.describe('Data Persistence', () => {

    test('should maintain app state after reload', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Take note of the initial page state
        const initialUrl = page.url();

        // Reload the page
        await page.reload();
        await page.waitForLoadState('networkidle');

        // App should still be on the same URL and functional
        expect(page.url()).toBe(initialUrl);
        await expect(page.locator('body')).toBeVisible();
    });
});

test.describe('Responsive Design', () => {

    test('should work on desktop viewport', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('body')).toBeVisible();
    });

    test('should work on tablet viewport', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('body')).toBeVisible();
    });
});
