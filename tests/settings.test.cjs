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

test('Shorts hiding can be disabled and enabled without removing page content', async () => {
  const app = setup();
  const style = { isConnected: false, remove() { this.isConnected = false; } };
  app.context.document.createElement = () => style;
  app.context.document.documentElement = { append(node) { node.isConnected = true; } };
  for (const file of ['settings.js', 'hide-shorts.js']) {
    vm.runInContext(fs.readFileSync(`scripts/${file}`, 'utf8'), app.context);
  }
  await new Promise(setImmediate);
  assert.equal(style.isConnected, true);
  app.change({ hideShorts: { newValue: false } });
  assert.equal(style.isConnected, false);
  app.change({ hideShorts: { newValue: true } });
  assert.equal(style.isConnected, true);
});

test('popup loads settings and saves switch and slider changes', async () => {
  const app = setup({ hideShorts: false, playbackSpeed: 1.25 });
  const elements = Object.fromEntries(['hide-shorts', 'speed', 'speed-value', 'status'].map((id) => [id, {
    disabled: true,
    events: {},
    addEventListener(name, listener) { this.events[name] = listener; },
    setAttribute() {},
  }]));
  const saved = [];
  app.context.document.getElementById = (id) => elements[id];
  app.context.chrome.storage.local.set = async (values) => saved.push({ ...values });
  for (const file of ['scripts/settings.js', 'popup.js']) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), app.context);
  }
  await new Promise(setImmediate);
  assert.equal(elements['hide-shorts'].checked, false);
  assert.equal(elements.speed.value, 1.25);
  assert.equal(elements.speed.disabled, false);
  elements['hide-shorts'].checked = true;
  elements['hide-shorts'].events.change();
  elements.speed.value = '3.5';
  elements.speed.events.input();
  await new Promise(setImmediate);
  assert.deepEqual(saved, [{ hideShorts: true }, { playbackSpeed: 3.5 }]);
});
