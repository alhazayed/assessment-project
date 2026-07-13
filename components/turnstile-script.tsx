import Script from 'next/script'

/** Load Cloudflare Turnstile only on auth pages (not site-wide). */
export default function TurnstileScript() {
  return (
    <Script
      src="https://challenges.cloudflare.com/turnstile/v0/api.js"
      strategy="lazyOnload"
    />
  )
}
