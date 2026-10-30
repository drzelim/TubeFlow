// Clean up persistent registrations from the previous version.
chrome.runtime.onInstalled.addListener(async () => {
  const scripts = await chrome.scripting.getRegisteredContentScripts();
  const ids = scripts.map(({ id }) => id).filter((id) => ['main', 'hide-shorts'].includes(id));
  if (ids.length) await chrome.scripting.unregisterContentScripts({ ids });
});
