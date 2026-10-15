import * as THREE from '../vendor/three.module.min.js';

/** Local presentation candidate. Restore before the mixer; apply afterwards.
 * Distribute longitudinal twist while preserving the animated hand transform.
 * This never changes motion clips, geometry, skin weights or NPCs.
 */
export function createForearmTwist(model) {
  const sides = [], axis = new THREE.Vector3(), mapped = new THREE.Vector3();
  const distalRotation = new THREE.Quaternion(), relative = new THREE.Quaternion();
  const twist = new THREE.Quaternion(), proximal = new THREE.Quaternion();
  const farther = new THREE.Quaternion(), total = new THREE.Quaternion();
  const identity = new THREE.Quaternion();
  let applied = false, disposed = false;
  for (const side of ['L', 'R']) {
    // GLTFLoader removes periods from names used by animation bindings.
    const arm = model.getObjectByName(`lowerarm01${side}`);
    const distal = model.getObjectByName(`lowerarm02${side}`);
    const wrist = model.getObjectByName(`wrist${side}`);
    if (!arm?.isBone || !distal?.isBone || !wrist?.isBone || distal.parent !== arm || wrist.parent !== distal) continue;
    const direction = distal.position.clone().normalize();
    if (direction.lengthSq() < .99 || direction.dot(wrist.position.clone().normalize()) < 1 - 1e-9) continue;
    sides.push({arm, distal, wrist, direction, saved: [new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion()]});
  }
  function restore() {
    if (!applied) return;
    for (const side of sides) {
      side.arm.quaternion.copy(side.saved[0]);
      side.distal.quaternion.copy(side.saved[1]);
      side.wrist.quaternion.copy(side.saved[2]);
    }
    applied = false;
  }
  return {
    supportedSides: sides.length,
    restore,
    apply(gaitWeight = 1) {
      restore();
      if (disposed || !Number.isFinite(gaitWeight) || gaitWeight <= 0) return 0;
      const weight = Math.min(1, gaitWeight);
      let count = 0;
      for (const side of sides) {
        const {arm, distal, wrist, saved} = side;
        saved[0].copy(arm.quaternion); saved[1].copy(distal.quaternion); saved[2].copy(wrist.quaternion);
        axis.copy(side.direction);
        mapped.copy(axis).applyQuaternion(distal.quaternion);
        // Bending this middle joint breaks the straight twist-chain assumption.
        // Leave that animated chain alone instead of displacing its wrist.
        if (mapped.dot(axis) < 1 - 1e-9) continue;
        relative.copy(distal.quaternion).multiply(wrist.quaternion);
        const projection = relative.x * axis.x + relative.y * axis.y + relative.z * axis.z;
        twist.set(axis.x * projection, axis.y * projection, axis.z * projection, relative.w);
        if (!Number.isFinite(twist.lengthSq()) || twist.lengthSq() < 1e-12) continue;
        twist.normalize();
        if (twist.w < 0) twist.set(-twist.x, -twist.y, -twist.z, -twist.w);
        proximal.copy(identity).slerp(twist, .45 * weight);
        farther.copy(identity).slerp(twist, .35 * weight);
        total.copy(identity).slerp(twist, .8 * weight).invert();
        arm.quaternion.multiply(proximal);
        distalRotation.copy(distal.quaternion);
        distal.quaternion.premultiply(farther);
        // The compensating wrist rotation leaves the captured palm and fingers
        // exactly where the mixer placed them, including interrupted crossfades.
        wrist.quaternion.copy(distalRotation).invert().multiply(total).multiply(relative);
        count++;
      }
      applied = true;
      return count;
    },
    dispose() { restore(); disposed = true; },
  };
}
