import * as ecs from '@8thwall/ecs'

ecs.registerComponent({
  name: 'credits-button-overlay',
  add: (world, component) => {
    console.log('CREDITS_DEBUG: Component added to world')

    const buttonId = 'ui-credits-button'
    const styleId = 'ui-credits-button-styles'

    const injectUI = () => {
      // 1. Inject Styles (Matched to your Back Button)
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style')
        style.id = styleId
        style.textContent = `
          .overlay-credits-btn {
            position: fixed;
            bottom: 24px;   /* Matched spacing */
            left: 24px;    /* Matched spacing */
            z-index: 99999; 
            background: rgba(77, 255, 255, 0.1);
            border: 1.5px solid #4DFFFF;
            color: #4DFFFF;
            font-family: 'Orbitron', 'Share Tech Mono', monospace;
            font-size: 0.85rem;
            padding: 10px 22px;
            cursor: pointer;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            transition: all 0.25s ease;
            backdrop-filter: blur(8px);
            border-radius: 4px;
            display: block !important;
          }

          .overlay-credits-btn:hover {
            background: rgba(77, 255, 255, 0.22);
            box-shadow: 0 0 18px rgba(77, 255, 255, 0.45);
            transform: translateY(-2px);
          }

          .overlay-credits-btn.hidden {
            opacity: 0;
            pointer-events: none;
            transform: translateY(10px); /* Subtle slide out */
          }
        `
        document.head.appendChild(style)
      }

      // 2. Inject Button
      if (!document.getElementById(buttonId)) {
        const buttonHTML = `<button id="${buttonId}" class="overlay-credits-btn">Credits</button>`
        document.body.insertAdjacentHTML('beforeend', buttonHTML)
      }

      const btn = document.getElementById(buttonId)
      if (!btn) return

      // 3. Logic Helpers
      const showBtn = () => {
        console.log('CREDITS_DEBUG: Showing Button')
        btn.classList.remove('hidden')
      }
      const hideBtn = () => {
        console.log('CREDITS_DEBUG: Hiding Button')
        btn.classList.add('hidden')
      }

      btn.onclick = () => {
        window.dispatchEvent(new CustomEvent('show-credits'))
        hideBtn()
      }

      window.addEventListener('credits-closed', showBtn)
      window.addEventListener('splash-hidden', showBtn)

      const comp = component as any
      comp._btn = btn
      comp._showBtn = showBtn
      comp._hideBtn = hideBtn
    }

    setTimeout(injectUI, 500)
  },

  remove: (world, component) => {
    const comp = component as any
    if (comp._btn) {
      comp._btn.remove()
    }
    window.removeEventListener('credits-closed', comp._showBtn)
    window.removeEventListener('splash-hidden', comp._showBtn)
  },
})
