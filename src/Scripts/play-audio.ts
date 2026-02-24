// play-audio.ts
import * as ecs from '@8thwall/ecs'

// Audio descriptions for technical / analogy components
const CONTENT: any = {
  heatsink: {
    audioBase: 'heatsink',
    technical: [
      'This is the heat sink.',
      'It plays a vital role in regulating temperature inside the supercomputer.',
      'As these machines power through massive amounts of data, they generate intense heat.',
      'The heat sink absorbs that excess energy, helping the system maintain a stable temperature safe environment so everything runs smoothly.',
      'Just like the heat sink keeps a supercomputer from overheating, TACC SuperCity relies on air conditioning to do the same.',
      'From keeping us comfortable in city buildings to keeping components running smoothly, cooling systems help maintain comfortable airflow and prevent overheating--whether it\'s circuits or city blocks.',
    ],
    analogy: [
      'In TACC SuperCity, air conditioning systems regulate temperature by removing excess heat and keeping buildings safe and comfortable.',
      'In the same way, a supercomputer uses a heat sink to absorb heat and prevent components from overheating.',
      'When temperature is controlled, both the city and the computer can run smoothly and efficiently.',
    ],
  },

  grace_hopper: {
    audioBase: 'grace-hopper',
    technical: [
      'This is the Grace Hopper Superchip — the brainpower behind the supercomputer.',
      'It combines two powerful processors on a single chip: the Grace CPU and the NVIDIA H200 GPU.',
      'Think of them as the leadership team of TACC SuperCity. The CPU is like the mayor, overseeing and coordinating everything. Whereas, the GPU is the architect, a specialized expert in the office who handles complex designs and performs high-speed calculations — much like how GPUs accelerate AI and machine learning tasks.',
      'Together, they keep the city running efficiently, processing information and solving problems at incredible speeds.',
      'The Grace Hopper Superchip can perform trillions of calculations every second, making it one of the most advanced computing engines in the world.',
      'Just as a city\'s leaders balance planning and creativity to make progress possible, the CPU and GPU work in perfect harmony — powering discovery at the heart of TACC SuperCity.',
    ],
    analogy: [
      'In TACC SuperCity, the mayor oversees operations by making decisions, while the architect works on city planning.',
      'However, in our case the mayor and architect share an office and work closely together, both able to hear and see what the other is doing and chime in immediately or do their own thing.',
      'In the same way, a supercomputer relies on the Superchip that allows the GPU and CPU to work closely together to direct tasks, process instructions, and keep all components working together.',
      'When leadership is efficient, both the city and the computer run smoothly.',
    ],
  },

  m2: {
    audioBase: 'm2-storage',
    technical: [
      'This is the M.2 local storage- a slim, high-speed component that stores essential data right within the system.',
      'It\'s designed for fast data retrieval, much like how an SSD works faster than a traditional hard drive.',
      'In TACC SuperCity, the M.2 is like a smart neighborhood library, keeping books, records, and documents right where people need them.',
      'Residents can access knowledge quickly and conveniently, supporting both learning and decision-making.',
      'By keeping information close at hand, the M.2 helps the supercomputer — and the city — think, learn, and grow at remarkable speed.',
    ],
    analogy: [
      'In TACC SuperCity, libraries serve as hubs of knowledge, keeping information close and easy for everyone to access.',
      'In the same way, a supercomputer uses M.2 storage to keep critical data for fast access.',
      'When information is nearby, learning and computing happens faster.',
    ],
  },

  motherboard: {
    audioBase: 'motherboard',
    technical: [
      'This is the motherboard — the city\'s roads and power grid.',
      'It connects every district of TACC SuperCity, from the Grace Hopper Superchip to the M.2 storage and beyond.',
      'Through its intricate network of circuits, it delivers both power and information, making sure data can move smoothly between all the city\'s systems.',
      'Without it, components would be isolated, unable to communicate or share resources.',
      'In TACC SuperCity, the motherboard is like a vast web of highways, power lines, and communication cables — keeping the lights on, the traffic moving, and the energy flowing so that innovation never stops.',
    ],
    analogy: [
      'In TACC SuperCity, roads and bridges connect neighborhoods, buildings, and services so people and resources can move freely.',
      'In the same way, a supercomputer relies on the motherboard to connect all components, allowing information and power to travel smoothly.',
      'Without these connections, neither the city nor the computer could function as a unified system.',
    ],
  },

  riser: {
    audioBase: 'riser-card',
    technical: [
      'This is the riser card — the elevator system of TACC SuperCity.',
      'It helps connect components that sit on different levels of the motherboard, making the city more space-efficient and productive.',
      'By adding vertical connections, riser cards allow for extra expansion slots, where new technologies — like InfiniBand cards or local storage — can be installed.',
      'It\'s a clever way to make the most of limited space, ensuring every part of the supercomputer has access to the tools it needs.',
      'In TACC SuperCity, the riser card is like an elevator network that helps people and information move between floors quickly — building upward instead of outward to keep the city growing strong.',
    ],
    analogy: [
      'In TACC SuperCity, elevators help the city grow upward by moving people efficiently between different levels.',
      'In the same way, a supercomputer uses a riser card to allow components to physically connect across layers.',
      'When space is used efficiently, it keeps both cities and computers scalable so data can reach different parts of the system.',
    ],
  },

  infiniband: {
    audioBase: 'infiniband',
    technical: [
      'This is the InfiniBand network — the city\'s express delivery system.',
      'It moves data between neighborhoods at astonishing speeds — up to 400 gigabytes per second — far faster than traditional networks.',
      'InfiniBand connects each node in the supercomputer to powerful switches, forming an ultra-efficient communication grid.',
      'It ensures that when one part of the city needs information from another, the delivery happens almost instantly.',
      'In TACC SuperCity, InfiniBand is like a fleet of high-speed drones racing through the skies, carrying messages and supplies between districts — keeping collaboration seamless and the flow of ideas unstoppable.',
    ],
    analogy: [
      'In TACC SuperCity, express delivery systems move packages, supplies, and information quickly between different cities.',
      'In the same way, a supercomputer uses InfiniBand to transfer massive amounts of data at extremely high speeds.',
      'Fast delivery keeps the entire system productive and on time.',
    ],
  },
}

