'use client'

/**
 * Android hardware back button handler.
 *
 * Prevents accidental app exit. On the root/dashboard page, pressing back
 * shows an "Exit?" confirmation. On other pages, it navigates back normally.
 *
 * Call initBackButtonHandler() once in a client component at app root.
 */

import { isNative, IS_ANDROID } from './platform'

type RouterBack = () => void
type GetPathname = () => string

const ROOT_PATHS = ['/', '/dashboard', '/login']

export function initBackButtonHandler(
  routerBack: RouterBack,
  getPathname: GetPathname,
): (() => void) | undefined {
  if (!isNative() || !IS_ANDROID) return undefined

  let cleanup: (() => void) | undefined
  let lastBackPress = 0

  import('@capacitor/app').then(({ App }) => {
    const listenerPromise = App.addListener('backButton', () => {
      const pathname = getPathname()
      const isRoot = ROOT_PATHS.some(p => pathname === p)

      if (isRoot) {
        const now = Date.now()
        if (now - lastBackPress < 2000) {
          // Double tap — exit app
          App.exitApp()
        } else {
          lastBackPress = now
          // Toast-style feedback (simple — avoids native toast dependency)
          showExitToast()
        }
      } else {
        routerBack()
      }
    })

    listenerPromise.then(handle => {
      cleanup = () => handle.remove()
    })
  })

  return () => cleanup?.()
}

let toastEl: HTMLDivElement | null = null

function showExitToast() {
  if (toastEl) return
  toastEl = document.createElement('div')
  toastEl.textContent = 'Press back again to exit'
  toastEl.style.cssText = `
    position: fixed;
    bottom: max(2rem, env(safe-area-inset-bottom, 2rem));
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.75);
    color: white;
    padding: 10px 20px;
    border-radius: 24px;
    font-size: 14px;
    z-index: 9999;
    pointer-events: none;
    backdrop-filter: blur(4px);
  `
  document.body.appendChild(toastEl)
  setTimeout(() => {
    if (toastEl) {
      toastEl.remove()
      toastEl = null
    }
  }, 2000)
}
