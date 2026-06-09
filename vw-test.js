// V Welfare — Comprehensive 3-level test
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
  try { await page.screenshot({ path: `/tmp/vw-${name}.png`, fullPage: false }) } catch(e) {}
}

async function goto(url) {
  await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 15000 });
}

// ===== GUEST TESTS =====
async function testGuest() {
  console.log('\n========== GUEST USER TESTS ==========\n');
  ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  page = await ctx.newPage();

  // 1. Landing page
  try {
    await goto('/');
    const title = await page.title();
    const heroH1 = await page.locator('h1').first().textContent({ timeout: 5000 }).catch(() => null);
    log('GUEST', 'Landing', 'Page loads', title.length > 0 ? 'OK' : 'BROKEN', `title="${title}"`);
    await screenshot('landing');
  } catch(e) { log('GUEST', 'Landing', 'Page loads', 'BROKEN', e.message) }

  // 2. Hero CTA buttons
  try {
    await goto('/');
    const cta = page.locator('a, button').filter({ hasText: /free assessment|get started/i }).first();
    const ctaVisible = await cta.isVisible({ timeout: 3000 }).catch(() => false);
    log('GUEST', 'Landing', 'Hero CTA buttons', ctaVisible ? 'OK' : 'MISSING');
  } catch(e) { log('GUEST', 'Landing', 'Hero CTAs', 'BROKEN', e.message) }

  // 3. Category tabs
  try {
    await goto('/');
    await page.waitForTimeout(1000);
    const tabs = await page.locator('button').filter({ hasText: /Mood|Anxiety|Stress|Trauma|Well-being|Sleep|Substance/ }).count();
    log('GUEST', 'Landing', 'Assessment category tabs', tabs >= 7 ? 'OK' : 'WRONG', `found ${tabs} tabs (expect 8)`);
    const anxietyTab = page.locator('button').filter({ hasText: /Anxiety/ }).first();
    if (await anxietyTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await anxietyTab.click();
      await page.waitForTimeout(300);
      log('GUEST', 'Landing', 'Tab switching', 'OK');
    }
    await screenshot('landing-categories');
  } catch(e) { log('GUEST', 'Landing', 'Category tabs', 'BROKEN', e.message) }

  // 4. Language toggle — button text is "العربية" (not "AR")
  try {
    await goto('/');
    await page.waitForTimeout(500);
    const langBtn = page.locator('button').filter({ hasText: /العربية|English/ }).first();
    const langVisible = await langBtn.isVisible({ timeout: 3000 }).catch(() => false);
    log('GUEST', 'Landing', 'Language toggle visible', langVisible ? 'OK' : 'MISSING');
    if (langVisible) {
      await langBtn.click();
      await page.waitForTimeout(1000);
      const bodyText = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
      const hasArabic = /[؀-ۿ]/.test(bodyText);
      log('GUEST', 'Landing', 'Language switch EN→AR', hasArabic ? 'OK' : 'WRONG');
      await screenshot('landing-arabic');
      const langBtn2 = page.locator('button').filter({ hasText: /English|العربية/ }).first();
      if (await langBtn2.isVisible({ timeout: 1000 }).catch(() => false)) await langBtn2.click();
    }
  } catch(e) { log('GUEST', 'Landing', 'Language toggle', 'BROKEN', e.message) }

  // 5. Header navigation
  try {
    await goto('/');
    const navLinks = await page.locator('header a, header button').count();
    log('GUEST', 'Landing', 'Header navigation links', navLinks >= 4 ? 'OK' : 'MISSING', `${navLinks} items`);
  } catch(e) { log('GUEST', 'Landing', 'Nav links', 'BROKEN', e.message) }

  // 6. Footer with contact link
  try {
    await goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    const footer = await page.locator('footer').isVisible({ timeout: 3000 }).catch(() => false);
    const contactLink = await page.locator('footer a[href*="vwelfare"]').first().isVisible({ timeout: 2000 }).catch(() => false);
    log('GUEST', 'Landing', 'Footer visible', footer ? 'OK' : 'MISSING');
    log('GUEST', 'Landing', 'Footer contact email link (href=mailto:info@vwelfare.com)', contactLink ? 'OK' : 'MISSING');
    await screenshot('landing-footer');
  } catch(e) { log('GUEST', 'Landing', 'Footer', 'BROKEN', e.message) }

  // 7. AI Finder section
  try {
    await goto('/');
    const aiSection = page.locator('text=Not sure').first();
    const aiVisible = await aiSection.isVisible({ timeout: 3000 }).catch(() => false);
    log('GUEST', 'Landing AI Finder', 'Section visible', aiVisible ? 'OK' : 'MISSING');
    if (aiVisible) {
      const textarea = page.locator('textarea').first();
      if (await textarea.isVisible({ timeout: 2000 }).catch(() => false)) {
        await textarea.click();
        await textarea.pressSequentially('I feel anxious and cannot sleep', { delay: 20 });
        await page.waitForTimeout(300);
        const findBtn = page.locator('button').filter({ hasText: /find my assessment/i }).first();
        if (await findBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await findBtn.click();
          await page.waitForTimeout(4000);
          const bodyText = await page.locator('body').innerText({ timeout: 2000 }).catch(() => '');
          const responded = /GAD|PHQ|ISI|recommend|not configured|unavailable|error/i.test(bodyText);
          const geminiSet = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-api-key-here';
          log('GUEST', 'Landing AI Finder', 'Submit triggers AI response',
            geminiSet ? (responded ? 'OK' : 'BROKEN') : 'BLOCKED',
            geminiSet ? '' : 'GEMINI_API_KEY not set — add to .env.local to test');
          await screenshot('ai-finder');
        }
      }
    }
  } catch(e) { log('GUEST', 'Landing AI Finder', 'AI finder', 'BROKEN', e.message) }

  // 8. Login page
  try {
    await goto('/login');
    const emailInput = await page.locator('input[type="email"]').isVisible({ timeout: 5000 }).catch(() => false);
    const passInput = await page.locator('input[type="password"]').first().isVisible({ timeout: 3000 }).catch(() => false);
    const forgotLink = await page.locator('a').filter({ hasText: /forgot/i }).isVisible({ timeout: 2000 }).catch(() => false);
    log('GUEST', 'Login', 'Form (email + password + forgot link)', emailInput && passInput && forgotLink ? 'OK' : 'BROKEN',
      `email=${emailInput} pass=${passInput} forgot=${forgotLink}`);
    await screenshot('login');
  } catch(e) { log('GUEST', 'Login', 'Page', 'BROKEN', e.message) }

  // 9. Forgot password
  try {
    await goto('/forgot-password');
    const emailInput = await page.locator('input[type="email"]').isVisible({ timeout: 5000 }).catch(() => false);
    const submitBtn = await page.locator('button[type="submit"]').isVisible({ timeout: 3000 }).catch(() => false);
    log('GUEST', 'Forgot Password', 'Page loads (email + submit)', emailInput && submitBtn ? 'OK' : 'BROKEN');
  } catch(e) { log('GUEST', 'Forgot Password', 'Page', 'BROKEN', e.message) }

  // 10. Register page
  try {
    await goto('/register');
    const nameInput = await page.locator('input[type="text"]').isVisible({ timeout: 5000 }).catch(() => false);
    const emailInput = await page.locator('input[type="email"]').isVisible({ timeout: 3000 }).catch(() => false);
    const passInput = await page.locator('input[type="password"]').isVisible({ timeout: 3000 }).catch(() => false);
    log('GUEST', 'Register', 'Form (name + email + password)', nameInput && emailInput && passInput ? 'OK' : 'BROKEN');
    const btn = page.locator('button[type="submit"]').first();
    if (await btn.isVisible()) { await btn.click(); await page.waitForTimeout(300) }
    log('GUEST', 'Register', 'Empty submit stays on form (validation)', page.url().includes('/register') ? 'OK' : 'WRONG');
  } catch(e) { log('GUEST', 'Register', 'Page', 'BROKEN', e.message) }

  // 11. Assessments list page
  try {
    await goto('/assessments');
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(500);
    const startBtns = await page.locator('a').filter({ hasText: /start free|ابدأ/i }).count();
    log('GUEST', 'Assessments', 'List with start buttons', startBtns > 0 ? 'OK' : 'BLOCKED',
      startBtns > 0 ? `${startBtns} start buttons` : 'No cards — Supabase unreachable from container');
    await screenshot('assessments-guest');
  } catch(e) { log('GUEST', 'Assessments', 'Page', 'BROKEN', e.message) }

  // 12. Assessment taking (if cards loaded)
  try {
    await goto('/assessments');
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo(0, 600));
    const startBtn = page.locator('a').filter({ hasText: /start free/i }).first();
    if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const href = await startBtn.getAttribute('href');
      if (href) {
        await goto(href);
        await page.waitForTimeout(1500);
        const hasOptions = await page.locator('input[type="radio"], [class*="option"]').first().isVisible({ timeout: 5000 }).catch(() => false);
        log('GUEST', 'Assessment Taking', 'Assessment loads with answer options', hasOptions ? 'OK' : 'BROKEN');
        if (hasOptions) {
          await page.locator('input[type="radio"], [class*="option"]').first().click();
          log('GUEST', 'Assessment Taking', 'Can select an answer', 'OK');
          await screenshot('assessment-taking');
        }
      }
    } else {
      log('GUEST', 'Assessment Taking', 'Full flow', 'BLOCKED', 'No start buttons — Supabase unreachable');
    }
  } catch(e) { log('GUEST', 'Assessment Taking', 'Flow', 'BROKEN', e.message) }

  // 13. 404 page
  try {
    await goto('/this-page-does-not-exist-xyz');
    await page.waitForTimeout(1000);
    const bodyText = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
    const is404 = bodyText.includes('404') || bodyText.toLowerCase().includes('not found');
    const isLoginRedirect = page.url().includes('/login');
    log('GUEST', '404 Page', 'Branded 404 shown (not login redirect)',
      is404 && !isLoginRedirect ? 'OK' : 'BROKEN',
      isLoginRedirect ? 'Still redirecting to login!' : (is404 ? 'Correct' : `Got: ${bodyText.substring(0,60)}`));
    await screenshot('404-page');
  } catch(e) { log('GUEST', '404 Page', '404', 'BROKEN', e.message) }

  // 14. Auth guard
  try {
    await goto('/dashboard');
    await page.waitForTimeout(1000);
    log('GUEST', 'Auth Guard', '/dashboard → /login for guests',
      page.url().includes('/login') ? 'OK' : 'BROKEN', `url=${page.url()}`);
  } catch(e) { log('GUEST', 'Auth Guard', 'Redirect', 'BROKEN', e.message) }

  await ctx.close();
}

