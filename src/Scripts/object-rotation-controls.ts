import * as ecs from '@8thwall/ecs'
import {ObjectLabel} from './object-label'

ecs.registerComponent({
  name: 'object-rotation-controls',
  schema: {
    cameraEid: ecs.eid,
    radiansPerPixel: ecs.f32,
    flickThresholdPxPerSec: ecs.f32,
    flickImpulseGain: ecs.f32,
    dragGain: ecs.f32,
    minFlickAngularVel: ecs.f32,
    historyLookbackFrames: ecs.ui8,
    decayRate: ecs.f32,  // Added to schema for easier tuning
  },
  schemaDefaults: {
    radiansPerPixel: 1,
    flickThresholdPxPerSec: 900.0,
    flickImpulseGain: 0.08,
    dragGain: 5.0,
    minFlickAngularVel: 0.8,
    historyLookbackFrames: 3,
    decayRate: 1.5,
  },
  data: {
    rotationVelocity: ecs.f32,
    axisX: ecs.f32,
    axisY: ecs.f32,
    axisZ: ecs.f32,
    dragging: ecs.ui8,
    startX: ecs.f32,
    startY: ecs.f32,
    lastX: ecs.f32,
    lastY: ecs.f32,
    startT: ecs.f32,
    lastT: ecs.f32,
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
    dataAttribute.commit(eid)

    const radiansPerPixel = Number((schema as any).radiansPerPixel)
    const flickThreshold = Number((schema as any).flickThresholdPxPerSec)
    const flickGain = Number((schema as any).flickImpulseGain)
    const dragGain = Number((schema as any).dragGain)
    const lookback = Math.max(1, Number((schema as any).historyLookbackFrames))

    // Internal history for velocity calculation
    const history: Map<any, Array<{x:number, y:number, t:number}>> = (ecs as any).__rotHist || new Map()
    ;(ecs as any).__rotHist = history
    history.set(eid, [])

    const resolveTarget = (): any => {
      // Find the specific child with the 'model' label to rotate
      for (const childEid of world.getChildren(eid)) {
        if (ObjectLabel.has(world, childEid)) {
          const label = (ObjectLabel.get(world, childEid) as any).name
          if (label === 'model') return childEid
        }
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

    const onDragStart = (event: any) => {
      const target = resolveTarget()
      const {targetEid, x, y} = event.data || {}
      if (targetEid != null && targetEid !== eid && targetEid !== target) return

      const s = dataAttribute.cursor(eid)
      s.dragging = 1
      s.rotationVelocity = 0  // Kill existing spin on touch
      s.startX = x; s.startY = y
      s.lastX = x; s.lastY = y
      const now = performance.now() / 1000
      s.startT = now; s.lastT = now

      const base = ecs.Quaternion.get(world, target)
      s.baseQx = base.x; s.baseQy = base.y; s.baseQz = base.z; s.baseQw = base.w
      dataAttribute.commit(eid)

      const H = history.get(eid)!
      H.length = 0
      H.push({x, y, t: now})
    }

    const onDrag = (event: any) => {
      const target = resolveTarget()
      const s = dataAttribute.cursor(eid)
      if (!s.dragging) return

      const x = event.data?.x ?? (s.lastX + Number(event.data?.deltaX || 0))
      const y = event.data?.y ?? (s.lastY + Number(event.data?.deltaY || 0))

      const dx = (x - s.startX)
      const dy = (y - s.startY)
      const pix = Math.hypot(dx, dy)

      if (pix > 1e-6) {
        const camQ = camQuatOrIdentity()
        const camRight = camQ.timesVec(ecs.math.vec3.xyz(1, 0, 0))
        const camUp = camQ.timesVec(ecs.math.vec3.xyz(0, 1, 0))

        // Rotation axis is perpendicular to drag direction
        const ax = camUp.x * dx + camRight.x * dy
        const ay = camUp.y * dx + camRight.y * dy
        const az = camUp.z * dx + camRight.z * dy
        const len = Math.hypot(ax, ay, az) || 1

        const angle = pix * radiansPerPixel * dragGain
        const half = angle * 0.5
        const sQ = Math.sin(half); const cQ = Math.cos(half)
        const dq = ecs.math.quat.xyzw((ax / len) * sQ, (ay / len) * sQ, (az / len) * sQ, cQ)

        const baseQ = ecs.math.quat.xyzw(s.baseQx, s.baseQy, s.baseQz, s.baseQw)
        ecs.Quaternion.set(world, target, ecs.math.quat.from(dq).times(baseQ))
      }

      const now = performance.now() / 1000
      s.lastX = x; s.lastY = y; s.lastT = now
      dataAttribute.commit(eid)

      const H = history.get(eid)!
      H.push({x, y, t: now})
      if (H.length > 10) H.shift()
    }

    const onDragEnd = (event: any) => {
      const s = dataAttribute.cursor(eid)
      if (!s.dragging) return
      s.dragging = 0

      const H = history.get(eid) || []
      let vx = Number(event.data?.vx || 0)
      let vy = Number(event.data?.vy || 0)
      let speed = Number(event.data?.speed || 0)

      // Fallback velocity calculation if the event doesn't provide it
      if (speed <= 0 && H.length >= 2) {
        const A = H[Math.max(0, H.length - 1 - lookback)]
        const B = H[H.length - 1]
        const dt = Math.max(0.001, B.t - A.t)
        vx = (B.x - A.x) / dt
        vy = (B.y - A.y) / dt
        speed = Math.hypot(vx, vy)
      }

      if (speed > flickThreshold) {
        const camQ = camQuatOrIdentity()
        const camRight = camQ.timesVec(ecs.math.vec3.xyz(1, 0, 0))
        const camUp = camQ.timesVec(ecs.math.vec3.xyz(0, 1, 0))

        const ax = camUp.x * vx + camRight.x * vy
        const ay = camUp.y * vx + camRight.y * vy
        const az = camUp.z * vx + camRight.z * vy
        const len = Math.hypot(ax, ay, az) || 1

        s.axisX = ax / len; s.axisY = ay / len; s.axisZ = az / len
        s.rotationVelocity = Math.max(speed * flickGain, Number((schema as any).minFlickAngularVel))
      } else {
        s.rotationVelocity = 0
      }
      dataAttribute.commit(eid)
    }

    world.events.addListener(world.events.globalId, 'on-drag-start', onDragStart)
    world.events.addListener(world.events.globalId, 'on-drag', onDrag)
    world.events.addListener(world.events.globalId, 'on-drag-end', onDragEnd)
  },

  tick: (world, component) => {
    const s = component.data as any
    if (s.dragging || s.rotationVelocity <= 0) return

    const dt = world.time.delta * 0.001

    // Find model target
    let targetEid = component.eid
    for (const childEid of world.getChildren(component.eid)) {
      if (ObjectLabel.has(world, childEid)) {
        if ((ObjectLabel.get(world, childEid) as any).name === 'model') {
          targetEid = childEid
          break
        }
      }
    }

    // Apply Rotation
    const axis = ecs.math.vec3.xyz(s.axisX, s.axisY, s.axisZ)
    const angle = s.rotationVelocity * dt
    const half = angle * 0.5
    const sinH = Math.sin(half); const cosH = Math.cos(half)
    const dq = ecs.math.quat.xyzw(axis.x * sinH, axis.y * sinH, axis.z * sinH, cosH)

    const curQ = ecs.Quaternion.get(world, targetEid)
    const nextQ = ecs.math.quat.from(dq).times(curQ)
    ecs.Quaternion.set(world, targetEid, nextQ)

    // Apply Decay
    const decay = Number((component.schema as any).decayRate ?? 1.5)
    s.rotationVelocity *= Math.pow(0.1, dt * decay)  // Smoother exponential decay
    if (s.rotationVelocity < 0.01) s.rotationVelocity = 0
  },

  remove: (world, component) => {
    const map: Map<any, any> | undefined = (ecs as any).__rotHist
    if (map) map.delete(component.eid)
  },
})
