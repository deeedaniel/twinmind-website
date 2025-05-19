export const formatTime = (secs: number) => {
  const mins = Math.floor(secs / 60)
    .toString()
    .padStart(2, "0");
  const secsLeft = (secs % 60).toString().padStart(2, "0");
  return `${mins}:${secsLeft}`;
};
