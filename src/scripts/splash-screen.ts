import * as ecs from '@8thwall/ecs'

declare const require: (path: string) => string

ecs.registerComponent({
  name: 'splash-screen',

  schema: {
    startingSpaceName: ecs.string,
  },
  schemaDefaults: {
    startingSpaceName: 'Default',
  },

  stateMachine: ({world, eid, schemaAttribute}) => {
    const toLoadSpace = ecs.defineTrigger()

    const splashId = 'custom-splash-screen'

    ecs.defineState('showingSplash')
      .initial()
      .onEnter(() => {
        window.dispatchEvent(new CustomEvent('splash-visible'))

        const starUrl = require('../assets/splash_screen/star.png')
        const blurStarUrl = require('../assets/splash_screen/blur_star.png')
        const taccLogoUrl = require('../assets/splash_screen/tacc_logo.png')
        const titleUrl = require('../assets/splash_screen/title_supercity.png')
        const welcomeUrl = require('../assets/splash_screen/welcome_msg.png')
        const subtitleUrl = require('../assets/splash_screen/subtitle_text.png')
        const buttonUrl = require('../assets/splash_screen/button_get_started.png')
        const hintUrl = require('../assets/splash_screen/hint_text.png')

        const splashHTML = `
          <div id="${splashId}"> 
            <div class="card-content">
              
              <div class="content-top">
                <div class="tacc-logo-group">
                  <img src="${starUrl}" class="star star-sharp" alt="" />
                  <img src="${blurStarUrl}" class="star star-blur" alt="" />
                  <img src="${taccLogoUrl}" class="logo" alt="TACC logo" />
                </div>
                <img src="${titleUrl}" class="title" alt="SuperCity title" />
              </div>

              <div class="content-middle">
                <img src="${welcomeUrl}" class="welcome" alt="Welcome message" />
                <img src="${subtitleUrl}" class="subtitle" alt="Subtitle text" />
              </div>

              <div class="content-bottom">
                <img src="${buttonUrl}" id="start-btn" class="btn" alt="Get Started button" />
                <img src="${hintUrl}" class="hint" alt="Hint text" />
              </div>

            </div>
          </div>
        `

        const splashStyle = document.createElement('style')
        splashStyle.textContent = `
          #${splashId} {
            position: fixed;
            inset: 0;
            z-index: 9999;
            background: linear-gradient(180deg, #3A3249 0%, #0B2044 100%);
            border: 1px solid transparent;
            border-image-source: linear-gradient(180deg, #4DFFFF, #2E9999);
            border-image-slice: 1;
            
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            
            overflow-y: auto; 
            -webkit-overflow-scrolling: touch;
            padding: 5vh 5vw; 
            
            font-family: Inter, system-ui, sans-serif;
            color: #eaf7ff;
            transition: opacity .35s ease;
          }

          #${splashId}.hidden {
            opacity: 0;
            pointer-events: none;
          }

          .card-content {
            display: flex;
            flex-direction: column;
            justify-content: space-between; 
            align-items: center;
            width: 100%;
            min-height: 100%; 
            max-width: 460px;
            text-align: center;
            margin: 0 auto; 
          }

          .content-top {
            display: flex;
            flex-direction: column;
            width: fit-content; 
            align-items: flex-start;
            margin: 0 auto; 
          }

          .tacc-logo-group {
            position: relative;
            margin-bottom: 0.5rem;
            margin-left: 0;
            margin-top: 10px;
          }

          .star {
            position: absolute;
            height: auto;
            pointer-events: none;
          }

          .star-sharp {
             width: 22px;
             top: -8px;   
             left: -26px; 
             z-index: 2;
          }

          .star-blur {
             width: 18px;
             top: -20px; 
             left: -14px; 
             z-index: 1;
          }

          .logo {
            width: 80px; 
            margin-left: 0; 
            display: block;
          }

          .title {
            width: clamp(280px, 70vw, 360px);
            height: auto;
          }

          .content-middle {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
            margin: 2rem 0; 
          }

          .content-bottom {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
            padding-bottom: 1rem;
          }

          .card-content img {
            height: auto;
            flex-shrink: 0;
          }

          .welcome {
            width: 90%;
            max-width: 100%;
          }

          .subtitle {
            width: 80%;
            max-width: 100%;
            margin-top: 1rem;
          }

          .content-bottom .btn {
            width: 100%;
            max-width: 300px;
            cursor: pointer;
            transition: transform 0.2s ease;
          }
          
          .content-bottom .btn:hover {
            transform: scale(1.03);
          }
          
          .content-bottom .hint {
            opacity: 0.8;
            margin-top: 1.25rem;
            width: 80%;
            max-width: 100%;
          }

          @media (max-height: 600px) {
            #${splashId} {
              padding: 1rem;
            }
            .content-middle {
              margin: 1rem 0;
            }
            .content-top {
               transform: scale(0.9);
            }
            .welcome, .subtitle {
               width: 60%;
            }
          }
        `
        document.head.appendChild(splashStyle)
        document.body.insertAdjacentHTML('beforeend', splashHTML)

        const btn = document.getElementById('start-btn')
        if (!btn) return

        btn.addEventListener('click', () => {
          toLoadSpace.trigger()
        })
      })
      .onTrigger(toLoadSpace, 'loadingSpace')

    ecs.defineState('loadingSpace')
      .onEnter(() => {
        window.dispatchEvent(new CustomEvent('splash-hidden'))
        const splash = document.getElementById(splashId)
        if (splash) {
          splash.classList.add('hidden')
          setTimeout(() => splash.remove(), 400)
        }

        const {startingSpaceName} = schemaAttribute.get(eid)
        setTimeout(() => world.spaces.loadSpace(startingSpaceName), 350)
      })
  },
})
