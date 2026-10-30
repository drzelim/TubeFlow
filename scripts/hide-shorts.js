{
  const style = document.createElement('style');
  style.textContent = `
    ytd-reel-shelf-renderer,
    ytd-rich-shelf-renderer[is-shorts],
    ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts]),
    ytd-rich-item-renderer:has(a[href^="/shorts/"]),
    ytd-video-renderer:has(a[href^="/shorts/"]),
    ytd-grid-video-renderer:has(a[href^="/shorts/"]),
    ytd-reel-item-renderer,
    yt-shorts-lockup-view-model,
    ytd-guide-entry-renderer:has(a[href^="/shorts"]),
    ytd-mini-guide-entry-renderer:has(a[href^="/shorts"]),
    yt-tab-shape:has(a[href$="/shorts"]) {
      display: none !important;
    }
  `;
  let enabled = false;
  const update = () => {
    if (enabled && document.documentElement) {
      if (!style.isConnected) document.documentElement.append(style);
    } else {
      style.remove();
    }
  };
  youtube2xSettings.subscribe((settings) => {
    enabled = settings.hideShorts;
    update();
  });
  document.addEventListener('DOMContentLoaded', update, { once: true });
}
