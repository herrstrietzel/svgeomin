import { svgFromGeo } from "../../dist/svgeomin.esm.js";

let geoDataUrl = '../dist/json/ne_50m_admin_0_countries.geojson';

(async () => {

    let svGeo = await svgFromGeo(geoDataUrl);
    // optional retrieve data from object
    let { svg, bb, x, y, bbGeo, scale, size } = svGeo;

    console.log(svGeo);

    // render
    svGeo.render(svgeoWrap)

})();
