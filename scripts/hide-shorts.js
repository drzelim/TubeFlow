{
  const MAX_COUNT = 7;

  const timerIdObj = {};
  const counts = {};

  function debounce(func, delay) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => func.apply(this, args), delay);
    };
  }

  const shortsSelector = [
    'ytd-rich-shelf-renderer',
    'ytd-rich-section-renderer',
    'ytd-reel-shelf-renderer',
  ].join(', ');

  const deleteShortsList = () => {
    const shorts = self.document.querySelectorAll(shortsSelector);

    if (shorts.length) {
      console.log('Shorts are hidden');
      self.requestAnimationFrame(() => {
        shorts.forEach(item => item.style.display = 'none');
      });
    }
  };

  const debouncedDeleteShortsList = debounce(deleteShortsList, 500);

  debouncedDeleteShortsList();
  setTimeout(debouncedDeleteShortsList, 5000);

  const callback = (mutationList) => {
    for (let mutation of mutationList) {
      if (mutation.type === 'childList' && mutation.addedNodes.length) {
        const childNode = mutation.addedNodes[0];
        if (!(childNode instanceof Element)) return;

        debouncedDeleteShortsList();
      }
    }
  };

  const config = { attributes: true, childList: true, subtree: true };

  const observer = new MutationObserver(callback);
  observer.observe(self.document, config);
}
