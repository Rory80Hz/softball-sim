export function attributeToRealWorld(attrValue) {
    return (attrValue / 100);
}


// Players take a moment to reach top speed rather than starting at full pace.
export const ACCELERATION_TIME = 0.35;

// Moves entity.pos toward target; returns true on arrival. Arrival never jumps further
// than one frame's step, so there is no visible snap at the destination.
export function advanceToward(entity, target, dt, maxSpeed) {
    entity.currentSpeed = Math.min(maxSpeed, (entity.currentSpeed || 0) + (maxSpeed / ACCELERATION_TIME) * dt);
    const dx = target.x - entity.pos.x;
    const dy = target.y - entity.pos.y;
    const dist = Math.hypot(dx, dy);
    const step = entity.currentSpeed * dt;
    if (dist <= Math.max(step, 0.01)) {
        entity.pos.x = target.x;
        entity.pos.y = target.y;
        return true;
    }
    entity.pos.x += (dx / dist) * step;
    entity.pos.y += (dy / dist) * step;
    return false;
}
