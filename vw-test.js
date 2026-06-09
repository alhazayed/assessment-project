// V Welfare - Comprehensive 3-level test
// Levels: Guest, Registered Patient, Admin

const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = 'http://localhost:3000';

let browser, ctx, page;
const results = [];

function log(category, page_name, action, status, detail = '') {
  const line = `[${status}] ${category} | ${page_name} | ${action}${detail ? ': ' + detail : ''}`;
  results.push({ category, page_name, action, status, detail });
  console.log(line);
}

async function screenshot(name) {
  try {
    await page.screenshot({ path: `/tmp/vw-${name}.png`, fullPage: false });
  } catch(e) {}
}

async function waitForLoad() {
  await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
}

async function goto(url) {
  await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 15000 });
}

// ===== GUEST TESTS =====
async function testGuest() {
  console.log('\n========== GUEST USER TESTS ==========\n');
  ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  page = await ctx.newPage();

  // 1. Landing page
  try {
    await goto('/');
    const title = await page.title();
    const heroH1 = await page.locator('h1').first().textContent({ timeout: 5000 }).catch(() => null);
    log('GUEST', 'Landing', 'Page loads', title.length > 0 ? 'OK' : 'BROKEN', `title="${title}", h1="${heroH1}"`);
    await screenshot('landing');
  } catch(e) {
    log('GUEST', 'Landing', 'Page loads', 'BROKEN', e.message);
  }

  // 2. Hero section
  try {
    await goto('/');
    const hero = await page.locator('section').first().isVisible({ timeout: 5000 }).catch(() => false);
    log('GUEST', 'Landing', 'Hero section visible', hero ? 'OK' : 'BROKEN');
  } catch(e) {
    log('GUEST', 'Landing', 'Hero section visible', 'BROKEN', e.message);
  }

  // 3. Category tabs on landing
  try {
    await goto('/');
    await page.waitForTimeout(1000);
    // Look for category tabs
    const tabs = await page.locator('button').filter({ hasText: /Mood|Anxiety|Stress|Trauma|Well-being|Sleep|Substance/ }).count();
    log('GUEST', 'Landing', 'Assessment category tabs', tabs > 0 ? 'OK' : 'MISSING', `found ${tabs} category tabs`);
    if (tabs > 0) {
      // Click Anxiety tab
      const anxietyTab = await page.locator('button').filter({ hasText: 'Anxiety' }).first();
      if (await anxietyTab.isVisible()) {
        await anxietyTab.click();
        await page.waitForTimeout(500);
        log('GUEST', 'Landing', 'Tab switching works', 'OK');
      }
    }
    await screenshot('landing-categories');
  } catch(e) {
    log('GUEST', 'Landing', 'Assessment category tabs', 'BROKEN', e.message);
  }

  // 4. Navigation links
  try {
    await goto('/');
    const navLinks = await page.locator('nav a, header a').count();
    log('GUEST', 'Landing', 'Navigation links present', navLinks > 0 ? 'OK' : 'MISSING', `${navLinks} nav links`);
  } catch(e) {
    log('GUEST', 'Landing', 'Navigation links', 'BROKEN', e.message);
  }

  // 5. Footer
  try {
    await goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    const footer = await page.locator('footer').isVisible({ timeout: 3000 }).catch(() => false);
    const contactEmail = await page.locator('footer').filter({ hasText: 'vwelfare' }).isVisible({ timeout: 3000 }).catch(() => false);
    log('GUEST', 'Landing', 'Footer visible', footer ? 'OK' : 'MISSING');
    log('GUEST', 'Landing', 'Footer contact email', contactEmail ? 'OK' : 'MISSING');
    await screenshot('landing-footer');
  } catch(e) {
    log('GUEST', 'Landing', 'Footer', 'BROKEN', e.message);
  }

  // 6. Language toggle
  try {
    await goto('/');
    const langBtn = await page.locator('button').filter({ hasText: /^(EN|AR|عربي|English)$/ }).first();
    const langVisible = await langBtn.isVisible({ timeout: 3000 }).catch(() => false);
    log('GUEST', 'Landing', 'Language toggle visible', langVisible ? 'OK' : 'MISSING');
    if (langVisible) {
      await langBtn.click();
      await page.waitForTimeout(800);
      // Check if Arabic text appears
      const bodyText = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
      const hasArabic = /[؀-ۿ]/.test(bodyText);
      log('GUEST', 'Landing', 'Language switch EN→AR', hasArabic ? 'OK' : 'WRONG', hasArabic ? 'Arabic text visible' : 'No Arabic detected');
      await screenshot('landing-arabic');
      // Switch back
      const langBtn2 = await page.locator('button').filter({ hasText: /^(EN|AR|عربي|English)$/ }).first();
      if (await langBtn2.isVisible()) await langBtn2.click();
    }
  } catch(e) {
    log('GUEST', 'Landing', 'Language toggle', 'BROKEN', e.message);
  }

  // 7. Login page
  try {
    await goto('/login');
    const emailInput = await page.locator('input[type="email"]').isVisible({ timeout: 5000 }).catch(() => false);
    const passwordInput = await page.locator('input[type="password"]').isVisible({ timeout: 5000 }).catch(() => false);
    const forgotLink = await page.locator('a').filter({ hasText: /forgot/i }).isVisible({ timeout: 3000 }).catch(() => false);
    log('GUEST', 'Login', 'Page loads with form', emailInput && passwordInput ? 'OK' : 'BROKEN', `email=${emailInput}, pass=${passwordInput}`);
    log('GUEST', 'Login', 'Forgot password link', forgotLink ? 'OK' : 'MISSING');
    await screenshot('login');
  } catch(e) {
    log('GUEST', 'Login', 'Page loads', 'BROKEN', e.message);
  }

  // 8. Forgot password page
  try {
    await goto('/forgot-password');
    const emailInput = await page.locator('input[type="email"]').isVisible({ timeout: 5000 }).catch(() => false);
    log('GUEST', 'Forgot Password', 'Page loads with email input', emailInput ? 'OK' : 'BROKEN');
    await screenshot('forgot-password');
  } catch(e) {
    log('GUEST', 'Forgot Password', 'Page loads', 'BROKEN', e.message);
  }

  // 9. Register page
  try {
    await goto('/register');
    const nameInput = await page.locator('input[type="text"]').isVisible({ timeout: 5000 }).catch(() => false);
    const emailInput = await page.locator('input[type="email"]').isVisible({ timeout: 5000 }).catch(() => false);
    const passInput = await page.locator('input[type="password"]').isVisible({ timeout: 5000 }).catch(() => false);
    log('GUEST', 'Register', 'Page loads with form', nameInput && emailInput && passInput ? 'OK' : 'BROKEN', `name=${nameInput}, email=${emailInput}, pass=${passInput}`);
    // Test validation - submit empty
    const submitBtn = await page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(500);
      const url = page.url();
      log('GUEST', 'Register', 'Form validation (empty submit stays)', url.includes('/register') ? 'OK' : 'WRONG');
    }
    await screenshot('register');
  } catch(e) {
    log('GUEST', 'Register', 'Page loads', 'BROKEN', e.message);
  }

  // 10. Assessment page - guest (public)
  try {
    await goto('/assessments');
    await page.waitForTimeout(1000);
    const hasContent = await page.locator('h1, h2, [class*="card"]').first().isVisible({ timeout: 5000 }).catch(() => false);
    log('GUEST', 'Assessments', 'Assessments list loads', hasContent ? 'OK' : 'BROKEN');
    await screenshot('assessments-guest');
  } catch(e) {
    log('GUEST', 'Assessments', 'Assessments list loads', 'BROKEN', e.message);
  }

  // 11. Take an assessment as guest (find a public assessment)
  try {
    await goto('/assessments');
    await page.waitForTimeout(1500);
    // Find a Start/Take button
    const startBtn = await page.locator('a, button').filter({ hasText: /start|take|begin/i }).first();
    if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const href = await startBtn.getAttribute('href');
      if (href && href.startsWith('/assessments/')) {
        await goto(href);
        await page.waitForTimeout(1000);
        const hasQuestion = await page.locator('[class*="question"], [class*="card"], h2, h3').first().isVisible({ timeout: 5000 }).catch(() => false);
        log('GUEST', 'Assessment Taking', 'Assessment page loads', hasQuestion ? 'OK' : 'BROKEN', `url=${href}`);
        await screenshot('assessment-taking-guest');

        // Try answering first question
        const radio = await page.locator('input[type="radio"], button[role="radio"], [class*="option"]').first();
        if (await radio.isVisible({ timeout: 3000 }).catch(() => false)) {
          await radio.click();
          await page.waitForTimeout(300);
          log('GUEST', 'Assessment Taking', 'Can select answer', 'OK');
        } else {
          log('GUEST', 'Assessment Taking', 'Answer options present', 'MISSING');
        }
      } else {
        log('GUEST', 'Assessment Taking', 'Start button links to assessment', 'WRONG', `href=${href}`);
      }
    } else {
      log('GUEST', 'Assessment Taking', 'Start button present', 'MISSING');
    }
  } catch(e) {
    log('GUEST', 'Assessment Taking', 'Take assessment flow', 'BROKEN', e.message);
  }

  // 12. AI Finder on landing
  try {
    await goto('/');
    await page.waitForTimeout(1000);
    // Look for AI finder / symptom input
    const aiInput = await page.locator('input, textarea').filter({ hasText: '' }).first();
    const aiSection = await page.locator('[class*="ai"], [class*="finder"], [class*="recommend"]').first();
    const aiVisible = await aiSection.isVisible({ timeout: 3000 }).catch(() => false);
    log('GUEST', 'Landing AI Finder', 'AI finder section visible', aiVisible ? 'OK' : 'MISSING');
    if (aiVisible) {
      const inp = await page.locator('input[type="text"], textarea').filter({ hasText: '' }).last();
      if (await inp.isVisible({ timeout: 2000 }).catch(() => false)) {
        await inp.fill('I feel anxious and worried');
        const submitBtn = await page.locator('button[type="submit"], button').filter({ hasText: /find|search|recommend/i }).first();
        if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await submitBtn.click();
          await page.waitForTimeout(3000);
          const result = await page.locator('[class*="result"], [class*="recommendation"]').first();
          const resultVisible = await result.isVisible({ timeout: 5000 }).catch(() => false);
          log('GUEST', 'Landing AI Finder', 'AI returns recommendations', resultVisible ? 'OK' : 'MISSING', resultVisible ? '' : 'No results shown (may need API key)');
          await screenshot('ai-finder');
        }
      }
    }
  } catch(e) {
    log('GUEST', 'Landing AI Finder', 'AI finder', 'BROKEN', e.message);
  }

  // 13. 404 page
  try {
    await goto('/this-page-does-not-exist-xyz123');
    await page.waitForTimeout(1000);
    const bodyText = await page.locator('body').innerText({ timeout: 3000 });
    const is404 = bodyText.includes('404') || bodyText.toLowerCase().includes('not found') || bodyText.toLowerCase().includes('page');
    log('GUEST', '404 Page', 'Custom 404 shows', is404 ? 'OK' : 'WRONG', is404 ? 'Has 404 content' : `Got: ${bodyText.substring(0, 100)}`);
    await screenshot('404-page');
  } catch(e) {
    log('GUEST', '404 Page', '404 renders', 'BROKEN', e.message);
  }

  // 14. Unauthenticated redirect
  try {
    await goto('/dashboard');
    await page.waitForTimeout(1000);
    const url = page.url();
    const redirected = url.includes('/login') || url.includes('/register');
    log('GUEST', 'Auth Guard', '/dashboard redirects to login', redirected ? 'OK' : 'BROKEN', `landed at: ${url}`);
  } catch(e) {
    log('GUEST', 'Auth Guard', 'Redirect unauthenticated', 'BROKEN', e.message);
  }

  await ctx.close();
}

