import * as ecs from '@8thwall/ecs'
import {ObjectLabel} from './object-label'

ecs.registerComponent({
  name: 'object-rotation-controls',
  schema: {
    cameraEid: ecs.eid,         // optional camera to align axes
    radiansPerPixel: ecs.f32,   // drag sensitivity
    flickThresholdPxPerSec: ecs.f32,
    flickImpulseGain: ecs.f32,  // px/s -> rad/s gain
    dragGain: ecs.f32,          // extra multiplier for drag

    minFlickAngularVel: ecs.f32,  // radians/sec floor for flick spin
    // NEW: how many frames back to sample for flick vector
    historyLookbackFrames: ecs.ui8,
  },
  schemaDefaults: {
    radiansPerPixel: 0.006,
    flickThresholdPxPerSec: 900.0,
    flickImpulseGain: 0.05,
    dragGain: 1.0,
    minFlickAngularVel: 0.8,  // tune to taste (0.5–1.5 common)
    historyLookbackFrames: 3,

  },
  data: {
    rotationVelocity: ecs.f32,
    axisX: ecs.f32,
    axisY: ecs.f32,
    axisZ: ecs.f32,

    // drag state
    dragging: ecs.ui8,
    startX: ecs.f32,
    startY: ecs.f32,
    lastX: ecs.f32,
    lastY: ecs.f32,
    startT: ecs.f32,
    lastT: ecs.f32,

    // orientation captured at drag start
    baseQx: ecs.f32,
    baseQy: ecs.f32,
    baseQz: ecs.f32,
    baseQw: ecs.f32,
  },

  add: (world, component) => {
    const {eid, dataAttribute, schema} = component
    const d = dataAttribute.cursor(eid)
    d.rotationVelocity = 0
    d.axisX = 0; d.axisY = 0; d.axisZ = 1
    d.dragging = 0
    d.startX = 0; d.startY = 0
    d.lastX = 0; d.lastY = 0
    d.startT = 0; d.lastT = 0
    d.baseQx = 0; d.baseQy = 0; d.baseQz = 0; d.baseQw = 1
    dataAttribute.commit(eid)

    const radiansPerPixel = Number((schema as any).radiansPerPixel ?? 0.006)
    const flickThreshold = Number((schema as any).flickThresholdPxPerSec ?? 900.0)
    const flickGain = Number((schema as any).flickImpulseGain ?? 0.0025)
    const dragGain = Number((schema as any).dragGain ?? 1.0)
    const lookback = Math.max(1, Number((schema as any).historyLookbackFrames ?? 3))
    const maxHistory = Math.max(lookback + 2, 8)  // small ring buffer

    // Per-entity motion history: [{x,y,t}, ...] (closure storage)
    const history: Map<any, Array<{x:number, y:number, t:number}>> = (ecs as any).__rotHist || new Map()
    ;(ecs as any).__rotHist = history
    history.set(eid, [])

    const resolveTarget = (): any => {
      for (const childEid of world.getChildren(eid)) {
        if (ObjectLabel.has(world, childEid)) return childEid
      }
      return eid
    }

    const camQuatOrIdentity = () => {
      const camEid = (schema as any).cameraEid
      if (camEid && ecs.Quaternion.has(world, camEid)) {
        return ecs.math.quat.from(ecs.Quaternion.get(world, camEid))
      }
      return ecs.math.quat.xyzw(0, 0, 0, 1)
    }

    // === DRAG: start / move (absolute) / end ==================================

    const onDragStart = (event: any) => {
      const {targetEid, x, y} = event.data || {}
      const target = resolveTarget()
      if (targetEid != null && targetEid !== eid && targetEid !== target) return

      const s = dataAttribute.cursor(eid)
      s.dragging = 1
      s.startX = x; s.startY = y
      s.lastX = x; s.lastY = y
      const now = performance.now() / 1000
      s.startT = now; s.lastT = now

      const base = ecs.Quaternion.get(world, target)
      s.baseQx = base.x; s.baseQy = base.y; s.baseQz = base.z; s.baseQw = base.w

      s.rotationVelocity = 0  // stop any inertial spin while dragging
      dataAttribute.commit(eid)

      // seed history
      const H = history.get(eid)!
      H.length = 0
      H.push({x, y, t: now})
    }

    const onDrag = (event: any) => {
      const target = resolveTarget()
      const {targetEid} = event.data || {}
      if (targetEid != null && targetEid !== eid && targetEid !== target) return

      const s = dataAttribute.cursor(eid)
      if (!s.dragging) return

      // Prefer absolute x,y from the event; if not present, integrate deltas.
      let x = event.data?.x
      let y = event.data?.y
      if (x == null || y == null) {
        x = s.lastX + Number(event.data?.deltaX || 0)
        y = s.lastY + Number(event.data?.deltaY || 0)
      }

      // Vector from drag-start to current (path-independent orientation)
      const dx = (x - s.startX)
      const dy = (y - s.startY)
      const pix = Math.hypot(dx, dy)

      // Axis in WORLD space from camera Up/Right projection of the (dx,dy) vector
      if (pix > 1e-6) {
        const camQ = camQuatOrIdentity()
        const camRight = camQ.timesVec(ecs.math.vec3.xyz(1, 0, 0))
        const camUp = camQ.timesVec(ecs.math.vec3.xyz(0, 1, 0))

        // world-axis = dx * Up + dy * Right
        let ax = camUp.x * dx + camRight.x * dy
        let ay = camUp.y * dx + camRight.y * dy
        let az = camUp.z * dx + camRight.z * dy
        const len = Math.hypot(ax, ay, az) || 1
        ax /= len; ay /= len; az /= len

        // Angle from *total* start→current distance (path-independent)
        const angle = pix * radiansPerPixel * dragGain
        const half = angle * 0.5
        const sQ = Math.sin(half); const
          cQ = Math.cos(half)
        const dq = ecs.math.quat.xyzw(ax * sQ, ay * sQ, az * sQ, cQ)

        // new = dq * base
        const baseQ = ecs.math.quat.xyzw(s.baseQx, s.baseQy, s.baseQz, s.baseQw)
        const next = ecs.math.quat.from(dq).times(baseQ)
        ecs.Quaternion.set(world, target, next)
      }

      // update state + history
      const now = performance.now() / 1000
      s.lastX = x; s.lastY = y; s.lastT = now
      dataAttribute.commit(eid)

      const H = history.get(eid)!
      H.push({x, y, t: now})
      if (H.length > maxHistory) H.shift()
    }

    const onDragEnd = (event: any) => {
      const target = resolveTarget()
      const {targetEid} = event.data || {}
      if (targetEid != null && targetEid !== eid && targetEid !== target) return

      const s = dataAttribute.cursor(eid)
      s.dragging = 0

      // Compute flick using history: vector from N frames ago to last
      const H = history.get(eid) || []
      let vx = Number(event.data?.vx); let vy = Number(event.data?.vy); let
        speed = Number(event.data?.speed)

      if (!isFinite(speed)) {
        const n = H.length
        if (n >= 2) {
          const aIdx = Math.max(0, n - 1 - lookback)
          const A = H[aIdx]
          const B = H[n - 1]
          const dt = Math.max(1e-3, B.t - A.t)
          const dx = B.x - A.x
          const dy = B.y - A.y
          vx = dx / dt
          vy = dy / dt
          speed = Math.hypot(vx, vy)
        } else {
          // fallback to start→last
          const dt = Math.max(1e-3, (performance.now() / 1000) - (s.startT || 0))
          const dx = (s.lastX - s.startX)
          const dy = (s.lastY - s.startY)
          vx = dx / dt; vy = dy / dt
          speed = Math.hypot(vx, vy)
        }
      }

      if (!isFinite(speed) || speed < flickThreshold) {
        s.rotationVelocity = 0
        dataAttribute.commit(eid)
        return
      }

      // Flick impulse axis from camera Up/Right using release velocity
      const camQ = camQuatOrIdentity()
      const camRight = camQ.timesVec(ecs.math.vec3.xyz(1, 0, 0))
      const camUp = camQ.timesVec(ecs.math.vec3.xyz(0, 1, 0))
      const ax = camUp.x * vx + camRight.x * vy
      const ay = camUp.y * vx + camRight.y * vy
      const az = camUp.z * vx + camRight.z * vy
      const len = Math.hypot(ax, ay, az) || 1
      s.axisX = ax / len; s.axisY = ay / len; s.axisZ = az / len

      let angularVelocity = speed * flickGain
      const minSpin = Number((schema as any).minFlickAngularVel ?? 0)
      // Floor weak-but-valid flicks to a visible spin
      if (angularVelocity < minSpin) angularVelocity = minSpin

      s.rotationVelocity = angularVelocity
      dataAttribute.commit(eid)

      // clear history after release (optional)
      history.set(eid, [])
    }

    // === Legacy swipe impulse (optional) =======================================
    const onSwipeImpulse = (event: any) => {
      const {deltaX, deltaY} = event.data || {}
      const camQ = camQuatOrIdentity()
      const camRight = camQ.timesVec(ecs.math.vec3.xyz(1, 0, 0))
      const camUp = camQ.timesVec(ecs.math.vec3.xyz(0, 1, 0))
      const ax = camUp.x * deltaX + camRight.x * deltaY
      const ay = camUp.y * deltaX + camRight.y * deltaY
      const az = camUp.z * deltaX + camRight.z * deltaY
      const len = Math.hypot(ax, ay, az) || 1
      const cur = dataAttribute.cursor(eid)
      cur.axisX = ax / len; cur.axisY = ay / len; cur.axisZ = az / len
      const speedLike = Math.hypot(deltaX, deltaY) * 60
      cur.rotationVelocity = speedLike * flickGain
      dataAttribute.commit(eid)
    }

    // Listeners
    world.events.addListener(world.events.globalId, 'on-drag-start', onDragStart)
    world.events.addListener(world.events.globalId, 'on-drag', onDrag)
    world.events.addListener(world.events.globalId, 'on-drag-end', onDragEnd)
    world.events.addListener(eid, 'on-input-delta', onSwipeImpulse)
  },

  tick: (world, component) => {
    const {eid} = component
    const dt = world.time.delta * 0.001
    const s = component.data
    const vel = s.rotationVelocity
    if (vel <= 0) return

    // pick labeled child if present
    let targetEid = eid
    for (const childEid of world.getChildren(eid)) {
      if (ObjectLabel.has(world, childEid)) {
        targetEid = childEid; break
      }
    }

    // world-space delta quaternion around stored axis
    const axis = ecs.math.vec3.xyz(s.axisX || 0, s.axisY || 0, s.axisZ || 0)
    axis.normalize()
    const angle = vel * dt
    const half = angle * 0.5
    const sinH = Math.sin(half); const
      cosH = Math.cos(half)
    const dq = ecs.math.quat.xyzw(axis.x * sinH, axis.y * sinH, axis.z * sinH, cosH)

    const cur = ecs.Quaternion.get(world, targetEid)
    const next = ecs.math.quat.from(dq).times(cur)
    ecs.Quaternion.set(world, targetEid, next)

    // ease-out
    const decayRate = 1.5
    s.rotationVelocity = Math.max(0, vel - decayRate * dt)
  },

  remove: (world, component) => {
    // cleanup history store
    const map: Map<any, any> | undefined = (ecs as any).__rotHist
    if (map) map.delete(component.eid)
  },
})
