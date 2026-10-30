const inject = async () => {
  const commonSettings = {
    allFrames: true,
    runAt: "document_start",
    matchOriginAsFallback: true,
    matches: ["*://*/*"],
  };


  await chrome.scripting.unregisterContentScripts();

  await chrome.scripting.registerContentScripts([
    {
      ...commonSettings,
      id: "main",
      js: ["/scripts/speed.js"],
      world: "MAIN",
    },
    {
      ...commonSettings,
      id: "hide-shorts",
      js: ["/scripts/hide-shorts.js"],
      world: "MAIN",
    },
  ]);
};

inject();