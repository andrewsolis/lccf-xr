import * as ecs from '@8thwall/ecs'
import {ObjectLabel} from './object-label'

ecs.registerComponent({
  name: 'unified-input-controller',
  schema: {
    targetEid: ecs.eid,
    blockDragLabel: ecs.string,
    modelLabel: ecs.string,
    audioEventName: ecs.string,
  },
  schemaDefaults: {
    blockDragLabel: 'audio',
    modelLabel: 'model',
    audioEventName: 'play-audio-trigger',
  },
  add: (world, component) => {
    const {eid, schema} = component
    const target = (schema as any).targetEid || eid
    const blockLabel = String((schema as any).blockDragLabel ?? 'audio')
    const modelLabel = String((schema as any).modelLabel ?? 'model')
    const audioEvent = String((schema as any).audioEventName ?? 'play-audio-trigger')

    let isDragging = false
    let lastHitAudioEid: any = null
    let lastX = 0; let lastY = 0

    const isDescendant = (child: any, parent: any): boolean => {
      let current = child
      while (current) {
        if (current === parent) return true
        current = world.getParent(current)
      }
      return false
    }

    const onTouchStart = (ev: any) => {
      // 1. ISOLATION: Only process if the hit object is inside THIS target's tree
      const hitEid = ev?.data?.target ?? ev?.data?.targetEid
      if (!hitEid || !isDescendant(hitEid, target)) return

      const pos = ev?.data?.position
      if (!pos) return

      let current = hitEid
      let foundType: 'audio' | 'model' | null = null

      while (current) {
        if (ObjectLabel.has(world, current)) {
          const labelName = (ObjectLabel.get(world, current) as any).name
          if (labelName === blockLabel) {
            foundType = 'audio'
            lastHitAudioEid = current
            break
          }
          if (labelName === modelLabel) foundType = 'model'
        }
        if (current === target) break
        current = world.getParent(current)
      }

      if (foundType === 'audio') {
        isDragging = false
        world.events.dispatch(target, 'drag-state', {active: false})
      } else if (foundType === 'model') {
        isDragging = true
        lastX = pos.x; lastY = pos.y
        world.events.dispatch(target, 'drag-state', {active: true})
        world.events.dispatch(world.events.globalId, 'on-drag-start', {
          targetEid: target, x: pos.x, y: pos.y,
        })
      }
    }

    const onTouchMove = (ev: any) => {
      if (!isDragging) return
      const pos = ev?.data?.position
      if (!pos) return

      const dx = pos.x - lastX
      const dy = pos.y - lastY
      lastX = pos.x; lastY = pos.y

      world.events.dispatch(world.events.globalId, 'on-drag', {
        targetEid: target, deltaX: dx, deltaY: dy, x: pos.x, y: pos.y,
      })
    }

    const onTouchEnd = (ev: any) => {
      if (lastHitAudioEid && !isDragging) {
        const endHitEid = ev?.data?.target ?? ev?.data?.targetEid
        // Double check hit hasn't moved to a different target tree during release
        if (endHitEid && isDescendant(endHitEid, lastHitAudioEid)) {
          world.events.dispatch(lastHitAudioEid, audioEvent, {sourceEid: eid})
        }
      }

      if (isDragging) {
        world.events.dispatch(world.events.globalId, 'on-drag-end', {
          targetEid: target,
          x: ev?.data?.position?.x ?? lastX,
          y: ev?.data?.position?.y ?? lastY,
          vx: ev?.data?.vx || 0,
          vy: ev?.data?.vy || 0,
          speed: ev?.data?.speed || 0,
        })
        world.events.dispatch(target, 'drag-state', {active: false})
      }

      isDragging = false
      lastHitAudioEid = null
    }

    // Assign to a variable so we can remove them later
    const handlers = {onTouchStart, onTouchMove, onTouchEnd}
    ;(component as any)._handlers = handlers

    world.events.addListener(world.events.globalId, ecs.input.SCREEN_TOUCH_START, onTouchStart)
    world.events.addListener(world.events.globalId, ecs.input.SCREEN_TOUCH_MOVE, onTouchMove)
    world.events.addListener(world.events.globalId, ecs.input.SCREEN_TOUCH_END, onTouchEnd)
  },

  // --- THE CRITICAL FIX: REMOVE LISTENERS ON UNMOUNT ---
  remove: (world, component) => {
    const handlers = (component as any)._handlers
    if (handlers) {
      world.events.removeListener(world.events.globalId, ecs.input.SCREEN_TOUCH_START, handlers.onTouchStart)
      world.events.removeListener(world.events.globalId, ecs.input.SCREEN_TOUCH_MOVE, handlers.onTouchMove)
      world.events.removeListener(world.events.globalId, ecs.input.SCREEN_TOUCH_END, handlers.onTouchEnd)
    }
  },
})
