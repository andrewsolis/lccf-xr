const onxrloaded = () => {
    XR8.XrController.configure({
        imageTargetData: [
            require('../image-targets/heatsink.json'),
            require('../image-targets/m2.json'),
            require('../image-targets/riser_card.json'),
            require('../image-targets/motherboard.json'),
            require('../image-targets/infiniband.json'),
            require('../image-targets/grace_hopper.json'),
            require('../image-targets/heatsink_analogy.json'),
            require('../image-targets/infiniband_analogy.json'),
            require('../image-targets/riser_card_analogy.json'),
            require('../image-targets/grace_hopper_analogy.json'),
            require('../image-targets/m2_analogy.json'),
            require('../image-targets/motherboard_analogy.json'),
        ],
    })
}
window.XR8 ? onxrloaded() : window.addEventListener('xrloaded', onxrloaded)