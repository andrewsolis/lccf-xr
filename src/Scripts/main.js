import * as ecs from '@8thwall/ecs'
import './play-audio'
// import 'model-controls'

ecs.registerComponent({
  name: 'model-controls',
  data: {
    isDragging: ecs.bool,
    lastX: ecs.f32,
    lastDist: ecs.f32,
  },
  stateMachine: ({world, eid, dataAttribute}) => {
    ecs.defineState('on')
      .onEnter(() => {
        const data = dataAttribute.cursor(eid)
        data.isDragging = false
        data.lastX = 0
        data.lastDist = 0
      })

      // --- Single finger drag for rotation ---
      .listen(eid, ecs.input.DRAG_START, (e) => {
        if (e.touches.length === 1) {
          const data = dataAttribute.cursor(eid)
          data.isDragging = true
          data.lastX = e.touches[0].x
        }
      })
      .listen(eid, ecs.input.DRAG, (e) => {
        if (e.touches.length === 1) {
          const data = dataAttribute.cursor(eid)
          if (!data.isDragging) return
          const dx = e.touches[0].x - data.lastX
          ecs.Transform.mutate(world, eid, (t) => {
            t.rotation.y += dx * 0.01  // adjust sensitivity
          })
          data.lastX = e.touches[0].x
        }
      })
      .listen(eid, ecs.input.DRAG_END, (e) => {
        const data = dataAttribute.cursor(eid)
        data.isDragging = false
      })

      // --- Two finger pinch for scale ---
      .listen(eid, ecs.input.PINCH_START, (e) => {
        const data = dataAttribute.cursor(eid)
        data.lastDist = e.distance
      })
      .listen(eid, ecs.input.PINCH, (e) => {
        const data = dataAttribute.cursor(eid)
        const scaleChange = e.distance / data.lastDist
        ecs.Transform.mutate(world, eid, (t) => {
          t.scale.x *= scaleChange
          t.scale.y *= scaleChange
          t.scale.z *= scaleChange
        })
        data.lastDist = e.distance
      })
      .initial()
  },
})
