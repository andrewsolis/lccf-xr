import * as ecs from '@8thwall/ecs'

declare const require: (path: string) => string

ecs.registerComponent({
  name: 'credits-page',

  schema: {
    // Space to go back to when pressing Back
    backSpaceName: ecs.string,
  },
  schemaDefaults: {
    backSpaceName: 'Default',
  },

  stateMachine: ({world, eid, schemaAttribute}) => {
    const toHideAndLoad = ecs.defineTrigger()
    const toShow = ecs.defineTrigger()

    const creditsId = 'credits-page-overlay'
    const styleId = 'credits-page-styles'

    const showCreditsHandler = () => toShow.trigger()

    ecs.defineState('hidden')
      .initial()
      .onEnter(() => {
        window.addEventListener('show-credits', showCreditsHandler)

        // Auto-show on component load (same vibe as splash)
        // toShow.trigger()
      })
      .onTrigger(toShow, 'showing')
      .onExit(() => {
        window.removeEventListener('show-credits', showCreditsHandler)
      })

    ecs.defineState('showing')
      .onEnter(() => {
        // Prevent duplicates
        if (document.getElementById(creditsId)) return

        // Load image assets (adjust paths if needed)
        const backgroundUrl = require('../assets/background.png')
        const titleUrl = require('../assets/supercity-credit-title.png')
        const contributorsUrl = require('../assets/supercity-credit-contributors.png')
        const assetsUrl = require('../assets/supercity-credit-assets.png')

        const creditsHTML = `
          <div id="${creditsId}">
            <img src="${backgroundUrl}" class="credits-bg" alt="" aria-hidden="true" />

            <button class="credits-back-btn" id="credits-back-btn">← Back</button>

            <div class="credits-scroll-area">
              <div class="credits-top-spacer"></div>
              <img src="${titleUrl}" class="credits-title-img" alt="SuperCity Credits" />
              <img src="${contributorsUrl}" class="credits-section-img" alt="Contributors" />
              <img src="${assetsUrl}" class="credits-section-img" alt="Assets" />
              <p class="credits-final">Thank You</p>
            </div>
          </div>
        `

        // Style injection (same approach as splash)
        if (!document.getElementById(styleId)) {
          const creditsStyle = document.createElement('style')
          creditsStyle.id = styleId
          creditsStyle.textContent = `
            #${creditsId} {
              position: fixed;
              inset: 0;
              z-index: 999999; /* stronger than before */
              overflow-y: auto;
              overflow-x: hidden;
              -webkit-overflow-scrolling: touch;
              transition: opacity .35s ease;
              pointer-events: auto;
            }

            #${creditsId}.hidden {
              opacity: 0;
              pointer-events: none;
            }

            .credits-bg {
              position: fixed;
              inset: 0;
              width: 100%;
              height: 100%;
              object-fit: cover;
              object-position: center top;
              z-index: 0;
              pointer-events: none;
            }

            .credits-top-spacer {
              height: 70px;
              flex-shrink: 0;
            }

            .credits-back-btn {
              position: absolute;
              top: 24px;
              left: 24px;
              z-index: 10;
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
            }

            .credits-back-btn:hover {
              background: rgba(77, 255, 255, 0.22);
              box-shadow: 0 0 18px rgba(77, 255, 255, 0.45);
              transform: translateY(-2px);
            }

            .credits-scroll-area {
              position: relative;
              z-index: 3;
              width: 100%;
              min-height: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 0 0 60px 0;
              box-sizing: border-box;
            }

            .credits-title-img,
            .credits-section-img {
              width: 100%;
              max-width: 100%;
              height: auto;
              display: block;
              flex-shrink: 0;
            }

            .credits-section-img {
              margin-top: -2px;
            }

            .credits-final {
              margin-top: 3rem;
              font-family: 'Orbitron', 'Share Tech Mono', monospace;
              font-size: clamp(1.4rem, 4vw, 2.2rem);
              font-weight: 700;
              color: #4DFFFF;
              text-transform: uppercase;
              letter-spacing: 0.25em;
              text-shadow: 0 0 20px rgba(77, 255, 255, 0.7);
              animation: finalGlow 2.5s ease-in-out infinite;
            }

            @keyframes finalGlow {
              0%, 100% { opacity: 1; filter: brightness(1); }
              50% { opacity: 0.85; filter: brightness(1.3); }
            }

            @media (max-width: 480px) {
              .credits-back-btn {
                top: 16px;
                left: 16px;
                padding: 8px 16px;
                font-size: 0.75rem;
              }
            }
          `
          document.head.appendChild(creditsStyle)
        }

        document.body.insertAdjacentHTML('beforeend', creditsHTML)

        // Scroll to top
        const creditsPage = document.getElementById(creditsId)
        if (creditsPage) creditsPage.scrollTop = 0

        // Back button -> trigger hide/load state (like splash)
        const backBtn = document.getElementById('credits-back-btn')
        if (backBtn) {
          backBtn.addEventListener('click', () => {
            toHideAndLoad.trigger()
          })
        }
      })
      .onTrigger(toHideAndLoad, 'loadingSpace')

    ecs.defineState('loadingSpace')
      .onEnter(() => {
        const creditsPage = document.getElementById(creditsId)
        if (creditsPage) {
          creditsPage.classList.add('hidden')
          setTimeout(() => creditsPage.remove(), 400)
        }

        const creditsStyle = document.getElementById(styleId)
        if (creditsStyle) {
          // remove after fade for cleanliness
          setTimeout(() => creditsStyle.remove(), 450)
        }

        const {backSpaceName} = schemaAttribute.get(eid)
        setTimeout(() => world.spaces.loadSpace(backSpaceName), 350)

        window.dispatchEvent(new CustomEvent('credits-closed'))
      })
  },
})
