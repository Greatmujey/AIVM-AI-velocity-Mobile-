// Brake opposes current motion before engaging reverse, and acceleration is
// frame-rate independent. A negative throttle requests braking/reverse.
export function advanceVehicleSpeed(speed, throttle, dt, maxForward) {
  throttle = Math.max(-1, Math.min(1, throttle));
  if (throttle && speed * throttle < 0) {
    const braking = 24 * dt;
    speed = Math.abs(speed) <= braking ? 0 : speed - Math.sign(speed) * braking;
  } else if (throttle) {
    speed += throttle * 15 * dt;
  } else {
    speed *= Math.exp(-2.5 * dt);
  }
  if (throttle) speed *= Math.exp(-.45 * dt);
  return Math.max(-6, Math.min(maxForward, speed));
}