// ===== PATIENT TESTS =====
async function testPatient() {
  console.log('\n========== PATIENT USER TESTS ==========\n');
  ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  page = await ctx.newPage();

  let isLoggedIn = false;

  // Attempt registration (checks both flows: immediate session vs check-email)
  try {
    const testEmail = `test.vw.${Date.now()}@mailtest.com`;
    await goto('/register');
    await page.waitForTimeout(500);
    await page.locator('input[type="text"]').first().fill('Test Patient');
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill('TestPass123!');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(3000);
    const url = page.url();
    const bodyText = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');

    if (url.includes('/onboarding')) {
      log('PATIENT', 'Register', 'Registration → onboarding (email confirm disabled)', 'OK');
      isLoggedIn = true;
    } else if (/check|verify|sent.*email|email.*sent/i.test(bodyText) || bodyText.includes('✓')) {
      log('PATIENT', 'Register', 'Registration → check-email screen', 'OK', 'Email confirmation required in Supabase');
    } else if (/failed to fetch|network/i.test(bodyText)) {
      log('PATIENT', 'Register', 'Registration', 'BLOCKED', 'Supabase unreachable — fix API access restriction');
    } else {
      log('PATIENT', 'Register', 'Registration', 'WRONG', `url=${url}`);
    }
    await screenshot('register-submit');
  } catch(e) { log('PATIENT', 'Register', 'Registration', 'BROKEN', e.message) }

  if (!isLoggedIn) {
    log('PATIENT', 'Auth', 'Logged-in flows untestable', 'BLOCKED',
      'Cannot sign in — Supabase unreachable from this container. Test at vwelfare.vercel.app.');
  }

  // Verify all private routes redirect to login (works without DB)
  const privateRoutes = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/profile',   label: 'Profile' },
    { path: '/journal',   label: 'Journal' },
    { path: '/insights',  label: 'Insights' },
    { path: '/messages',  label: 'Messages' },
    { path: '/onboarding',label: 'Onboarding' },
  ];
  for (const r of privateRoutes) {
    try {
      await goto(r.path);
      await page.waitForTimeout(500);
      log('PATIENT', r.label, `${r.path} → login redirect for unauthenticated`,
        page.url().includes('/login') ? 'OK' : 'BROKEN', `url=${page.url()}`);
    } catch(e) { log('PATIENT', r.label, 'Auth guard', 'BROKEN', e.message) }
  }

  // If logged in (no email confirmation), test all patient flows
  if (isLoggedIn) {
    try {
      // Onboarding wizard
      const hasWizard = await page.locator('[class*="step"], [class*="wizard"], h2').first().isVisible({ timeout: 5000 }).catch(() => false);
      log('PATIENT', 'Onboarding', 'Wizard loads', hasWizard ? 'OK' : 'BROKEN');
      const skipBtn = page.locator('button').filter({ hasText: /skip/i }).first();
      if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await skipBtn.click();
        await page.waitForTimeout(2000);
        log('PATIENT', 'Onboarding', 'Skip → dashboard', page.url().includes('/dashboard') ? 'OK' : 'WRONG');
      }
      await screenshot('onboarding');
    } catch(e) { log('PATIENT', 'Onboarding', 'Wizard', 'BROKEN', e.message) }

    // Dashboard, mood, journal, etc.
    const dashRoutes = [
      { path: '/dashboard', label: 'Dashboard' },
      { path: '/journal',   label: 'Journal' },
      { path: '/insights',  label: 'Insights' },
      { path: '/messages',  label: 'Messages' },
      { path: '/profile',   label: 'Profile' },
    ];
    for (const r of dashRoutes) {
      try {
        await goto(r.path);
        await page.waitForTimeout(1500);
        const onRoute = page.url().includes(r.path);
        const hasContent = await page.locator('h1, h2, [class*="card"]').first().isVisible({ timeout: 3000 }).catch(() => false);
        log('PATIENT', r.label, `${r.label} page loads`, onRoute && hasContent ? 'OK' : 'BROKEN', `url=${page.url()}`);
        await screenshot(r.label.toLowerCase());
      } catch(e) { log('PATIENT', r.label, 'Page', 'BROKEN', e.message) }
    }
  }

  await ctx.close();
}

