/**
 * Zoom and pan for the concentration chart, on the time axis only.
 * Loaded as a classic script; `createChartZoom` is a global.
 *
 * One finger: drag to pan when zoomed in, drag to move the time cursor when not.
 * A tap puts the cursor there. Two fingers: pinch to zoom about the midpoint,
 * and move the midpoint to pan. Double-tap, double-click or "Fit" to go back to
 * the whole case. Ctrl+wheel (a trackpad pinch arrives as one) zooms about the
 * pointer, and a horizontal wheel pans.
 *
 * This module owns the visible window and nothing else. It never draws: it asks
 * the chart for the time under a pixel, changes the window, and calls
 * `onChange`, which is where the owner rescales the axes. The y axis is not
 * zoomed by the reader; the owner fits it to what is in the window, so zooming
 * into a stretch of low concentration does not leave it flat at the bottom of an
 * axis sized for the peak.
 *
 * The element must have `touch-action: pan-y`. That leaves vertical scrolling
 * to the browser, so a finger that starts on the chart can still scroll the
 * page, and hands every horizontal move and every pinch to this module.
 */

/** Narrowest window offered, in minutes. Results are sampled once a minute. */
const MIN_SPAN_MIN = 5;

/** Movement, in pixels, before a touch stops being a tap. */
const TAP_SLOP_PX = 8;
const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_PX = 32;

function createChartZoom({ host, getChart, getDuration, onChange, onCursor }) {
    /** null is the whole case; otherwise the window in minutes. */
    let view = null;

    const duration = () => getDuration();
    const minSpan = () => Math.min(MIN_SPAN_MIN, duration());

    /** The window to draw, always inside [0, duration]. */
    function window_() {
        const d = duration();
        if (!view) return { min: 0, max: d };
        const span = Math.min(Math.max(view.max - view.min, minSpan()), d);
        const min = Math.min(Math.max(view.min, 0), d - span);
        return { min, max: min + span };
    }

    function isZoomed() {
        const w = window_();
        return w.max - w.min < duration() - 1e-9;
    }

    function set(min, max) {
        const d = duration();
        const span = Math.min(Math.max(max - min, minSpan()), d);
        const lo = Math.min(Math.max(min, 0), d - span);
        view = span >= d - 1e-9 ? null : { min: lo, max: lo + span };
        onChange();
    }

    function reset() {
        if (!view) return;
        view = null;
        onChange();
    }

    /** Scales the window by `factor` (<1 zooms in), keeping time `anchor` where it is on screen. */
    function zoomBy(factor, anchor) {
        const w = window_();
        const span = w.max - w.min;
        const next = Math.min(Math.max(span * factor, minSpan()), duration());
        const frac = span > 0 ? (anchor - w.min) / span : 0.5;
        set(anchor - frac * next, anchor - frac * next + next);
    }

    // ------------------------------------------------------------ geometry

    function area() {
        const chart = getChart();
        if (!chart?.chartArea || !chart.scales?.x) return null;
        const rect = chart.canvas.getBoundingClientRect();
        return { chart, left: rect.left + chart.chartArea.left, width: chart.chartArea.right - chart.chartArea.left };
    }

    /** The minute under a screen x, from the current window. */
    function timeAt(clientX) {
        const a = area();
        if (!a || a.width <= 0) return null;
        const w = window_();
        const frac = Math.min(Math.max((clientX - a.left) / a.width, 0), 1);
        return w.min + frac * (w.max - w.min);
    }

    // ------------------------------------------------------------ pointers

    const pointers = new Map();     // pointerId -> { x, y }
    let drag = null;                // one-finger gesture in progress
    let pinch = null;               // two-finger gesture in progress
    let lastTap = null;

    const distance = () => {
        const [a, b] = [...pointers.values()];
        return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const midX = () => {
        const [a, b] = [...pointers.values()];
        return (a.x + b.x) / 2;
    };

    host.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        host.setPointerCapture(e.pointerId);
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 1) {
            const w = window_();
            drag = { x: e.clientX, y: e.clientY, min: w.min, span: w.max - w.min, moved: false, scrub: false };
        } else if (pointers.size === 2) {
            // A second finger turns whatever the first was doing into a pinch.
            drag = null;
            const w = window_();
            const a = area();
            pinch = a && {
                span: w.max - w.min,
                dist: Math.max(distance(), 1),
                anchor: timeAt(midX()),
                width: a.width
            };
        }
    });

    host.addEventListener('pointermove', (e) => {
        if (!pointers.has(e.pointerId)) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (pinch && pointers.size >= 2) {
            const a = area();
            if (!a || a.width <= 0) return;
            const d = duration();
            const span = Math.min(Math.max(pinch.span * pinch.dist / Math.max(distance(), 1), minSpan()), d);
            // Keep the minute that was under the midpoint at the start under the
            // midpoint now: that is both the zoom centre and the pan.
            const frac = Math.min(Math.max((midX() - a.left) / a.width, 0), 1);
            set(pinch.anchor - frac * span, pinch.anchor - frac * span + span);
            return;
        }

        if (!drag || pointers.size !== 1) return;
        const dx = e.clientX - drag.x;
        const dy = e.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) > TAP_SLOP_PX) drag.moved = true;
        if (!drag.moved) return;

        if (isZoomed()) {
            const a = area();
            if (!a || a.width <= 0) return;
            const min = drag.min - (dx / a.width) * drag.span;
            set(min, min + drag.span);
        } else {
            // Not zoomed, so there is nothing to pan: the finger moves the cursor.
            // Only once the move is mostly sideways, so starting a vertical page
            // scroll on the chart does not drag the cursor along with it.
            if (!drag.scrub && Math.abs(dx) > Math.abs(dy)) drag.scrub = true;
            if (drag.scrub) {
                const t = timeAt(e.clientX);
                if (t !== null) onCursor(t);
            }
        }
    });

    function finish(e) {
        if (!pointers.has(e.pointerId)) return;
        const wasTap = drag && !drag.moved && e.type === 'pointerup';
        pointers.delete(e.pointerId);
        if (pointers.size < 2) pinch = null;
        if (pointers.size === 0) {
            drag = null;
            if (wasTap) tap(e);
        } else if (pointers.size === 1) {
            // One finger of a pinch is still down; it pans from where it is now
            // rather than jumping back to where the first finger started.
            const [rest] = pointers.values();
            const w = window_();
            drag = { x: rest.x, y: rest.y, min: w.min, span: w.max - w.min, moved: true, scrub: false };
        }
    }
    host.addEventListener('pointerup', finish);
    host.addEventListener('pointercancel', finish);

    function tap(e) {
        const now = e.timeStamp;
        if (lastTap && now - lastTap.at < DOUBLE_TAP_MS
            && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < DOUBLE_TAP_PX) {
            lastTap = null;
            reset();
            return;
        }
        lastTap = { at: now, x: e.clientX, y: e.clientY };
        const t = timeAt(e.clientX);
        if (t !== null) onCursor(t);
    }

    host.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const t = timeAt(e.clientX);
            if (t !== null) zoomBy(Math.exp(e.deltaY * 0.01), t);
        } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && isZoomed()) {
            e.preventDefault();
            const a = area();
            if (!a || a.width <= 0) return;
            const w = window_();
            const shift = (e.deltaX / a.width) * (w.max - w.min);
            set(w.min + shift, w.max + shift);
        }
    }, { passive: false });

    return {
        window: window_,
        isZoomed,
        reset,
        /** Button zoom, about the middle of what is showing. */
        step(factor) {
            const w = window_();
            zoomBy(factor, (w.min + w.max) / 2);
        }
    };
}
