// myLabel.ts
import * as ecs from '@8thwall/ecs'

export const ObjectLabel = ecs.registerComponent({
  name: 'object-label',
  schema: {
    name: ecs.string,
  },
})
