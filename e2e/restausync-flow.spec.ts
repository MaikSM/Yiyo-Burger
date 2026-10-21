import { test, expect } from '@playwright/test';

test.describe('RestauSync E2E User Flow', () => {

  test('debe cargar la página de inicio de sesión correctamente', async ({ page }) => {
    // 1. Navegar a la página de login
    await page.goto('/auth/login');

    // 2. Verificar título y elementos principales
    const heading = page.locator('h2');
    await expect(heading).toContainText('Iniciar Sesión');

    const emailInput = page.locator('input[formcontrolname="email"]');
    const passwordInput = page.locator('input[formcontrolname="password"]');
    const submitButton = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toContainText('Ingresar');
  });

  test('debe permitir navegar entre login y el formulario de registro', async ({ page }) => {
    await page.goto('/auth/login');

    // Hacer clic en el enlace de registro
    const registerLink = page.locator('a[routerlink="/auth/register"]');
    await expect(registerLink).toBeVisible();
    await registerLink.click();

    // Verificar redirección a /auth/register
    await expect(page).toHaveURL(/.*auth\/register/);
  });

  test('debe permitir navegar a la pantalla de recuperación de contraseña', async ({ page }) => {
    await page.goto('/auth/login');

    // Hacer clic en recuperación de contraseña
    const recoveryLink = page.locator('a[routerlink="/auth/recuperar-contrasena"]');
    await expect(recoveryLink).toBeVisible();
    await recoveryLink.click();

    // Verificar redirección a /auth/recuperar-contrasena
    await expect(page).toHaveURL(/.*auth\/recuperar-contrasena/);
  });
});
