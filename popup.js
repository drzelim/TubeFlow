const { MIN_SPEED, MAX_SPEED, SPEED_STEP } = youtube2xSettings;
const shortsInput = document.getElementById('hide-shorts');
const speedInput = document.getElementById('speed');
const speedOutput = document.getElementById('speed-value');
const decreaseButton = document.getElementById('speed-decrease');
const increaseButton = document.getElementById('speed-increase');
const status = document.getElementById('status');
function formatSpeed(speed) {
  return `${speed.toLocaleString('ru-RU')}×`;
}
speedInput.min = String(MIN_SPEED);
speedInput.max = String(MAX_SPEED);
speedInput.step = String(SPEED_STEP);
document.getElementById('speed-min').textContent = formatSpeed(MIN_SPEED);
document.getElementById('speed-max').textContent = formatSpeed(MAX_SPEED);

function renderSpeed() {
  const speed = Number(speedInput.value);
  const label = formatSpeed(speed);
  speedOutput.value = label;
  speedInput.setAttribute('aria-valuetext', label);
  decreaseButton.disabled = speedInput.disabled || speed <= MIN_SPEED;
  increaseButton.disabled = speedInput.disabled || speed >= MAX_SPEED;
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
  const next = Math.min(MAX_SPEED, Math.max(MIN_SPEED, current + direction * SPEED_STEP));
  if (next === current) return;
  speedInput.value = next;
  renderSpeed();
  save({ playbackSpeed: next });
}
decreaseButton.addEventListener('click', () => stepSpeed(-1));
increaseButton.addEventListener('click', () => stepSpeed(1));
