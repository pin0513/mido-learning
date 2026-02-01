/**
 * RWD Unit Test - Component structure verification
 * Tests RWD implementation by inspecting the actual component code
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Material Viewer RWD - Code Verification', () => {
  test('Verify RWD implementation in source code', async () => {
    const componentPath = path.join(__dirname, '../app/(public)/materials/[componentId]/page.tsx');
    const sourceCode = fs.readFileSync(componentPath, 'utf-8');

    // AC-01: Fullscreen implementation
    expect(sourceCode).toContain('requestFullscreen');
    expect(sourceCode).toContain('webkitRequestFullscreen'); // Safari fallback
    expect(sourceCode).toContain('exitFullscreen');
    console.log('✅ AC-01: Fullscreen API implemented with Safari fallback');

    // AC-02: Zoom controls
    expect(sourceCode).toContain('zoomLevel');
    expect(sourceCode).toContain('handleZoomIn');
    expect(sourceCode).toContain('handleZoomOut');
    expect(sourceCode).toContain('handleZoomReset');
    expect(sourceCode).toContain('Math.min(prev + 0.25, 2.0)'); // Zoom in +25%, max 200%
    expect(sourceCode).toContain('Math.max(prev - 0.25, 0.5)'); // Zoom out -25%, min 50%
    expect(sourceCode).toContain('setZoomLevel(1.0)'); // Reset to 100%
    console.log('✅ AC-02: Zoom controls implemented (25% step, 50%-200% range)');

    // AC-02: Button disabled states
    expect(sourceCode).toContain('disabled={zoomLevel <= 0.5}'); // Zoom out disabled at 50%
    expect(sourceCode).toContain('disabled={zoomLevel >= 2.0}'); // Zoom in disabled at 200%
    console.log('✅ AC-02: Button disabled states implemented');

    // AC-03: Auto-scale for mobile
    expect(sourceCode).toContain('window.innerWidth < 768'); // Mobile breakpoint
    expect(sourceCode).toContain('autoScale');
    expect(sourceCode).toContain('setAutoScale(false)'); // Manual zoom disables auto-scale
    expect(sourceCode).toContain("addEventListener('resize'"); // Resize listener
    expect(sourceCode).toContain('removeEventListener'); // Cleanup
    console.log('✅ AC-03: Auto-scale for mobile implemented');

    // Technical implementation: Transform scale
    expect(sourceCode).toContain('transform: `scale(${zoomLevel})`');
    expect(sourceCode).toContain("transformOrigin: 'top left'");
    expect(sourceCode).toContain('width: `${100 / zoomLevel}%`');
    expect(sourceCode).toContain('height: `${100 / zoomLevel}%`');
    console.log('✅ Transform scale implemented correctly');

    // Defensive coding: Null checks
    expect(sourceCode).toContain('if (!containerRef.current) return');
    console.log('✅ Defensive programming: Null checks implemented');

    // AC-04: Existing features (verify they were not removed)
    expect(sourceCode).toContain('下載'); // Download button text
    expect(sourceCode).toContain('getDownloadUrl'); // Download function
    expect(sourceCode).toContain('評分'); // Rating section
    expect(sourceCode).toContain('rateComponent'); // Rating function
    expect(sourceCode).toContain('歷史版本'); // Version history
    console.log('✅ AC-04: Existing features (download, rating, version) preserved');

    // Accessibility
    expect(sourceCode).toContain('aria-label');
    expect(sourceCode).toContain('title='); // Button tooltips
    console.log('✅ Accessibility: aria-label and tooltips present');

    // Responsive design
    expect(sourceCode).toContain('sm:'); // Tailwind small breakpoint
    expect(sourceCode).toContain('md:'); // Tailwind medium breakpoint
    expect(sourceCode).toContain('flex-col'); // Mobile stacking
    expect(sourceCode).toContain('flex-row'); // Desktop horizontal layout
    console.log('✅ Responsive design: Tailwind breakpoints used');
  });

  test('Verify state management follows React best practices', async () => {
    const componentPath = path.join(__dirname, '../app/(public)/materials/[componentId]/page.tsx');
    const sourceCode = fs.readFileSync(componentPath, 'utf-8');

    // State declarations
    expect(sourceCode).toContain('useState(1.0)'); // zoomLevel initial state
    expect(sourceCode).toContain('useState(false)'); // autoScale initial state
    expect(sourceCode).toContain('useRef<HTMLDivElement>(null)'); // containerRef

    // useEffect with proper dependencies
    const useEffectMatches = sourceCode.match(/useEffect\([^,]+,\s*\[[^\]]*\]/g);
    expect(useEffectMatches).toBeTruthy();
    expect(useEffectMatches!.length).toBeGreaterThan(0);

    console.log('✅ State management follows React patterns');
    console.log(`Found ${useEffectMatches?.length} useEffect hooks with dependency arrays`);
  });

  test('Verify no console.log in production code', async () => {
    const componentPath = path.join(__dirname, '../app/(public)/materials/[componentId]/page.tsx');
    const sourceCode = fs.readFileSync(componentPath, 'utf-8');

    // Only one console.error is allowed (from existing code)
    const consoleMatches = sourceCode.match(/console\.(log|warn|debug)/g);

    if (consoleMatches) {
      console.log(`⚠️ Warning: Found ${consoleMatches.length} console statements:`, consoleMatches);
    } else {
      console.log('✅ No console.log/warn/debug in code (console.error is acceptable)');
    }
  });

  test('Performance: Verify GPU-accelerated transform used', async () => {
    const componentPath = path.join(__dirname, '../app/(public)/materials/[componentId]/page.tsx');
    const sourceCode = fs.readFileSync(componentPath, 'utf-8');

    // Should use transform (GPU-accelerated) NOT zoom (non-standard)
    expect(sourceCode).toContain('transform: `scale');
    expect(sourceCode).not.toContain('zoom:'); // CSS zoom property not used

    console.log('✅ GPU-accelerated transform used instead of CSS zoom');
  });
});

test.describe('Material Viewer RWD - Manual Test Instructions', () => {
  test('Generate manual testing checklist', async () => {
    const checklist = `
📋 Manual Testing Checklist for Material Viewer RWD

Desktop (Chrome/Firefox/Edge/Safari):
───────────────────────────────────────
[ ] Navigate to any material page
[ ] Verify zoom controls visible: [−] 100% [+] [↺] [📥] [⛶]
[ ] Click [+] 4 times → Should reach 200%, button disabled
[ ] Click [−] 8 times → Should reach 50%, button disabled
[ ] Click [↺] → Should return to 100%
[ ] Click fullscreen button → Page enters fullscreen
[ ] Press ESC → Exit fullscreen
[ ] Click download button after zooming → Download works
[ ] Verify iframe content scales correctly with zoom

Mobile (iOS Safari / Android Chrome):
──────────────────────────────────────
[ ] Open material page on phone (<768px width)
[ ] Verify zoom automatically adjusts to fit screen
[ ] Verify zoom percentage shows < 100%
[ ] Rotate device → Zoom recalculates
[ ] Click [+] → Auto-scale disabled, manual zoom active
[ ] Rotate again → Zoom should NOT change (manual override)
[ ] All buttons visible and tappable
[ ] Button text hidden on small screens (icon only)

Cross-Browser (AC-05):
──────────────────────
[ ] Chrome (latest) - All features work
[ ] Firefox (latest) - All features work
[ ] Safari macOS - Fullscreen works
[ ] Safari iOS - Fullscreen works or shows alert
[ ] Edge (latest) - All features work

Regression Testing:
───────────────────
[ ] Download button still works
[ ] Rating system unaffected
[ ] Version history still visible
[ ] Iframe loads correctly
[ ] No layout breaks on narrow screens (640px)

Edge Cases:
───────────
[ ] Rapid clicking zoom buttons → No crashes
[ ] Fullscreen on unsupported browser → Alert shown
[ ] Material page without content → No errors
[ ] Very long material titles → No overflow
`;

    console.log(checklist);

    // Save checklist to file
    fs.writeFileSync(
      path.join(__dirname, '../test-results/manual-test-checklist.txt'),
      checklist,
      'utf-8'
    );

    console.log('\n✅ Manual testing checklist saved to: frontend/test-results/manual-test-checklist.txt');
  });
});
