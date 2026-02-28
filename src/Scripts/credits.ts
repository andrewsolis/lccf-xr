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

        // Auto-show on component load (uncomment to enable)
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

        const creditsHTML = `
          <div id="${creditsId}">
            <!-- Animated backgrounds -->
            <div class="credits-grid-background"></div>
            <div class="credits-gradient-overlay"></div>
            <div class="credits-scanline"></div>

            <!-- Back button -->
            <button class="credits-back-btn" id="credits-back-btn">← Back</button>

            <!-- Scrollable content container -->
            <div class="credits-scroll-container">
              <div class="credits-content">
                
                <h1 class="credits-title">Credits</h1>

                <!-- Team Section -->
                <div class="credit-section">
                  <h2 class="section-title">Team</h2>
                  
                  <div class="credit-item">
                    <span class="credit-name">Andrew Solis</span>
                    <span class="credit-role">Principal Investigator</span>
                    <a href="mailto:asolis@tacc.utexas.edu" class="credit-link">asolis@tacc.utexas.edu</a>
                  </div>

                  <div class="credit-item">
                    <span class="credit-name">MJ Johns </span>
                    <span class="credit-role">Senior UX Researcher</span>
                    <a href="http://www.mjjohnsdesigner.com/" target="_blank" class="credit-link">mjjohnsdesigner.com</a>
                  </div>

                  <div class="credit-item">
                    <span class="credit-name">Jo Wozniak </span>
                    <span class="credit-role">RESA IV</span>
                    <a href="https://tacc.utexas.edu/about/staff-directory/jo-wozniak/" target="_blank" class="credit-link">tacc.utexas.edu/about/staff-directory/jo-wozniak/</a>
                  </div>

                  <div class="credit-item">
                    <span class="credit-name">Sanika Goyal</span>
                    <span class="credit-role">Experience Design Lead</span>
                    <a href="https://sanikagoyal.com/" target="_blank" class="credit-link">sanikagoyal.com</a>
                  </div>

                  <div class="credit-item">
                    <span class="credit-name">Ayon Das</span>
                    <span class="credit-role">Software Engineer</span>
                    <a href="https://www.linkedin.com/in/ayon-saneel-das/" target="_blank" class="credit-link">linkedin.com/in/ayon-saneel-das</a>
                  </div>

                  <div class="credit-item">
                    <span class="credit-name">Jo Wozniak</span>
                    <span class="credit-role">RESA IV</span>
                    <a href="https://tacc.utexas.edu/about/staff-directory/jo-wozniak/" target="_blank" class="credit-link">tacc.utexas.edu/about/staff-directory/jo-wozniak</a>
                  </div>

                  <div class="credit-item">
                    <span class="credit-name">Karen Heckel</span>
                    <span class="credit-role">Software Engineer</span>
                    <a href="https://www.linkedin.com/in/karen-heckel/" target="_blank" class="credit-link">linkedin.com/in/karen-heckel</a>
                  </div>

                  <div class="credit-item">
                    <span class="credit-name">Imelda Ishiekwene</span>
                    <span class="credit-role">UX Designer</span>
                  </div>

                  <div class="credit-item">
                    <span class="credit-name">Gloria Jang</span>
                    <span class="credit-role">Junior Visual/Experience Designer</span>
                    <a href="https://www.linkedin.com/in/minjoo-jang-056223243/" target="_blank" class="credit-link">linkedin.com/in/minjoo-jang-056223243</a>
                  </div>

                  <div class="credit-item">
                    <span class="credit-name">Pascal R Garcia</span>
                  </div>

                  <div class="credit-item">
                    <span class="credit-name">Tyler Henry</span>
                  </div>

                  <div class="credit-item">
                    <span class="credit-name">Dawn Hunter</span>
                  </div>
                </div>

                <!-- Assets Section -->
                <div class="credit-section">
                  <h2 class="section-title">Assets</h2>
                  
                  <div class="asset-item">
                    <span class="asset-name">Music</span>
                    <span class="asset-creator">by Eric Matyas</span>
                    <a href="https://www.soundimage.org" target="_blank" class="credit-link">soundimage.org →</a>
                  </div>

                  <div class="asset-item">
                    <span class="asset-name">Low Poly Sci-Fi Cyberpunk City</span>
                    <span class="asset-creator">by JustCreate (Licensed)</span>
                    <a href="https://www.fab.com/listings/c2ed30b1-8c40-4124-8c1e-08856766f4b3" target="_blank" class="credit-link">View on Fab →</a>
                  </div>

                  <div class="asset-item">
                    <span class="asset-name">Low Poly Sci-Fi Cyberpunk Interior</span>
                    <span class="asset-creator">by JustCreate (Licensed)</span>
                    <a href="https://www.fab.com/listings/cb26b3c1-5ff4-4c48-9f31-c96c0dba4cfa" target="_blank" class="credit-link">View on Fab →</a>
                  </div>
                </div>

                <!-- Thank You -->
                <div class="credit-section">
                  <p class="final-message">Thank You</p>
                </div>

              </div>
            </div>
          </div>
        `

        // Style injection
        if (!document.getElementById(styleId)) {
          const creditsStyle = document.createElement('style')
          creditsStyle.id = styleId
          creditsStyle.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap');

            :root {
              --neon-blue: #00f3ff;
              --neon-pink: #ff006e;
              --neon-purple: #8b5cf6;
              --dark-bg: #0a0a0f;
              --gradient-start: rgba(139, 92, 246, 0.1);
              --gradient-end: rgba(0, 243, 255, 0.1);
            }

            #${creditsId} {
              position: fixed;
              inset: 0;
              z-index: 999999;
              transition: opacity 0.35s ease;
              pointer-events: auto;
              font-family: 'Share Tech Mono', monospace;
              background: var(--dark-bg);
              color: #fff;
              overflow: hidden;
            }

            #${creditsId}.hidden {
              opacity: 0;
              pointer-events: none;
            }

            #${creditsId} * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            /* Animated background grid */
            .credits-grid-background {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background-color: var(--dark-bg);
              background-image: 
                linear-gradient(rgba(0, 243, 255, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 243, 255, 0.03) 1px, transparent 1px);
              background-size: 50px 50px;
              animation: creditsGridMove 20s linear infinite;
              z-index: 0;
            }

            @keyframes creditsGridMove {
              0% { transform: translateY(0); }
              100% { transform: translateY(50px); }
            }

            /* Gradient overlay */
            .credits-gradient-overlay {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: radial-gradient(ellipse at top, var(--gradient-start) 0%, transparent 50%),
                          radial-gradient(ellipse at bottom, var(--gradient-end) 0%, transparent 50%);
              z-index: 1;
              pointer-events: none;
            }

            /* Scanline effect */
            .credits-scanline {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: linear-gradient(to bottom, transparent 50%, rgba(0, 243, 255, 0.03) 50%);
              background-size: 100% 4px;
              animation: creditsScan 8s linear infinite;
              z-index: 2;
              pointer-events: none;
            }

            @keyframes creditsScan {
              0% { transform: translateY(0); }
              100% { transform: translateY(100vh); }
            }

            /* Back button */
            .credits-back-btn {
              position: fixed;
              top: 24px;
              left: 24px;
              z-index: 10;
              background: rgba(0, 243, 255, 0.1);
              border: 2px solid var(--neon-blue);
              color: var(--neon-blue);
              font-family: 'Orbitron', sans-serif;
              font-size: 0.9rem;
              padding: 12px 24px;
              cursor: pointer;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              transition: all 0.3s ease;
              backdrop-filter: blur(10px);
              border-radius: 4px;
            }

            .credits-back-btn:hover {
              background: rgba(0, 243, 255, 0.2);
              box-shadow: 0 0 20px rgba(0, 243, 255, 0.4);
              transform: translateY(-2px);
            }

            .credits-back-btn:active {
              transform: translateY(0);
            }

            /* Scrollable container */
            .credits-scroll-container {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100vh;
              overflow-y: auto;
              overflow-x: hidden;
              -webkit-overflow-scrolling: touch;
              z-index: 3;
              display: flex;
              justify-content: center;
            }

            /* Credits content */
            .credits-content {
              max-width: 900px;
              width: 100%;
              text-align: center;
              padding: 120px 40px 100px;
              box-sizing: border-box;
            }

            /* Title styling */
            .credits-title {
              font-family: 'Orbitron', sans-serif;
              font-size: clamp(2.5rem, 8vw, 5rem);
              font-weight: 900;
              margin-bottom: 4rem;
              background: linear-gradient(135deg, var(--neon-blue), var(--neon-purple), var(--neon-pink));
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              animation: creditsGlowPulse 3s ease-in-out infinite;
              text-shadow: 0 0 40px rgba(0, 243, 255, 0.5);
            }

            @keyframes creditsGlowPulse {
              0%, 100% {
                filter: brightness(1) drop-shadow(0 0 20px rgba(0, 243, 255, 0.6));
              }
              50% {
                filter: brightness(1.2) drop-shadow(0 0 30px rgba(0, 243, 255, 0.8));
              }
            }

            /* Section styling with staggered animation */
            .credit-section {
              margin-bottom: 6rem;
              animation: creditsFadeInUp 1s ease-out forwards;
              opacity: 0;
            }

            .credit-section:nth-child(2) { animation-delay: 0.2s; }
            .credit-section:nth-child(3) { animation-delay: 0.4s; }
            .credit-section:nth-child(4) { animation-delay: 0.6s; }
            .credit-section:nth-child(5) { animation-delay: 0.8s; }

            @keyframes creditsFadeInUp {
              from {
                opacity: 0;
                transform: translateY(30px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }

            .section-title {
              font-family: 'Orbitron', sans-serif;
              font-size: clamp(1.5rem, 4vw, 2.5rem);
              font-weight: 700;
              color: var(--neon-blue);
              margin-bottom: 2rem;
              text-transform: uppercase;
              letter-spacing: 0.15em;
              position: relative;
              display: inline-block;
            }

            .section-title::before,
            .section-title::after {
              content: '//';
              color: var(--neon-pink);
              font-size: 0.8em;
              opacity: 0.6;
            }

            .section-title::before {
              margin-right: 1rem;
            }

            .section-title::after {
              margin-left: 1rem;
            }

            /* Credit item styling */
            .credit-item {
              margin-bottom: 2.5rem;
              font-size: clamp(1rem, 2.5vw, 1.25rem);
              line-height: 1.8;
            }

            .credit-name {
              color: #fff;
              font-weight: 700;
              font-size: 1.1em;
              display: block;
              margin-bottom: 0.3rem;
            }

            .credit-role {
              color: var(--neon-purple);
              font-style: italic;
              font-size: 0.9em;
              display: block;
              margin-bottom: 0.3rem;
            }

            .credit-link {
              color: var(--neon-blue);
              text-decoration: none;
              font-size: 0.85em;
              transition: all 0.3s ease;
              display: inline-block;
              border-bottom: 1px solid transparent;
            }

            .credit-link:hover {
              color: var(--neon-pink);
              border-bottom-color: var(--neon-pink);
              text-shadow: 0 0 10px rgba(255, 0, 110, 0.5);
            }

            /* Asset item styling */
            .asset-item {
              margin-bottom: 2rem;
              padding: 1.5rem;
              background: rgba(139, 92, 246, 0.05);
              border: 1px solid rgba(0, 243, 255, 0.2);
              border-radius: 8px;
              transition: all 0.3s ease;
            }

            .asset-item:hover {
              background: rgba(139, 92, 246, 0.1);
              border-color: rgba(0, 243, 255, 0.4);
              transform: translateY(-2px);
              box-shadow: 0 10px 30px rgba(0, 243, 255, 0.2);
            }

            .asset-name {
              color: #fff;
              font-size: 1.1em;
              font-weight: 700;
              margin-bottom: 0.5rem;
              display: block;
            }

            .asset-creator {
              color: var(--neon-purple);
              font-size: 0.9em;
              display: block;
              margin-bottom: 0.5rem;
            }

            /* Final message */
            .final-message {
              margin-top: 6rem;
              font-family: 'Orbitron', sans-serif;
              font-size: clamp(1.5rem, 4vw, 2.5rem);
              font-weight: 700;
              color: var(--neon-pink);
              text-transform: uppercase;
              letter-spacing: 0.2em;
              animation: creditsGlowPulse 2s ease-in-out infinite;
            }

            /* Responsive adjustments */
            @media (max-width: 1200px) {
              .credits-content {
                max-width: 700px;
                padding: 110px 40px 90px;
              }
            }

            @media (max-width: 768px) {
              .credits-content {
                max-width: 600px;
                padding: 100px 30px 70px;
              }

              .section-title::before,
              .section-title::after {
                display: none;
              }

              .credits-back-btn {
                top: 16px;
                left: 16px;
                padding: 10px 20px;
                font-size: 0.8rem;
              }

              .credit-section {
                margin-bottom: 5rem;
              }

              .credit-item {
                margin-bottom: 2rem;
              }
            }

            @media (max-width: 480px) {
              .credits-content {
                max-width: 100%;
                padding: 90px 24px 60px;
              }

              .credits-back-btn {
                padding: 8px 16px;
                font-size: 0.75rem;
              }

              .asset-item {
                padding: 1rem;
              }

              .credit-section {
                margin-bottom: 4rem;
              }

              .credit-item {
                margin-bottom: 1.8rem;
              }
            }
          `
          document.head.appendChild(creditsStyle)
        }

        document.body.insertAdjacentHTML('beforeend', creditsHTML)

        // Scroll to top
        const creditsContainer = document.querySelector('.credits-scroll-container') as HTMLElement
        if (creditsContainer) creditsContainer.scrollTop = 0

        // Back button handler
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
          setTimeout(() => creditsStyle.remove(), 450)
        }

        const {backSpaceName} = schemaAttribute.get(eid)
        setTimeout(() => world.spaces.loadSpace(backSpaceName), 350)

        window.dispatchEvent(new CustomEvent('credits-closed'))
      })
  },
})
