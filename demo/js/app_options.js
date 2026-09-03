import { svgFromGeo } from "../../dist/svgeomin.esm.js";

let geoDataUrl = '../dist/json/ne_50m_admin_0_countries.geojson';

(async () => {

    let options = {
        scale: 10000,

        // remove small areas e.g island
        minArea: 1,

        features: ['germany', 'switzerland', 'austria'],

        // split sub features e.g islands
        split: 0,

        // add meta
        meta: 1,

        // filter properties
        properties: ['name'],

        // apply RDP simplification
        simplify: 10,

        classPre: 'svgeomin',

        projection: 'mercator',

        // map css
        //css: `.svgeomin-feature{fill:#ccc; stroke-width:0.25%; stroke:red}`,
        cssInline :`fill:#ccc; stroke:#fff; color:#555`

    }

    let svGeo = await svgFromGeo(geoDataUrl, options);
    // optional retrieve data from object
    let { svg, bb, x, y, bbGeo, scale, size } = svGeo;

    console.log(svGeo);

    // render
    svGeo.render(svgeoWrap)

})();
