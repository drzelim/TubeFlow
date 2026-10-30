{
  let speed;
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
    if (event.code !== 'Period' && event.code !== 'Comma') return;
    const path = event.composedPath();
    if (path.some((node) => node.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName) || node.closest?.('[role="textbox"]'))) return;

    // Handle YouTube's shortcuts before its player to avoid applying the step twice.
    event.preventDefault();
    event.stopImmediatePropagation();
    const next = Math.min(4, Math.max(0.25, speed + (event.code === 'Period' ? 0.25 : -0.25)));
    if (next === speed) return;
    speed = next;
    applySpeed();
    saveQueue = saveQueue.then(() => chrome.storage.local.set({ playbackSpeed: next })).catch(console.error);
  }, true);
  new MutationObserver(applySpeed).observe(document, { childList: true, subtree: true });
}
