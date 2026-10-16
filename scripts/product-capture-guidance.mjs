// Local recording annotations only. Never imported by the application.
/* global window, document, requestAnimationFrame, innerHeight, innerWidth, scrollY, scrollTo */
export function installProductGuidance() {
  if (window.keelwatchCaptureGuidance) return;
  const layer = document.createElement('div');
  layer.id = 'keelwatch-capture-guidance';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
  const marker = document.createElement('div');
  marker.style.cssText =
    'position:absolute;display:none;border:2px solid var(--color-accent-primary);border-radius:var(--border-radius-sm);box-shadow:0 0 0 2px var(--color-bg-primary);';
  const pointer = document.createElement('div');
  pointer.style.cssText = 'position:absolute;left:0;top:0;width:24px;height:30px;';
  pointer.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 30"><path d="M3 2 L3 24 L9 18 L14 28 L19 25 L14 16 L22 16 Z" fill="var(--color-text-primary)" stroke="var(--color-bg-primary)" stroke-width="2"/></svg>';
  const clickRing = document.createElement('div');
  clickRing.style.cssText =
    'position:absolute;display:none;width:32px;height:32px;border:3px solid var(--color-accent-primary);border-radius:50%;transform:translate(-50%,-50%);';
  layer.append(marker, clickRing, pointer);
  document.body.append(layer);
  let position = { x: 1120, y: 680 };
  const placePointer = () => {
    pointer.style.transform = `translate(${position.x}px,${position.y}px)`;
  };
  placePointer();
  const animate = (duration, update) =>
    new Promise((done) => {
      let started;
      const frame = (now) => {
        started ??= now;
        const progress = Math.min(1, (now - started) / duration);
        update(progress * progress * (3 - 2 * progress));
        if (progress < 1) requestAnimationFrame(frame);
        else done();
      };
      requestAnimationFrame(frame);
    });
  const mark = (element) => {
    if (!element) {
      marker.style.display = 'none';
      return;
    }
    const rect = element.getBoundingClientRect();
    const top = Math.max(84, rect.top - 5);
    const bottom = Math.min(innerHeight - 10, rect.bottom + 5);
    if (bottom <= top) return mark(null);
    Object.assign(marker.style, {
      display: 'block',
      left: `${Math.max(5, rect.left - 5)}px`,
      top: `${top}px`,
      width: `${Math.min(innerWidth - 10, rect.width + 10)}px`,
      height: `${bottom - top}px`,
    });
  };
  window.keelwatchCaptureGuidance = {
    mark,
    async reveal(element, instant = false, align = 'nearest') {
      const rect = element.getBoundingClientRect();
      const available = innerHeight - 122;
      const visible = Math.min(innerHeight - 24, rect.bottom) - Math.max(98, rect.top);
      let target = scrollY;
      if (align === 'start' || rect.height > available) {
        if (align === 'start' || visible < available * 0.6) target += rect.top - 98;
      } else if (rect.top < 98) target += rect.top - 98;
      else if (rect.bottom > innerHeight - 24) target += rect.bottom - innerHeight + 24;
      target = Math.max(
        0,
        Math.min(document.documentElement.scrollHeight - innerHeight, target),
      );
      const from = scrollY;
      mark(null);
      if (Math.abs(target - from) > 2) {
        if (instant) scrollTo({ top: target, behavior: 'instant' });
        else
          await animate(
            Math.min(2600, Math.max(500, Math.abs(target - from) / 1.8)),
            (progress) =>
              scrollTo({ top: from + (target - from) * progress, behavior: 'instant' }),
          );
      }
      mark(element);
    },
    async point(element, instant = false) {
      const rect =
        [...element.getClientRects()].find(
          (fragment) => fragment.top >= 0 && fragment.bottom <= innerHeight,
        ) ?? element.getBoundingClientRect();
      const target = {
        x: rect.left + Math.min(rect.width / 2, 100),
        y: rect.top + rect.height / 2,
      };
      const from = { ...position };
      await animate(instant ? 1 : 340, (progress) => {
        position = {
          x: from.x + (target.x - from.x) * progress,
          y: from.y + (target.y - from.y) * progress,
        };
        placePointer();
      });
      return target;
    },
    async clicked() {
      Object.assign(clickRing.style, {
        display: 'block',
        left: `${position.x}px`,
        top: `${position.y}px`,
      });
      await new Promise((done) => setTimeout(done, 220));
      clickRing.style.display = 'none';
    },
  };
}
