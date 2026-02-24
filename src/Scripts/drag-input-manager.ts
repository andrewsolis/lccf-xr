// drag-input-manager.ts
import * as ecs from '@8thwall/ecs'
import {ObjectLabel} from './object-label'

ecs.registerComponent({
  name: 'drag-input-manager',
  schema: {
    targetEid: ecs.eid,
    deadzonePx: ecs.ui32,
    velocityWindowMs: ecs.ui32,
    maxSpeedPxPerSec: ecs.ui32,

    // NEW: label name that should block drags when touched
    blockDragLabel: ecs.string,
  },
  schemaDefaults: {
    deadzonePx: 0,
    velocityWindowMs: 100,
    maxSpeedPxPerSec: 8000,
    blockDragLabel: 'audio',
  },
  data: {},
  add: (world, component) => {
    const {eid, schema} = component
    const target = (schema as any).targetEid || eid
    const DZ = Number((schema as any).deadzonePx ?? 0)
    const VW = Number((schema as any).velocityWindowMs ?? 100)
    const MAXS = Number((schema as any).maxSpeedPxPerSec ?? 8000)
    const blockLabel = String((schema as any).blockDragLabel ?? 'audio')

    let active = false
    let startX = 0
    let startY = 0
    let lastX = 0
    let lastY = 0

    const recent: Array<{t: number, x: number, y: number}> = []
    const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

    // ---- label lookup (find descendant with object-label.name === blockLabel) ----
    const getLabelName = (labelEid: any): string => {
      try {
        const c = ObjectLabel.get(world, labelEid) as any
        return String(c?.name ?? '')
      } catch {
        return ''
      }
    }

    const findDescendantWithLabel = (rootEid: any, labelName: string): any => {
      const queue: any[] = [rootEid]
      const visited: any[] = []
      const seen = (x: any) => visited.indexOf(x) !== -1
      const mark = (x: any) => visited.push(x)

      while (queue.length > 0) {
        const cur = queue.shift()
        if (seen(cur)) {
          // no-op
        } else {
          mark(cur)
          if (ObjectLabel.has(world, cur)) {
            if (getLabelName(cur) === labelName) return cur
          }
          const kids = (world.getChildren(cur) || []) as any[]
          for (const k of kids) queue.push(k)
        }
      }
      return null
    }

    const isSameOrDescendant = (maybeChild: any, ancestor: any): boolean => {
      if (!ancestor) return false
      if (!maybeChild) return false
      if (maybeChild === ancestor) return true
      let cur = maybeChild
      for (let i = 0; i < 128; i++) {
        const p = world.getParent(cur) as any
        if (!p) break
        if (p === ancestor) return true
        cur = p
      }
      return false
    }

    const shouldBlockDragForEvent = (ev: any): boolean => {
      // Look for 'target' (from your logs) or 'targetEid' (standard)
      const hit = ev?.data?.target ?? ev?.data?.targetEid

      if (hit === undefined || hit === null) return false

      let currentCheck: any = hit
      let safety = 0

      while (currentCheck && safety < 10) {
        safety++
        // Check if this EID has the label component
        if (ObjectLabel.has(world, currentCheck)) {
          const label = (ObjectLabel.get(world, currentCheck) as any)?.name
          if (String(label) === blockLabel) {
            console.log(`[InputManager] Drag BLOCKED: Hit label "${blockLabel}"`)
            return true
          }
        }

        try {
          currentCheck = world.getParent(currentCheck)
        } catch {
          break
        }
      }
      return false
    }

    const setDragState = (isActive: boolean) => {
      world.events.dispatch(target, 'drag-state', {active: isActive})
    }

    const onTouchStart = (event: any) => {
      // 1. Run the block check first
      const isBlocked = shouldBlockDragForEvent(event)

      if (isBlocked) {
        // If THIS instance detected a block, set state and exit
        setDragState(false)
        return
      }

      // 2. Position Safety: Extract data and check if it exists
      const pos = event?.data?.position

      // If there is no position (common in some 8th Wall events),
      // just exit quietly instead of throwing an error.
      if (!pos || pos.x === undefined || pos.y === undefined) {
        return
      }

      // 3. Now it is safe to define x and y
      const {x} = pos
      const {y} = pos

      active = true
      startX = x
      startY = y
      lastX = x
      lastY = y

      recent.length = 0
      recent.push({t: nowMs(), x, y})

      setDragState(true)

      // Only log "ACTIVE" if we actually pass all checks
      console.log(`[InputManager] Drag STARTED on target: ${target}`)

      world.events.dispatch(world.events.globalId, 'on-drag-start', {
        targetEid: target,
        x,
        y,
      })
    }

    const onTouchMove = (event: any) => {
      if (!active) return
      const pos = event.data.position
      if (!pos || pos.x === undefined) return  // Added guard
      const x = pos?.x
      const y = pos?.y
      if (x == null || y == null) return

      const dx = x - lastX
      const dy = y - lastY
      lastX = x
      lastY = y

      if (Math.abs(x - startX) < DZ && Math.abs(y - startY) < DZ) {
        recent.push({t: nowMs(), x, y})
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
      if (!active) {
        // still ensure we clear drag-state for taps
        setDragState(false)
        return
      }
      active = false
      setDragState(false)

      const pos = event.data.position
      if (!pos || pos.x === undefined) {  // Added guard
        active = false
        setDragState(false)
        return
      }
      const endX = pos?.x
      const endY = pos?.y
      if (endX == null || endY == null) return

      const tEnd = nowMs()
      recent.push({t: tEnd, x: endX, y: endY})

      const tStart = tEnd - VW
      let oldest = recent[0]
      for (let i = recent.length - 1; i >= 0; --i) {
        if (recent[i].t <= tStart) {
          oldest = recent[i]
          break
        }
        oldest = recent[0]
      }

      const dt = (tEnd - oldest.t) / 1000
      let vx = 0
      let vy = 0
      let speed = 0
      if (dt > 0) {
        vx = (endX - oldest.x) / dt
        vy = (endY - oldest.y) / dt
        speed = Math.hypot(vx, vy)
        if (speed > MAXS) {
          const k = MAXS / speed
          vx *= k
          vy *= k
          speed = MAXS
        }
      }

      world.events.dispatch(world.events.globalId, 'on-drag-end', {
        targetEid: target,
        x: endX,
        y: endY,
        vx,
        vy,
        speed,
      })

      recent.length = 0
    }

    world.events.addListener(world.events.globalId, ecs.input.SCREEN_TOUCH_START, onTouchStart)
    world.events.addListener(world.events.globalId, ecs.input.SCREEN_TOUCH_MOVE, onTouchMove)
    world.events.addListener(world.events.globalId, ecs.input.SCREEN_TOUCH_END, onTouchEnd)
  },
  tick: () => {},
  remove: () => {},
})