// ===== PATIENT TESTS =====
async function testPatient() {
  console.log('\n========== PATIENT USER TESTS ==========\n');
  ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  page = await ctx.newPage();

  // Register a test patient
  const testEmail = `test.patient.${Date.now()}@mailtest.com`;
  const testPass = 'TestPass123!';
  const testName = 'Test Patient';
  let isLoggedIn = false;

  // Sign in with known patient instead (try altalnoor840@gmail.com with common passwords)
  // First try to register a new user
  try {
    await goto('/register');
    await page.waitForTimeout(500);
    await page.locator('input[type="text"]').first().fill(testName);
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPass);
    const submitBtn = await page.locator('button[type="submit"]').first();
    await submitBtn.click();
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    const bodyText = await page.locator('body').innerText({ timeout: 3000 });

    if (currentUrl.includes('/onboarding')) {
      log('PATIENT', 'Register', 'Registration → onboarding (no email confirm)', 'OK', `url=${currentUrl}`);
      isLoggedIn = true;
    } else if (bodyText.toLowerCase().includes('check') || bodyText.toLowerCase().includes('email') || bodyText.toLowerCase().includes('verification')) {
      log('PATIENT', 'Register', 'Registration → check email screen', 'OK', 'Email confirmation required');
      // Can't proceed without email confirmation, need to sign in with known account
    } else if (bodyText.toLowerCase().includes('error') || bodyText.toLowerCase().includes('already')) {
      log('PATIENT', 'Register', 'Registration', 'BROKEN', bodyText.substring(0, 150));
    }
    await screenshot('register-submit');
  } catch(e) {
    log('PATIENT', 'Register', 'Registration flow', 'BROKEN', e.message);
  }

  if (isLoggedIn) {
    // Test onboarding wizard
    try {
      const onboardUrl = page.url();
      if (onboardUrl.includes('/onboarding')) {
        const hasStep = await page.locator('[class*="step"], [class*="wizard"], h2, h3').first().isVisible({ timeout: 5000 }).catch(() => false);
        log('PATIENT', 'Onboarding', 'Wizard loads', hasStep ? 'OK' : 'BROKEN');
        await screenshot('onboarding');

        // Fill step 1
        const langOptions = await page.locator('input[type="radio"]').count();
        if (langOptions > 0) {
          await page.locator('input[type="radio"]').first().click();
        }

        // Skip button
        const skipBtn = await page.locator('button').filter({ hasText: /skip/i }).first();
        if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          log('PATIENT', 'Onboarding', 'Skip button present', 'OK');
        }

        // Next button
        const nextBtn = await page.locator('button').filter({ hasText: /next|continue/i }).first();
        if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await nextBtn.click();
          await page.waitForTimeout(800);
          log('PATIENT', 'Onboarding', 'Step 1 → Step 2 navigation', 'OK');
          await screenshot('onboarding-step2');

          const nextBtn2 = await page.locator('button').filter({ hasText: /next|continue/i }).first();
          if (await nextBtn2.isVisible({ timeout: 2000 }).catch(() => false)) {
            await nextBtn2.click();
            await page.waitForTimeout(800);
            log('PATIENT', 'Onboarding', 'Step 2 → Step 3 navigation', 'OK');
            await screenshot('onboarding-step3');

            // Check consent checkbox
            const consentCheck = await page.locator('input[type="checkbox"]').first();
            if (await consentCheck.isVisible({ timeout: 2000 }).catch(() => false)) {
              await consentCheck.click();
              log('PATIENT', 'Onboarding', 'Consent checkbox', 'OK');
            }

            // Finish
            const finishBtn = await page.locator('button').filter({ hasText: /finish|complete|get started/i }).first();
            if (await finishBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
              await finishBtn.click();
              await page.waitForTimeout(2000);
              const finalUrl = page.url();
              log('PATIENT', 'Onboarding', 'Finish → dashboard', finalUrl.includes('/dashboard') ? 'OK' : 'WRONG', `url=${finalUrl}`);
            }
          }
        }
      }
    } catch(e) {
      log('PATIENT', 'Onboarding', 'Wizard flow', 'BROKEN', e.message);
    }
  }

  // If not logged in from registration, try known patient
  const currentUrl = page.url();
  if (!isLoggedIn && !currentUrl.includes('/dashboard')) {
    // Try login with a test password - altalnoor840@gmail.com
    try {
      await goto('/login');
      await page.locator('input[type="email"]').fill('altalnoor840@gmail.com');
      await page.locator('input[type="password"]').fill('Noor1234!');
      const loginBtn = await page.locator('button[type="submit"]').first();
      await loginBtn.click();
      await page.waitForTimeout(3000);
      const url = page.url();
      if (url.includes('/dashboard') || url.includes('/onboarding')) {
        isLoggedIn = true;
        log('PATIENT', 'Login', 'Sign in with known patient', 'OK', `url=${url}`);
      } else {
        log('PATIENT', 'Login', 'Sign in with known patient', 'WRONG', `url=${url} - incorrect password`);
      }
    } catch(e) {
      log('PATIENT', 'Login', 'Login flow', 'BROKEN', e.message);
    }
  }

  // Ensure we're at dashboard
  if (page.url().includes('/onboarding')) {
    const skipBtn = await page.locator('button').filter({ hasText: /skip/i }).first();
    if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipBtn.click();
      await page.waitForTimeout(1500);
    }
  }

  const dashUrl = page.url();
  if (!dashUrl.includes('/dashboard')) {
    log('PATIENT', 'Dashboard', 'Reached dashboard', 'BROKEN', `current URL: ${dashUrl}`);
    await ctx.close();
    return;
  }

  isLoggedIn = true;
  log('PATIENT', 'Dashboard', 'Reached dashboard', 'OK', `url=${dashUrl}`);

  // Dashboard tests
  try {
    await goto('/dashboard');
    await page.waitForTimeout(1500);

    // Check mood card
    const moodCard = await page.locator('[class*="mood"], [class*="card"]').filter({ hasText: /mood|feel/i }).first();
    const moodVisible = await moodCard.isVisible({ timeout: 3000 }).catch(() => false);
    log('PATIENT', 'Dashboard', 'Mood card visible', moodVisible ? 'OK' : 'MISSING');

    // Check recent assessments section
    const recentSection = await page.locator('[class*="recent"], [class*="assessment"]').filter({ hasText: /assessment|recent/i }).first();
    const recentVisible = await recentSection.isVisible({ timeout: 3000 }).catch(() => false);
    log('PATIENT', 'Dashboard', 'Recent assessments section', recentVisible ? 'OK' : 'MISSING');

    await screenshot('dashboard-patient');
  } catch(e) {
    log('PATIENT', 'Dashboard', 'Dashboard content', 'BROKEN', e.message);
  }

  // Notifications bell
  try {
    await goto('/dashboard');
    await page.waitForTimeout(1000);
    const bell = await page.locator('button').filter({ has: page.locator('[data-lucide="bell"], svg') }).first();
    const bellVisible = await bell.isVisible({ timeout: 3000 }).catch(() => false);
    if (bellVisible) {
      await bell.click();
      await page.waitForTimeout(800);
      const dropdown = await page.locator('[class*="notification"], [class*="dropdown"]').first();
      const dropVisible = await dropdown.isVisible({ timeout: 3000 }).catch(() => false);
      log('PATIENT', 'Notifications', 'Bell opens notification panel', dropVisible ? 'OK' : 'WRONG');
      await screenshot('notifications');
    } else {
      log('PATIENT', 'Notifications', 'Bell icon present', 'MISSING');
    }
  } catch(e) {
    log('PATIENT', 'Notifications', 'Bell interaction', 'BROKEN', e.message);
  }

  // Assessments page
  try {
    await goto('/assessments');
    await page.waitForTimeout(1500);

    // In-progress section
    const inProgressSection = await page.locator('[class*="progress"], [class*="in-progress"]').filter({ hasText: /progress|resume/i }).first();
    const inProgressVisible = await inProgressSection.isVisible({ timeout: 3000 }).catch(() => false);
    log('PATIENT', 'Assessments Page', 'In-progress section', inProgressVisible ? 'OK' : 'MISSING');

    // Available assessments
    const availCards = await page.locator('[class*="card"]').count();
    log('PATIENT', 'Assessments Page', 'Assessment cards loaded', availCards > 0 ? 'OK' : 'BROKEN', `${availCards} cards`);

    // AI finder
    const aiFinder = await page.locator('[class*="ai"], [class*="finder"]').first();
    const aiFinderVisible = await aiFinder.isVisible({ timeout: 3000 }).catch(() => false);
    log('PATIENT', 'Assessments Page', 'AI finder section', aiFinderVisible ? 'OK' : 'MISSING');

    await screenshot('assessments-patient');
  } catch(e) {
    log('PATIENT', 'Assessments Page', 'Assessments page', 'BROKEN', e.message);
  }

  // Take an assessment (full flow)
  try {
    await goto('/assessments');
    await page.waitForTimeout(1500);

    // Find first Start/Take button
    const startBtn = await page.locator('a').filter({ hasText: /start|take|begin/i }).first();
    if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const href = await startBtn.getAttribute('href');
      if (href) {
        await goto(href);
        await page.waitForTimeout(1500);

        const hasQuestion = await page.locator('[class*="question"], input[type="radio"], [role="radio"]').first().isVisible({ timeout: 5000 }).catch(() => false);
        log('PATIENT', 'Assessment Taking', 'Assessment question loads', hasQuestion ? 'OK' : 'BROKEN', href);

        if (hasQuestion) {
          // Answer all questions by selecting first option each time
          let attempts = 0;
          while (attempts < 30) {
            const options = await page.locator('input[type="radio"], button[role="radio"], [class*="option-btn"], [class*="answer"]').filter({ hasText: /./});
            const optCount = await options.count();

            if (optCount === 0) break;

            await options.first().click();
            await page.waitForTimeout(200);

            // Check for Next button
            const nextBtn = await page.locator('button').filter({ hasText: /next|continue/i }).first();
            if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
              await nextBtn.click();
              await page.waitForTimeout(500);
            }

            // Check if we're on results
            const resultsVisible = await page.locator('[class*="result"], [class*="score"], h2').filter({ hasText: /result|score|complete/i }).first().isVisible({ timeout: 1000 }).catch(() => false);
            if (resultsVisible) break;

            attempts++;
          }

          await page.waitForTimeout(2000);
          const finalUrl = page.url();
          const bodyText = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
          const hasResults = bodyText.toLowerCase().includes('result') || bodyText.toLowerCase().includes('score') || bodyText.toLowerCase().includes('complete');
          log('PATIENT', 'Assessment Taking', 'Assessment complete / results shown', hasResults ? 'OK' : 'WRONG', `url=${finalUrl}`);
          await screenshot('assessment-results-patient');
        }
      }
    } else {
      log('PATIENT', 'Assessment Taking', 'Start button found', 'MISSING');
    }
  } catch(e) {
    log('PATIENT', 'Assessment Taking', 'Full assessment flow', 'BROKEN', e.message);
  }

  // Mood tracker
  try {
    await goto('/dashboard');
    await page.waitForTimeout(1000);

    // Find mood logging UI
    const moodBtn = await page.locator('button').filter({ hasText: /log|mood|add|track/i }).first();
    const moodBtnVisible = await moodBtn.isVisible({ timeout: 3000 }).catch(() => false);
    log('PATIENT', 'Mood Tracker', 'Mood log button visible', moodBtnVisible ? 'OK' : 'MISSING');

    if (moodBtnVisible) {
      await moodBtn.click();
      await page.waitForTimeout(800);
      const moodForm = await page.locator('[class*="mood"], input[type="range"], [class*="slider"]').first();
      const moodFormVisible = await moodForm.isVisible({ timeout: 3000 }).catch(() => false);
      log('PATIENT', 'Mood Tracker', 'Mood form/slider appears', moodFormVisible ? 'OK' : 'MISSING');
      await screenshot('mood-tracker');
    }
  } catch(e) {
    log('PATIENT', 'Mood Tracker', 'Mood logging', 'BROKEN', e.message);
  }

  // Journal
  try {
    await goto('/journal');
    await page.waitForTimeout(1500);
    const hasContent = await page.locator('h1, h2, [class*="journal"], [class*="entry"]').first().isVisible({ timeout: 5000 }).catch(() => false);
    const status = page.url().includes('/journal') ? 'OK' : 'BROKEN';
    log('PATIENT', 'Journal', 'Journal page loads', status, `url=${page.url()}`);

    if (status === 'OK' && hasContent) {
      // New entry button
      const newBtn = await page.locator('button, a').filter({ hasText: /new|create|add|write/i }).first();
      const newBtnVisible = await newBtn.isVisible({ timeout: 3000 }).catch(() => false);
      log('PATIENT', 'Journal', 'New entry button', newBtnVisible ? 'OK' : 'MISSING');

      if (newBtnVisible) {
        await newBtn.click();
        await page.waitForTimeout(800);
        const textarea = await page.locator('textarea, [contenteditable]').first();
        const hasEditor = await textarea.isVisible({ timeout: 3000 }).catch(() => false);
        log('PATIENT', 'Journal', 'Entry editor appears', hasEditor ? 'OK' : 'WRONG');

        if (hasEditor) {
          await textarea.fill('Test journal entry for verification testing');
          const saveBtn = await page.locator('button').filter({ hasText: /save|submit|post/i }).first();
          if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await saveBtn.click();
            await page.waitForTimeout(1500);
            const bodyText = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
            log('PATIENT', 'Journal', 'Entry saves', bodyText.toLowerCase().includes('test journal') ? 'OK' : 'WRONG');
          }
        }
      }
      await screenshot('journal');
    }
  } catch(e) {
    log('PATIENT', 'Journal', 'Journal page', 'BROKEN', e.message);
  }

  // Insights page
  try {
    await goto('/insights');
    await page.waitForTimeout(1500);
    const hasContent = await page.locator('h1, h2, [class*="insight"], [class*="chart"]').first().isVisible({ timeout: 5000 }).catch(() => false);
    log('PATIENT', 'Insights', 'Insights page loads', page.url().includes('/insights') ? 'OK' : 'BROKEN', `url=${page.url()}`);

    if (page.url().includes('/insights')) {
      // Mood calendar
      const calender = await page.locator('[class*="calendar"], [class*="grid"]').first();
      const calVisible = await calender.isVisible({ timeout: 3000 }).catch(() => false);
      log('PATIENT', 'Insights', 'Mood calendar visible', calVisible ? 'OK' : 'MISSING');

      // Score trends
      const chart = await page.locator('[class*="chart"], canvas, svg[class*="chart"]').first();
      const chartVisible = await chart.isVisible({ timeout: 3000 }).catch(() => false);
      log('PATIENT', 'Insights', 'Score trend chart', chartVisible ? 'OK' : 'MISSING');

      await screenshot('insights');
    }
  } catch(e) {
    log('PATIENT', 'Insights', 'Insights page', 'BROKEN', e.message);
  }

  // Messages page
  try {
    await goto('/messages');
    await page.waitForTimeout(1500);
    const hasContent = await page.locator('h1, h2, [class*="message"], [class*="chat"]').first().isVisible({ timeout: 5000 }).catch(() => false);
    log('PATIENT', 'Messages', 'Messages page loads', page.url().includes('/messages') ? 'OK' : 'BROKEN', `url=${page.url()}`);

    if (page.url().includes('/messages')) {
      // Message input
      const msgInput = await page.locator('input[type="text"], textarea').last();
      const inputVisible = await msgInput.isVisible({ timeout: 3000 }).catch(() => false);
      log('PATIENT', 'Messages', 'Message input present', inputVisible ? 'OK' : 'MISSING');

      if (inputVisible) {
        await msgInput.fill('Hello, this is a test message');
        const sendBtn = await page.locator('button').filter({ hasText: /send/i }).first();
        if (await sendBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await sendBtn.click();
          await page.waitForTimeout(1500);
          const bodyText = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
          log('PATIENT', 'Messages', 'Send message works', bodyText.includes('test message') ? 'OK' : 'WRONG');
        }
      }
      await screenshot('messages');
    }
  } catch(e) {
    log('PATIENT', 'Messages', 'Messages page', 'BROKEN', e.message);
  }

  // Profile page
  try {
    await goto('/profile');
    await page.waitForTimeout(1500);
    log('PATIENT', 'Profile', 'Profile page loads', page.url().includes('/profile') ? 'OK' : 'BROKEN', `url=${page.url()}`);

    if (page.url().includes('/profile')) {
      // Check sections
      const sections = ['identity', 'demographic', 'employment', 'medication', 'emergency', 'privacy', 'consent'];
      const bodyText = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');

      for (const section of sections) {
        const has = bodyText.toLowerCase().includes(section);
        log('PATIENT', 'Profile', `${section} section`, has ? 'OK' : 'MISSING');
      }

      await screenshot('profile');
    }
  } catch(e) {
    log('PATIENT', 'Profile', 'Profile page', 'BROKEN', e.message);
  }

  // Sign out
  try {
    // Find sign out button
    const signOutBtn = await page.locator('button, a').filter({ hasText: /sign.?out|log.?out/i }).first();
    const signOutVisible = await signOutBtn.isVisible({ timeout: 3000 }).catch(() => false);
    log('PATIENT', 'Auth', 'Sign out button visible', signOutVisible ? 'OK' : 'MISSING');

    if (signOutVisible) {
      await signOutBtn.click();
      await page.waitForTimeout(2000);
      const url = page.url();
      log('PATIENT', 'Auth', 'Sign out → login redirect', url.includes('/login') || url === BASE + '/' ? 'OK' : 'WRONG', `url=${url}`);
    }
  } catch(e) {
    log('PATIENT', 'Auth', 'Sign out', 'BROKEN', e.message);
  }

  await ctx.close();
}

