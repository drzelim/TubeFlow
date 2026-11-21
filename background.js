importScripts('scripts/settings.js');

youtube2xSettings.subscribe(({ playbackSpeed }) => {
  const text = playbackSpeed.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
  chrome.action.setBadgeText({ text }).catch(console.error);
});

// Wake the worker at browser startup so the settings subscription restores the badge.
chrome.runtime.onStartup.addListener(() => {});

// Clean up persistent registrations from the previous version.
chrome.runtime.onInstalled.addListener(async () => {
  const scripts = await chrome.scripting.getRegisteredContentScripts();
  const ids = scripts.map(({ id }) => id).filter((id) => ['main', 'hide-shorts'].includes(id));
  if (ids.length) await chrome.scripting.unregisterContentScripts({ ids });
});
