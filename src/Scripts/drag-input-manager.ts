// drag-input-manager.ts
import * as ecs from '@8thwall/ecs'

ecs.registerComponent({
  name: 'drag-input-manager',
  schema: {
    // Send drags to this entity. If 0/unset, default to our own eid.
    targetEid: ecs.eid,
    // Minimum motion before we consider it a drag (in pixels).
    deadzonePx: ecs.ui32,
    // How much recent history (ms) to use to estimate flick velocity on release.
    velocityWindowMs: ecs.ui32,
    // Optional cap on absurd velocities (px/s), e.g. noisy frames.
    maxSpeedPxPerSec: ecs.ui32,
  },
  schemaDefaults: {
    deadzonePx: 0,
    velocityWindowMs: 100,   // look back ~100ms for a stable end velocity
    maxSpeedPxPerSec: 8000,  // guard against spikes
  },
  data: {},
  add: (world, component) => {
    const {eid, schema} = component
    const target = (schema as any).targetEid || eid
    const DZ = Number((schema as any).deadzonePx ?? 0)
    const VW = Number((schema as any).velocityWindowMs ?? 100)
    const MAXS = Number((schema as any).maxSpeedPxPerSec ?? 8000)

    let active = false
    let startX = 0; let
      startY = 0
    let lastX = 0; let
      lastY = 0

    // recent samples for velocity estimation: [{t, x, y}, ...], t in ms
    const recent: Array<{t: number, x: number, y: number}> = []
    const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

    const onTouchStart = (event: any) => {
      const {x, y} = event.data.position
      active = true
      startX = x; startY = y
      lastX = x; lastY = y
      recent.length = 0
      recent.push({t: nowMs(), x, y})

      world.events.dispatch(world.events.globalId, 'on-drag-start', {targetEid: target, x, y})
    }

    const onTouchMove = (event: any) => {
      if (!active) return
      const {x, y} = event.data.position

      const dx = x - lastX
      const dy = y - lastY
      lastX = x; lastY = y

      // Don’t emit until outside deadzone
      if (Math.abs(x - startX) < DZ && Math.abs(y - startY) < DZ) {
        recent.push({t: nowMs(), x, y})
        // trim window
        const cutoff = nowMs() - (VW + 50)
        while (recent.length && recent[0].t < cutoff) recent.shift()
        return
      }

      recent.push({t: nowMs(), x, y})
      const cutoff = nowMs() - (VW + 50)
      while (recent.length && recent[0].t < cutoff) recent.shift()

      world.events.dispatch(world.events.globalId, 'on-drag', {
        targetEid: target,
        deltaX: dx,
        deltaY: dy,
        totalX: x - startX,
        totalY: y - startY,
        x,
        y,
      })
    }

    const onTouchEnd = (event: any) => {
      if (!active) return
      active = false

      const endPos = event.data.position
      const tEnd = nowMs()
      // include final point
      recent.push({t: tEnd, x: endPos.x, y: endPos.y})

      // compute velocity over last ~VW ms (fallback to the oldest we have)
      const tStart = tEnd - VW
      // find the oldest sample >= tStart, or just the oldest
      let oldest = recent[0]
      for (let i = recent.length - 1; i >= 0; --i) {
        if (recent[i].t <= tStart) {
          oldest = recent[i]; break
        }
        oldest = recent[0]  // if none before tStart, use oldest
      }
      const dt = (tEnd - oldest.t) / 1000  // seconds
      let vx = 0; let vy = 0; let
        speed = 0
      if (dt > 0) {
        vx = (endPos.x - oldest.x) / dt  // px/s
        vy = (endPos.y - oldest.y) / dt
        speed = Math.hypot(vx, vy)
        // clamp outliers
        if (speed > MAXS) {
          const k = MAXS / speed
          vx *= k; vy *= k; speed = MAXS
        }
      }

      world.events.dispatch(world.events.globalId, 'on-drag-end', {
        targetEid: target,
        x: endPos.x,
        y: endPos.y,
        vx,
        vy,
        speed,
      })

      // clear
      recent.length = 0
    }

    world.events.addListener(world.events.globalId, ecs.input.SCREEN_TOUCH_START, onTouchStart)
    world.events.addListener(world.events.globalId, ecs.input.SCREEN_TOUCH_MOVE, onTouchMove)
    world.events.addListener(world.events.globalId, ecs.input.SCREEN_TOUCH_END, onTouchEnd)
  },
  tick: () => {},
  remove: () => {},
})