ecs.registerComponent({
  name: 'play-audio',
  schema: {
    type: ecs.string,              // key into CONTENT
    mode: ecs.string,              // "technical" or "analogy"
    triggerEventName: ecs.string,  // event dispatched by audio-trigger
    allowDirectTouch: ecs.ui8,     // 0/1
  },
  schemaDefaults: {
    type: 'heatsink',
    mode: 'technical',
    triggerEventName: 'play-audio-trigger',
    allowDirectTouch: 0,
  },
  data: {
    index: ecs.ui32,
  },
  stateMachine: ({world, eid, schemaAttribute, dataAttribute}) => {
    const step = () => {
      const data = dataAttribute.cursor(eid)
      const {type, mode} = schemaAttribute.get(eid) as any

      const contentData = CONTENT[type]
      if (!contentData) {
        console.error(`No content found for type: ${type}`)
        return
      }

      let textArray: string[] = []
      let filenameSuffix = ''

      if (mode === 'analogy') {
        textArray = contentData.analogy
        filenameSuffix = '-analogy'
      } else {
        textArray = contentData.technical
        filenameSuffix = ''
      }

      const currentIndex = Number(data.index) || 0
      const audioIndex = currentIndex + 1
      const audioUrl = `assets/Audio/${contentData.audioBase}${filenameSuffix}-${audioIndex}.mp3`

      world.audio.pause()
      console.log(`Playing: ${audioUrl}`)

      ecs.Audio.set(world, eid, {
        url: audioUrl,
        volume: 1,
        loop: false,
        paused: false,
        positional: false,
      })
      world.audio.play()

      data.index = ((currentIndex + 1) % textArray.length) as any
    }

    const triggerName = () => {
      const s = schemaAttribute.get(eid) as any
      return String(s?.triggerEventName ?? 'play-audio-trigger')
    }

    return ecs.defineState('on')
      .onEnter(() => {
        const data = dataAttribute.cursor(eid)
        data.index = 0 as any
      })

      // Parent/root calls this
      .listen(eid, triggerName(), () => {
        step()
      })

      // Optional: direct touch on the AudioFrame (leave off if parent handles all input)
      .listen(eid, ecs.input.SCREEN_TOUCH_START, () => {
        const {allowDirectTouch} = schemaAttribute.get(eid) as any
        if (Number(allowDirectTouch) !== 0) step()
      })

      .initial()
  },
})
