import type { EmailMessage } from './send'

/**
 * Package emails. Each one carries English and Arabic together, because we do
 * not know the recipient's language (a gift recipient may have no account).
 * All dynamic values are HTML-escaped.
 */

function esc(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function layout(en: string, ar: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f7fa;font-family:Arial,Helvetica,sans-serif;color:#12273C">
<div style="max-width:560px;margin:0 auto;padding:24px">
<div style="background:#ffffff;border-radius:12px;padding:28px">
<p style="font-size:18px;font-weight:bold;margin:0 0 16px">V Welfare</p>
<div dir="ltr" style="text-align:left">${en}</div>
<hr style="border:none;border-top:1px solid #e3e8ee;margin:24px 0">
<div dir="rtl" style="text-align:right">${ar}</div>
</div>
<p style="font-size:11px;color:#6b7c8f;text-align:center;margin-top:16px">For screening purposes only. Not a substitute for professional clinical assessment.<br>للفحص فقط، ولا يغني عن التقييم السريري المتخصص.</p>
</div></body></html>`
}

function button(href: string, label: string): string {
  return `<p style="margin:20px 0"><a href="${esc(href)}" style="background:#1D6296;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;font-weight:bold">${esc(label)}</a></p>`
}

export interface PackageNames { en: string; ar: string }

/** Receipt for a package the buyer bought for themselves (already unlocked). */
export function receiptEmail(p: { to: string; pkg: PackageNames; amount: string; packageUrl: string }): EmailMessage {
  const en = `<p>Thank you for your purchase.</p>
<p><strong>${esc(p.pkg.en)}</strong> is now unlocked on your account. Amount paid: <strong>${esc(p.amount)}</strong> (one-time, no subscription).</p>
<p>Complete the assessments in the package, then open your combined report.</p>${button(p.packageUrl, 'Open your package')}`
  const ar = `<p>شكراً لشرائك.</p>
<p>باقة <strong>${esc(p.pkg.ar)}</strong> مفعّلة الآن في حسابك. المبلغ المدفوع: <strong>${esc(p.amount)}</strong> (دفعة واحدة، بلا اشتراك).</p>
<p>أكمل التقييمات في الباقة ثم افتح تقريرك المجمّع.</p>${button(p.packageUrl, 'افتح باقتك')}`
  return {
    to: p.to,
    subject: `Your V Welfare package: ${p.pkg.en} | باقتك: ${p.pkg.ar}`,
    html: layout(en, ar),
    text: `Thank you for your purchase. ${p.pkg.en} is now unlocked on your account. Amount paid: ${p.amount} (one-time). Open it: ${p.packageUrl}\n\nشكراً لشرائك. باقة ${p.pkg.ar} مفعّلة الآن في حسابك. افتحها: ${p.packageUrl}`,
  }
}

/** Receipt for the buyer of a gift: the code went to the recipient. */
export function giftReceiptEmail(p: { to: string; pkg: PackageNames; amount: string; recipient: string; billingUrl: string }): EmailMessage {
  const en = `<p>Thank you for your purchase.</p>
<p>You bought <strong>${esc(p.pkg.en)}</strong> for <strong>${esc(p.recipient)}</strong>. Amount paid: <strong>${esc(p.amount)}</strong>.</p>
<p>We have emailed them a one-time code to open the package. You can check whether it has been used, or send it again, from your billing page.</p>${button(p.billingUrl, 'View your gifts')}`
  const ar = `<p>شكراً لشرائك.</p>
<p>اشتريت باقة <strong>${esc(p.pkg.ar)}</strong> لـ <strong>${esc(p.recipient)}</strong>. المبلغ المدفوع: <strong>${esc(p.amount)}</strong>.</p>
<p>أرسلنا إليه رمزاً يُستخدم مرة واحدة لفتح الباقة. يمكنك من صفحة الفوترة معرفة ما إذا استُخدم الرمز أو إعادة إرساله.</p>${button(p.billingUrl, 'عرض هداياك')}`
  return {
    to: p.to,
    subject: `Gift sent: ${p.pkg.en} | تم إرسال الهدية: ${p.pkg.ar}`,
    html: layout(en, ar),
    text: `You bought ${p.pkg.en} for ${p.recipient} (${p.amount}). We emailed them a one-time code. Manage it: ${p.billingUrl}`,
  }
}

/** The one-time code, sent to the gift recipient. */
export function giftCodeEmail(p: { to: string; pkg: PackageNames; code: string; redeemUrl: string }): EmailMessage {
  const codeBox = `<p style="font-size:24px;font-weight:bold;letter-spacing:3px;background:#EAF2F9;padding:14px;border-radius:8px;text-align:center;direction:ltr;font-family:monospace">${esc(p.code)}</p>`
  const en = `<p>Someone has given you an assessment package on V Welfare: <strong>${esc(p.pkg.en)}</strong>.</p>
<p>Your one-time code:</p>${codeBox}
<p>Sign in or create a free account, then enter the code to open the package. The code works once, on one account.</p>${button(p.redeemUrl, 'Redeem your code')}`
  const ar = `<p>أهداك أحدهم باقة تقييم على V Welfare: <strong>${esc(p.pkg.ar)}</strong>.</p>
<p>رمزك الذي يُستخدم مرة واحدة:</p>${codeBox}
<p>سجّل الدخول أو أنشئ حساباً مجانياً، ثم أدخل الرمز لفتح الباقة. يعمل الرمز مرة واحدة وعلى حساب واحد.</p>${button(p.redeemUrl, 'استخدم رمزك')}`
  return {
    to: p.to,
    subject: `You have been given a V Welfare package | لديك باقة هدية من V Welfare`,
    html: layout(en, ar),
    text: `Someone has given you ${p.pkg.en} on V Welfare. Your one-time code: ${p.code}\nRedeem it: ${p.redeemUrl}\n\nأهداك أحدهم باقة ${p.pkg.ar}. رمزك: ${p.code}`,
  }
}
