{
  const MIN_SPEED = 0.25;
  const MAX_SPEED = 4;
  const STEP = 0.25;

  let speed;
  let speedIndicator;
  let indicatorTimer;
  const showSpeedIndicator = () => {
    const player = document.querySelector('.html5-video-player');
    if (!player) return;
    if (!speedIndicator) {
      speedIndicator = document.createElement('div');
      speedIndicator.setAttribute('role', 'status');
      speedIndicator.setAttribute('aria-live', 'polite');
      speedIndicator.style.cssText = `
        position: absolute; top: 18px; left: 50%; transform: translateX(-50%);
        z-index: 10000; pointer-events: none; user-select: none;
        box-sizing: border-box; min-width: 90px; padding: 10px 16px;
        border-radius: 6px; background: rgba(0, 0, 0, 0.78); color: #fff;
        font: 600 20px/1.3 system-ui, sans-serif; letter-spacing: 0;
        font-variant-numeric: tabular-nums; text-align: center;
      `;
    }
    speedIndicator.textContent = `${speed.toLocaleString('ru-RU')}\u00d7`;
    if (speedIndicator.parentNode !== player) player.append(speedIndicator);
    clearTimeout(indicatorTimer);
    indicatorTimer = setTimeout(() => speedIndicator.remove(), 2000);
  };
  const applySpeed = () => {
    if (speed === undefined) return;
    document.querySelectorAll('video').forEach((video) => {
      if (video.defaultPlaybackRate !== speed) video.defaultPlaybackRate = speed;
      if (video.playbackRate !== speed) video.playbackRate = speed;
    });
  };
  youtube2xSettings.subscribe((settings) => {
    speed = settings.playbackSpeed;
    applySpeed();
  });
  document.addEventListener('loadedmetadata', applySpeed, true);
  document.addEventListener('play', applySpeed, true);
  document.addEventListener('ratechange', applySpeed, true);
  let saveQueue = Promise.resolve();
  document.addEventListener('keydown', (event) => {
    if (speed === undefined || event.defaultPrevented || event.isComposing || !event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
    const digit = /^Digit([1-4])$/.exec(event.code);
    if (!digit && event.code !== 'Period' && event.code !== 'Comma') return;
    const path = event.composedPath();
    if (path.some((node) => node.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName) || node.closest?.('[role="textbox"]'))) return;

    // Handle YouTube's shortcuts before its player to avoid applying the step twice.
    event.preventDefault();
    event.stopImmediatePropagation();
    const next = digit
      ? Number(digit[1])
      : Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed + (event.code === 'Period' ? STEP : -STEP)));
    if (next === speed) {
      showSpeedIndicator();
      return;
    }
    speed = next;
    applySpeed();
    showSpeedIndicator();
    saveQueue = saveQueue.then(() => chrome.storage.local.set({ playbackSpeed: next })).catch(console.error);
  }, true);
  new MutationObserver(applySpeed).observe(document, { childList: true, subtree: true });
}
