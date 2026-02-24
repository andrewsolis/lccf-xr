// audio-trigger.ts
import * as ecs from '@8thwall/ecs'
import {ObjectLabel} from './object-label'

type AnyEvent = any

ecs.registerComponent({
  name: 'audio-trigger',
  schema: {
    audioLabel: ecs.string,
    triggerEventName: ecs.string,
  },
  schemaDefaults: {
    audioLabel: 'audio',
    triggerEventName: 'play-audio-trigger',
  },
  data: {
    dragActive: ecs.ui8,
    touchStartedOnAudio: ecs.ui8,
  },
  add: (world, component) => {
    const {eid, dataAttribute, schema} = component

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

    // This finds the button whenever we actually need it
    const getAudioButtonEid = () => findDescendantWithLabel(eid, String((schema as any).audioLabel ?? 'audio'))

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

    // Listen to drag-state from drag-input-manager
    const onDragState = (ev: AnyEvent) => {
      const d = dataAttribute.cursor(eid)
      d.dragActive = ev?.data?.active ? 1 : 0
      dataAttribute.commit(eid)
    }
    world.events.addListener(eid, 'drag-state', onDragState)

    const onTouchStart = (ev: AnyEvent) => {
      const d = dataAttribute.cursor(eid)
      d.touchStartedOnAudio = 0

      // 1. Get the actual thing touched (using 'target' from your logs)
      const hitEid = ev?.data?.target ?? ev?.data?.targetEid
      if (!hitEid) {
        dataAttribute.commit(eid)
        return
      }

      // 2. Find our specific audio button child
      const buttonEid = getAudioButtonEid()
      if (!buttonEid) {
        dataAttribute.commit(eid)
        return
      }

      if (hitEid && hitEid !== buttonEid) {
        console.log(`[audio-trigger] Missed button. Hit EID: ${hitEid} instead.`)
      }

      // 3. Check if the thing hit is the button or inside it
      if (isSameOrDescendant(hitEid, buttonEid) || hitEid == eid) {
        console.log(`[audio-trigger] Touch started on Audio Button: ${buttonEid}`)
        d.touchStartedOnAudio = 1
      }

      dataAttribute.commit(eid)
    }

    const onTouchEnd = (ev: AnyEvent) => {
      const d = dataAttribute.cursor(eid)
      const buttonEid = getAudioButtonEid()

      if (!buttonEid || !d.touchStartedOnAudio) return

      // If the input manager says we are currently dragging/rotating, don't play
      if (d.dragActive) {
        console.log('[audio-trigger] Play canceled: user is rotating model.')
        return
      }

      const eventName = String((schema as any).triggerEventName ?? 'play-audio-trigger')
      console.log(`[audio-trigger] DISPATCHING: ${eventName} to EID: ${buttonEid}`)

      world.events.dispatch(buttonEid, eventName, {
        sourceEid: eid,
      })
    }

    world.events.addListener(world.events.globalId, ecs.input.SCREEN_TOUCH_START, onTouchStart)
    world.events.addListener(world.events.globalId, ecs.input.SCREEN_TOUCH_END, onTouchEnd)

    ;(component as any).__audioTrigger_onTouchStart = onTouchStart
    ;(component as any).__audioTrigger_onTouchEnd = onTouchEnd
    ;(component as any).__audioTrigger_onDragState = onDragState
  },
  tick: () => {},
  remove: (world, component) => {
    const onTouchStart = (component as any).__audioTrigger_onTouchStart
    const onTouchEnd = (component as any).__audioTrigger_onTouchEnd
    const onDragState = (component as any).__audioTrigger_onDragState
    if (onTouchStart) world.events.removeListener(world.events.globalId, ecs.input.SCREEN_TOUCH_START, onTouchStart)
    if (onTouchEnd) world.events.removeListener(world.events.globalId, ecs.input.SCREEN_TOUCH_END, onTouchEnd)
    if (onDragState) world.events.removeListener(component.eid, 'drag-state', onDragState)
  },
})
