const shortsInput = document.getElementById('hide-shorts');
const speedInput = document.getElementById('speed');
const speedOutput = document.getElementById('speed-value');
const decreaseButton = document.getElementById('speed-decrease');
const increaseButton = document.getElementById('speed-increase');
const status = document.getElementById('status');
function renderSpeed() {
  const label = `${Number(speedInput.value).toLocaleString('ru-RU')}×`;
  speedOutput.value = label;
  speedInput.setAttribute('aria-valuetext', label);
  decreaseButton.disabled = speedInput.disabled || Number(speedInput.value) <= Number(speedInput.min);
  increaseButton.disabled = speedInput.disabled || Number(speedInput.value) >= Number(speedInput.max);
}
let saveQueue = Promise.resolve();
function save(values) {
  status.textContent = '';
  saveQueue = saveQueue.then(() => chrome.storage.local.set(values)).then(() => {
    status.textContent = 'Сохранено';
  }).catch(() => {
    status.textContent = 'Не удалось сохранить настройки';
  });
}
youtube2xSettings.ready.then((settings) => {
  shortsInput.checked = settings.hideShorts;
  speedInput.value = settings.playbackSpeed;
  shortsInput.disabled = false;
  speedInput.disabled = false;
  renderSpeed();
}).catch(() => {
  status.textContent = 'Не удалось загрузить настройки';
});
shortsInput.addEventListener('change', () => save({ hideShorts: shortsInput.checked }));
speedInput.addEventListener('input', () => {
  renderSpeed();
  save({ playbackSpeed: Number(speedInput.value) });
});
function stepSpeed(direction) {
  if (speedInput.disabled) return;
  const current = Number(speedInput.value);
  const next = Math.min(Number(speedInput.max), Math.max(Number(speedInput.min), current + direction * Number(speedInput.step)));
  if (next === current) return;
  speedInput.value = next;
  renderSpeed();
  save({ playbackSpeed: next });
}
decreaseButton.addEventListener('click', () => stepSpeed(-1));
increaseButton.addEventListener('click', () => stepSpeed(1));
