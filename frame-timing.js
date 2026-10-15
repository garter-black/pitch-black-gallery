// A semi-fixed update keeps physics, pose and camera on the same clock.
// Normal frame stalls are consumed in small steps; long suspensions are bounded.
export const MAX_FRAME_SECONDS = 0.25;
export const MAX_STEP_SECONDS = 1 / 60;

export function frameSeconds(elapsedSeconds) {
  return Number.isFinite(elapsedSeconds) ? Math.min(MAX_FRAME_SECONDS, Math.max(0, elapsedSeconds)) : 0;
}

export function advanceFrame(elapsedSeconds, update) {
  const elapsed = frameSeconds(elapsedSeconds);
  if (elapsed === 0) { update(0); return 0; }
  const steps = Math.ceil(elapsed / MAX_STEP_SECONDS);
  // Equal subdivisions avoid a floating-point sliver becoming a false stop
  // when presentation derives speed from position delta / elapsed time.
  const dt = elapsed / steps;
  for (let i = 0; i < steps; i++) update(dt);
  return elapsed;
}
