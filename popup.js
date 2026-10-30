const shortsInput = document.getElementById('hide-shorts');
const speedInput = document.getElementById('speed');
const speedOutput = document.getElementById('speed-value');
const status = document.getElementById('status');
function renderSpeed() {
  const label = `${Number(speedInput.value).toLocaleString('ru-RU')}×`;
  speedOutput.value = label;
  speedInput.setAttribute('aria-valuetext', label);
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
  renderSpeed();
  shortsInput.disabled = false;
  speedInput.disabled = false;
}).catch(() => {
  status.textContent = 'Не удалось загрузить настройки';
});
shortsInput.addEventListener('change', () => save({ hideShorts: shortsInput.checked }));
speedInput.addEventListener('input', () => {
  renderSpeed();
  save({ playbackSpeed: Number(speedInput.value) });
});