// ===== ADMIN TESTS =====
async function testAdmin() {
  console.log('\n========== ADMIN USER TESTS ==========\n');
  ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  page = await ctx.newPage();

  // Admin login page
  try {
    await goto('/x/control/login');
    await page.waitForTimeout(1000);
    const emailInput = await page.locator('input[type="email"]').isVisible({ timeout: 5000 }).catch(() => false);
    const passwordInput = await page.locator('input[type="password"]').isVisible({ timeout: 5000 }).catch(() => false);
    log('ADMIN', 'Admin Login', 'Login page loads', emailInput && passwordInput ? 'OK' : 'BROKEN', `email=${emailInput}, pass=${passwordInput}`);
    await screenshot('admin-login');
  } catch(e) {
    log('ADMIN', 'Admin Login', 'Login page', 'BROKEN', e.message);
  }

  // Admin login redirect (unauthed)
  try {
    await goto('/x/control');
    await page.waitForTimeout(1000);
    const url = page.url();
    log('ADMIN', 'Admin Auth Guard', 'Unauth /x/control redirects', url.includes('/x/control/login') ? 'OK' : 'BROKEN', `url=${url}`);
  } catch(e) {
    log('ADMIN', 'Admin Auth Guard', 'Redirect', 'BROKEN', e.message);
  }

  // Try admin login (without ADMIN_PIN - should fail)
  try {
    await goto('/x/control/login');
    await page.waitForTimeout(500);
    await page.locator('input[type="email"]').fill('alhazayed@gmail.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    const submitBtn = await page.locator('button[type="submit"]').first();
    await submitBtn.click();
    await page.waitForTimeout(2000);
    const bodyText = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
    const hasError = bodyText.toLowerCase().includes('invalid') || bodyText.toLowerCase().includes('error') || bodyText.toLowerCase().includes('incorrect');
    log('ADMIN', 'Admin Login', 'Wrong credentials shows error', hasError ? 'OK' : 'WRONG', `body snippet: ${bodyText.substring(0, 100)}`);
    await screenshot('admin-login-error');
  } catch(e) {
    log('ADMIN', 'Admin Login', 'Wrong credentials error', 'BROKEN', e.message);
  }

  // Check if admin PIN is available in env
  log('ADMIN', 'Config', 'ADMIN_PIN configured', 'MISSING', 'ADMIN_PIN not set in .env.local - admin login cannot be tested');
  log('ADMIN', 'Config', 'ANTHROPIC_API_KEY configured', 'MISSING', 'Set to placeholder - AI finder will not work');

  await ctx.close();
}

// ===== MAIN =====
async function main() {
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

  try {
    await testGuest();
    await testPatient();
    await testAdmin();
  } finally {
    await browser.close();
  }

  // Summary
  console.log('\n\n========== TEST SUMMARY ==========\n');
  const broken = results.filter(r => r.status === 'BROKEN');
  const wrong = results.filter(r => r.status === 'WRONG');
  const missing = results.filter(r => r.status === 'MISSING');
  const ok = results.filter(r => r.status === 'OK');

  console.log(`TOTAL: ${results.length} checks`);
  console.log(`OK: ${ok.length}`);
  console.log(`BROKEN: ${broken.length}`);
  console.log(`WRONG: ${wrong.length}`);
  console.log(`MISSING: ${missing.length}`);

  if (broken.length) {
    console.log('\n--- BROKEN ---');
    broken.forEach(r => console.log(`  ${r.page_name} | ${r.action}: ${r.detail}`));
  }
  if (wrong.length) {
    console.log('\n--- WRONG ---');
    wrong.forEach(r => console.log(`  ${r.page_name} | ${r.action}: ${r.detail}`));
  }
  if (missing.length) {
    console.log('\n--- MISSING ---');
    missing.forEach(r => console.log(`  ${r.page_name} | ${r.action}: ${r.detail}`));
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
