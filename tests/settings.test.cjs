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
      querySelector: () => null,
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

test('keyboard speed indicator updates, resets its timeout and disappears', async () => {
  const app = setup();
  const children = [];
  const player = { append(node) { children.push(node); node.parentNode = this; } };
  app.context.document.querySelector = () => player;
  app.context.document.createElement = () => ({
    style: {}, setAttribute() {},
    remove() { children.splice(children.indexOf(this), 1); this.parentNode = null; },
  });
  const timers = new Map();
  let timerId = 0;
  app.context.setTimeout = (callback, delay) => {
    assert.equal(delay, 2000);
    timers.set(++timerId, callback);
    return timerId;
  };
  app.context.clearTimeout = (id) => timers.delete(id);
  app.context.chrome.storage.local.set = async () => {};
  for (const file of ['settings.js', 'speed.js']) {
    vm.runInContext(fs.readFileSync(`scripts/${file}`, 'utf8'), app.context);
  }
  await new Promise(setImmediate);
  assert.equal(children.length, 0);
  const press = () => app.events.keydown({
    code: 'Period', shiftKey: true, composedPath: () => [],
    preventDefault() {}, stopImmediatePropagation() {},
  });
  press();
  assert.equal(children.length, 1);
  assert.equal(children[0].textContent, '2,25×');
  const indicator = children[0];
  press();
  assert.equal(children.length, 1);
  assert.equal(children[0], indicator);
  assert.equal(indicator.textContent, '2,5×');
  assert.equal(timers.size, 1);
  timers.get(timerId)();
  assert.equal(children.length, 0);
  press();
  assert.equal(children.length, 1);
  assert.equal(children[0].textContent, '2,75×');
});

test('invalid saved speeds fall back to 2x', async () => {
  const app = setup({ playbackSpeed: 100 });
  for (const file of ['settings.js', 'speed.js']) {
    vm.runInContext(fs.readFileSync(`scripts/${file}`, 'utf8'), app.context);
  }
  await new Promise(setImmediate);
  assert.equal(app.video.playbackRate, 2);
});

test('toolbar badge shows the saved speed and follows local changes', async () => {
  const app = setup({ playbackSpeed: 1.25 });
  const badgeUpdates = [];
  app.context.chrome.runtime = {
    onInstalled: { addListener() {} },
    onStartup: { addListener() {} },
  };
  app.context.chrome.action = {
    setBadgeText: async ({ text }) => badgeUpdates.push(text),
  };
  app.context.importScripts = (file) => {
    vm.runInContext(fs.readFileSync(file, 'utf8'), app.context);
  };
  vm.runInContext(fs.readFileSync('background.js', 'utf8'), app.context);
  await new Promise(setImmediate);
  assert.deepEqual(badgeUpdates, ['1,25']);
  app.change({ playbackSpeed: { newValue: 4 } });
  await new Promise(setImmediate);
  assert.equal(badgeUpdates.at(-1), '4');
  app.change({ playbackSpeed: { newValue: undefined } });
  await new Promise(setImmediate);
  assert.equal(badgeUpdates.at(-1), '2');
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
  const elements = Object.fromEntries(['hide-shorts', 'speed', 'speed-value', 'speed-decrease', 'speed-increase', 'status'].map((id) => [id, {
    disabled: true,
    events: {},
    addEventListener(name, listener) { this.events[name] = listener; },
    setAttribute() {},
  }]));
  Object.assign(elements.speed, { min: '0.25', max: '4', step: '0.25' });
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
  elements['speed-increase'].events.click();
  elements['speed-increase'].events.click();
  await new Promise(setImmediate);
  assert.equal(Number(elements.speed.value), 4);
  assert.equal(elements['speed-increase'].disabled, true);
  assert.equal(saved.at(-1).playbackSpeed, 4);
  elements['speed-decrease'].events.click();
  await new Promise(setImmediate);
  assert.equal(Number(elements.speed.value), 3.75);
  assert.equal(elements['speed-increase'].disabled, false);
  elements.speed.value = '0.25';
  elements.speed.events.input();
  assert.equal(elements['speed-decrease'].disabled, true);
});

test('keyboard speed controls save changes, respect bounds and ignore text input', async () => {
  const app = setup({ playbackSpeed: 3.75 });
  const saved = [];
  app.context.chrome.storage.local.set = async (values) => saved.push({ ...values });
  for (const file of ['settings.js', 'speed.js']) {
    vm.runInContext(fs.readFileSync(`scripts/${file}`, 'utf8'), app.context);
  }
  await new Promise(setImmediate);
  function press(overrides = {}) {
    let prevented = false;
    const target = { tagName: 'VIDEO', isContentEditable: false, closest: () => null };
    app.events.keydown({
      code: 'Period', altKey: false, shiftKey: true, ctrlKey: false, metaKey: false,
      target, composedPath: () => [target],
      preventDefault() { prevented = true; }, stopImmediatePropagation() {}, ...overrides,
    });
    return prevented;
  }
  assert.equal(press(), true);
  await new Promise(setImmediate);
  assert.equal(app.video.playbackRate, 4);
  press();
  await new Promise(setImmediate);
  assert.equal(app.video.playbackRate, 4);
  assert.equal(saved.length, 1);
  press({ code: 'Comma' });
  await new Promise(setImmediate);
  assert.equal(saved.at(-1).playbackSpeed, 3.75);
  for (const target of [
    { tagName: 'INPUT' }, { tagName: 'TEXTAREA' }, { tagName: 'SELECT' },
    { tagName: 'SPAN', isContentEditable: true },
    { tagName: 'SPAN', closest: () => ({ role: 'textbox' }) },
  ]) {
    assert.equal(press({ target, composedPath: () => [target] }), false);
  }
  assert.equal(press({ shiftKey: false }), false);
  assert.equal(press({ altKey: true }), false);
  assert.equal(press({ ctrlKey: true }), false);
  assert.equal(press({ isComposing: true }), false);
  assert.equal(app.video.playbackRate, 3.75);
  app.change({ playbackSpeed: { newValue: 0.25 } });
  press({ code: 'Comma' });
  await new Promise(setImmediate);
  assert.equal(app.video.playbackRate, 0.25);
  for (const speed of [2, 1, 3, 4]) {
    assert.equal(press({ code: `Digit${speed}` }), true);
    assert.equal(app.video.playbackRate, speed);
    assert.equal(app.video.defaultPlaybackRate, speed);
    await new Promise(setImmediate);
    assert.equal(saved.at(-1).playbackSpeed, speed);
  }
  const savedCount = saved.length;
  assert.equal(press({ code: 'Digit4' }), true);
  assert.equal(press({ code: 'Digit0' }), false);
  assert.equal(press({ code: 'Digit5' }), false);
  assert.equal(press({ code: 'Digit1', shiftKey: false }), false);
  assert.equal(press({ code: 'Digit1', composedPath: () => [{ tagName: 'INPUT' }] }), false);
  await new Promise(setImmediate);
  assert.equal(saved.length, savedCount);
  assert.equal(app.video.playbackRate, 4);
});
