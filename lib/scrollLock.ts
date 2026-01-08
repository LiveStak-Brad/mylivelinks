/**
 * iOS-safe scroll lock for modals and overlays.
 * 
 * On iOS Safari, simply setting `overflow: hidden` on body doesn't prevent
 * background scrolling. This utility uses the fixed-body pattern which:
 * 1. Stores current scroll position
 * 2. Sets body to position: fixed with negative top
 * 3. Restores scroll position on unlock
 * 
 * @example
 * // Lock scroll when modal opens
 * useEffect(() => {
 *   if (isOpen) {
 *     lockScroll();
 *     return () => unlockScroll();
 *   }
 * }, [isOpen]);
 */

let scrollPosition = 0;
let lockCount = 0;

/**
 * Lock body scroll using iOS-safe fixed-body pattern.
 * Safe to call multiple times - uses a lock counter.
 */
export function lockScroll(): void {
  if (typeof document === 'undefined') return;
  
  lockCount++;
  if (lockCount > 1) return; // Already locked
  
  // Store current scroll position
  scrollPosition = window.scrollY;
  
  // Apply fixed-body pattern
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollPosition}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.overflow = 'hidden';
  document.body.style.overscrollBehavior = 'none';
  
  // Add class for additional CSS if needed
  document.body.classList.add('scroll-lock-ios');
}

/**
 * Unlock body scroll and restore scroll position.
 * Safe to call multiple times - uses a lock counter.
 */
export function unlockScroll(): void {
  if (typeof document === 'undefined') return;
  
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0) return; // Still locked by another modal
  
  // Remove fixed-body styles
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.overflow = '';
  document.body.style.overscrollBehavior = '';
  
  // Remove class
  document.body.classList.remove('scroll-lock-ios');
  
  // Restore scroll position
  window.scrollTo(0, scrollPosition);
}

/**
 * Force unlock all scroll locks (use sparingly, e.g., on route change).
 */
export function forceUnlockScroll(): void {
  if (typeof document === 'undefined') return;
  
  lockCount = 0;
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.overflow = '';
  document.body.style.overscrollBehavior = '';
  document.body.classList.remove('scroll-lock-ios');
}