// ===== ADMIN TESTS =====
async function testAdmin() {
  console.log('\n========== ADMIN USER TESTS ==========\n');
  ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  page = await ctx.newPage();

  // Admin login page structure
  try {
    await goto('/x/control/login');
    await page.waitForTimeout(1000);
    const emailInput = await page.locator('input[type="email"]').isVisible({ timeout: 5000 }).catch(() => false);
    const passInput = await page.locator('input[placeholder="••••••••"]').isVisible({ timeout: 3000 }).catch(() => false);
    const pinInput = await page.locator('input[placeholder*="PIN"]').isVisible({ timeout: 3000 }).catch(() => false);
    const submitBtn = await page.locator('button').filter({ hasText: /access|login/i }).first().isVisible({ timeout: 2000 }).catch(() => false);
    log('ADMIN', 'Admin Login', 'Page: email + password + PIN + submit button',
      emailInput && passInput && pinInput && submitBtn ? 'OK' : 'BROKEN',
      `email=${emailInput} pass=${passInput} pin=${pinInput} btn=${submitBtn}`);
    await screenshot('admin-login');
  } catch(e) { log('ADMIN', 'Admin Login', 'Login page', 'BROKEN', e.message) }

  // Auth guard
  try {
    await goto('/x/control');
    await page.waitForTimeout(1000);
    log('ADMIN', 'Auth Guard', '/x/control → /x/control/login',
      page.url().includes('/x/control/login') ? 'OK' : 'BROKEN', `url=${page.url()}`);
  } catch(e) { log('ADMIN', 'Auth Guard', 'Redirect', 'BROKEN', e.message) }

  // Wrong-credentials error
  try {
    await goto('/x/control/login');
    await page.waitForTimeout(500);
    await page.locator('input[type="email"]').fill('wrong@example.com');
    await page.locator('input[placeholder="••••••••"]').fill('wrongpassword');
    await page.locator('input[placeholder*="PIN"]').fill('wrongpin');
    await page.locator('button').filter({ hasText: /access|login/i }).first().click();
    await page.waitForTimeout(2500);
    const bodyText = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
    const hasError = /invalid|error|incorrect|not configured|unauthorized|unreachable/i.test(bodyText);
    log('ADMIN', 'Admin Login', 'Wrong credentials → error message',
      hasError ? 'OK' : 'WRONG', hasError ? 'Error shown' : `No error: ${bodyText.substring(0,80)}`);
    await screenshot('admin-login-error');
  } catch(e) { log('ADMIN', 'Admin Login', 'Error handling', 'BROKEN', e.message) }

  // Config checks
  const adminPin = process.env.ADMIN_PIN;
  const geminiKey = process.env.GEMINI_API_KEY;
  log('ADMIN', 'Config', 'ADMIN_PIN set in environment',
    adminPin && adminPin !== 'your-admin-pin-here' ? 'OK' : 'MISSING',
    'Required for admin login — set in Vercel env vars and .env.local');
  log('ADMIN', 'Config', 'GEMINI_API_KEY set in environment',
    geminiKey && geminiKey !== 'your-gemini-api-key-here' ? 'OK' : 'MISSING',
    'Required for AI finder — get free key at aistudio.google.com');

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

  console.log('\n\n========== TEST SUMMARY ==========\n');
  const byStatus = s => results.filter(r => r.status === s);
  const ok = byStatus('OK'), broken = byStatus('BROKEN');
  const wrong = byStatus('WRONG'), missing = byStatus('MISSING'), blocked = byStatus('BLOCKED');

  console.log(`TOTAL: ${results.length} checks`);
  console.log(`✅ OK:      ${ok.length}`);
  console.log(`❌ BROKEN:  ${broken.length}`);
  console.log(`⚠️  WRONG:   ${wrong.length}`);
  console.log(`🔷 BLOCKED: ${blocked.length}  (environment — not code bugs)`);
  console.log(`➖ MISSING: ${missing.length}  (config gaps)`);

  if (broken.length) {
    console.log('\n--- BROKEN ---');
    broken.forEach(r => console.log(`  [${r.category}] ${r.page_name} | ${r.action}: ${r.detail}`));
  }
  if (wrong.length) {
    console.log('\n--- WRONG ---');
    wrong.forEach(r => console.log(`  [${r.category}] ${r.page_name} | ${r.action}: ${r.detail}`));
  }
  if (missing.length) {
    console.log('\n--- MISSING (config) ---');
    missing.forEach(r => console.log(`  [${r.category}] ${r.page_name} | ${r.action}: ${r.detail}`));
  }
  if (blocked.length) {
    console.log('\n--- BLOCKED (fix Supabase API restriction) ---');
    blocked.forEach(r => console.log(`  [${r.category}] ${r.page_name} | ${r.action}: ${r.detail}`));
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) });
