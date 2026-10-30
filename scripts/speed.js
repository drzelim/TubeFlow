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
  new MutationObserver(applySpeed).observe(document, { childList: true, subtree: true });
}
