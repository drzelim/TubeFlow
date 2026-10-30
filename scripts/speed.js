{
  const SPEED_KEY = "yt-player-playback-rate";

  const newData = {
    creation: Date.now(),
    data: "2",
  };

  window.sessionStorage.setItem(SPEED_KEY, JSON.stringify(newData));
}
