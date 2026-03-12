const onxrloaded = () => {
    XR8.XrController.configure({
        imageTargetData: [
            require('../image-targets/Target_Heat_Sink.json'),
            require('../image-targets/Target_M2.json'),
            require('../image-targets/Target_Riser_Card.json'),
            require('../image-targets/Target_Motherboard.json'),
            require('../image-targets/Target_Infiniband.json'),
            require('../image-targets/Target_Superchip.json'),
            require('../image-targets/Target_AC.json'),
            require('../image-targets/Target_Delivery.json'),
            require('../image-targets/Target_Elevators.json'),
            require('../image-targets/Target_Govt_officials.json'),
            require('../image-targets/Target_Library.json'),
            require('../image-targets/Target_Roads.json'),
        ],
    })
}
window.XR8 ? onxrloaded() : window.addEventListener('xrloaded', onxrloaded)