const youtube2xSettings = (() => {
  // Keep the limits aligned with SPEED_STEP for the popup slider.
  const MIN_SPEED = 0.25;
  const MAX_SPEED = 6;
  const SPEED_STEP = 0.25;
  const defaults = { hideShorts: true, playbackSpeed: Math.min(MAX_SPEED, Math.max(MIN_SPEED, 2)) };
  let current = { ...defaults };
  const listeners = new Set();
  const changedDuringLoad = new Set();
  let loaded = false;
  function normalize(values) {
    return {
      hideShorts: typeof values.hideShorts === 'boolean' ? values.hideShorts : defaults.hideShorts,
      playbackSpeed: Number.isFinite(values.playbackSpeed) && values.playbackSpeed >= MIN_SPEED && values.playbackSpeed <= MAX_SPEED
        ? values.playbackSpeed : defaults.playbackSpeed,
    };
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    for (const key of Object.keys(defaults)) {
      if (key in changes) {
        current[key] = changes[key].newValue;
        if (!loaded) changedDuringLoad.add(key);
      }
    }
    current = normalize(current);
    listeners.forEach((listener) => listener({ ...current }));
  });
  const ready = chrome.storage.local.get(defaults).then((values) => {
    for (const key of changedDuringLoad) values[key] = current[key];
    current = normalize(values);
    loaded = true;
    listeners.forEach((listener) => listener({ ...current }));
    return { ...current };
  });
  ready.catch(console.error);
  return {
    MIN_SPEED,
    MAX_SPEED,
    SPEED_STEP,
    ready,
    subscribe(listener) {
      listeners.add(listener);
      if (loaded) listener({ ...current });
    },
  };
})();
