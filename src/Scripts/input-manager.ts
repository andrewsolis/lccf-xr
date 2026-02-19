import * as ecs from '@8thwall/ecs'

ecs.registerComponent({
  name: 'input-manager',
  schema: {},
  schemaDefaults: {},
  data: {
    lastX: ecs.f32,
    lastY: ecs.f32,
  },
  add: (world, component) => {
    const {eid, data} = component

    const onTouchStart = (event) => {
      // record the start point
      const {start} = event.data
      data.lastX = start.x
      data.lastY = start.y
    }

    const onTouchMove = (event) => {
      // optional real-time tracking
    }

    const onTouchEnd = (event) => {
      const {position: endPosition, start: startPosition} = event.data
      const deltaX = endPosition.x - startPosition.x
      const deltaY = endPosition.y - startPosition.y

      // broadcast raw deltas instead of actionName
      world.events.dispatch(eid, 'on-input-delta', {deltaX, deltaY})
    }

    world.events.addListener(world.events.globalId, ecs.input.SCREEN_TOUCH_START, onTouchStart)
    world.events.addListener(world.events.globalId, ecs.input.SCREEN_TOUCH_MOVE, onTouchMove)
    world.events.addListener(world.events.globalId, ecs.input.SCREEN_TOUCH_END, onTouchEnd)
  },
  tick: (world, component) => {
    // no longer needed to poll directional actions here
  },
  remove: (world, component) => {
    // cleanup if necessary
  },
})
