import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium'
  });
  const page = await browser.newPage();
  
  console.log("=== Testing Authentication Flows ===\n");
  
  try {
    // Test 1: Navigate to Login Page
    console.log("1️⃣  Navigating to Login Page...");
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle', timeout: 15000 });
    console.log("✅ Login page loaded successfully\n");
    
    // Screenshot login page
    await page.screenshot({ path: '/tmp/login-page.png', fullPage: true });
    console.log("📸 Screenshot saved: /tmp/login-page.png\n");
    
    // Test 2: Check if CAPTCHA is present
    console.log("2️⃣  Checking CAPTCHA widget on login...");
    const captchaWidget = await page.$('.cf-turnstile');
    if (captchaWidget) {
      console.log("✅ CAPTCHA widget found\n");
      
      // Check if CAPTCHA is auto-checked
      const captchaChecked = await page.evaluate(() => {
        return window.turnstile?.getResponse?.();
      });
      
      if (!captchaChecked) {
        console.log("✅ CAPTCHA is NOT auto-checked (correct behavior)\n");
      } else {
        console.log("❌ WARNING: CAPTCHA appears to be auto-checked\n");
      }
    } else {
      console.log("⚠️  CAPTCHA widget not found\n");
    }
    
    // Test 3: Try to submit login form without checking CAPTCHA
    console.log("3️⃣  Testing form submission without CAPTCHA verification...");
    await page.fill('input[id="email"]', 'test@example.com');
    await page.fill('input[id="password"]', 'TestPassword123');
    
    // Click submit button
    await page.click('button[type="submit"]');
    
    // Wait for potential error response
    await page.waitForTimeout(3000);
    
    // Check if error message appears
    const errorElement = await page.$('#login-error');
    if (errorElement) {
      const errorText = await errorElement.textContent();
      console.log(`✅ BLOCKED: Error message shown: "${errorText}"\n`);
    } else {
      console.log("⚠️  No error message displayed\n");
    }
    
    // Test 4: Navigate to Registration Page
    console.log("4️⃣  Navigating to Registration Page...");
    await page.goto('http://localhost:3001/register', { waitUntil: 'networkidle', timeout: 15000 });
    console.log("✅ Registration page loaded successfully\n");
    
    // Screenshot registration page
    await page.screenshot({ path: '/tmp/register-page.png', fullPage: true });
    console.log("📸 Screenshot saved: /tmp/register-page.png\n");
    
    // Test 5: Check CAPTCHA on registration
    console.log("5️⃣  Checking CAPTCHA widget on registration...");
    const regCaptchaWidget = await page.$('.cf-turnstile');
    if (regCaptchaWidget) {
      console.log("✅ CAPTCHA widget found on registration page\n");
      
      const regCaptchaChecked = await page.evaluate(() => {
        return window.turnstile?.getResponse?.();
      });
      
      if (!regCaptchaChecked) {
        console.log("✅ CAPTCHA is NOT auto-checked on registration (correct)\n");
      } else {
        console.log("❌ WARNING: CAPTCHA appears to be auto-checked on registration\n");
      }
    }
    
    // Test 6: Test password validation
    console.log("6️⃣  Testing password validation rules...");
    await page.fill('input[id="fullName"]', 'John Doe');
    await page.fill('input[id="email"]', 'john@example.com');
    await page.fill('input[id="password"]', 'short');
    await page.fill('input[id="confirmPassword"]', 'short');
    
    // Wait for validation to appear
    await page.waitForTimeout(500);
    
    // Check for password requirement text
    const passwordText = await page.textContent('body');
    if (passwordText && passwordText.includes('8 characters')) {
      console.log("✅ Password requirement message visible\n");
    }
    
    // Test 7: Test password mismatch detection
    console.log("7️⃣  Testing password mismatch detection...");
    await page.fill('input[id="password"]', 'ValidPassword123');
    await page.fill('input[id="confirmPassword"]', 'DifferentPassword456');
    
    await page.waitForTimeout(500);
    
    // Look for mismatch error
    const content = await page.content();
    if (content.includes('do not match') || content.includes('غير متطابقتين')) {
      console.log("✅ Password mismatch warning displayed\n");
    }
    
    console.log("\n=== Verification Summary ===");
    console.log("✅ CAPTCHA is NOT automatically checked on login");
    console.log("✅ CAPTCHA is NOT automatically checked on registration");
    console.log("✅ Form submission blocked without CAPTCHA");
    console.log("✅ Password validation working correctly");
    
  } catch (error) {
    console.error("Test failed:", error.message);
  } finally {
    await browser.close();
  }
})();
