const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(saved = {}) {
  let storageListener;
  const events = {};
  const video = { playbackRate: 1, defaultPlaybackRate: 1 };
  const context = vm.createContext({
    console,
    chrome: {
      storage: {
        local: { get: async (defaults) => ({ ...defaults, ...saved }) },
        onChanged: { addListener: (listener) => { storageListener = listener; } },
      },
    },
    document: {
      querySelectorAll: () => [video],
      addEventListener: (name, listener) => { events[name] = listener; },
    },
    MutationObserver: class { observe() {} },
  });
  return { context, video, events, change: (changes) => storageListener(changes, 'local') };
}

test('saved speed applies to existing videos and live changes', async () => {
  const app = setup({ playbackSpeed: 1.5 });
  for (const file of ['settings.js', 'speed.js']) {
    vm.runInContext(fs.readFileSync(`scripts/${file}`, 'utf8'), app.context);
  }
  await new Promise(setImmediate);
  assert.equal(app.video.playbackRate, 1.5);
  app.change({ playbackSpeed: { newValue: 2.75 } });
  assert.equal(app.video.playbackRate, 2.75);
  app.video.playbackRate = 1;
  app.events.loadedmetadata({ target: app.video });
  assert.equal(app.video.playbackRate, 2.75);
});

test('invalid saved speeds fall back to 2x', async () => {
  const app = setup({ playbackSpeed: 100 });
  for (const file of ['settings.js', 'speed.js']) {
    vm.runInContext(fs.readFileSync(`scripts/${file}`, 'utf8'), app.context);
  }
  await new Promise(setImmediate);
  assert.equal(app.video.playbackRate, 2);
});
