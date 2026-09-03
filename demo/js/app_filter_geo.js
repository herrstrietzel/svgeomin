import { svgFromGeo } from "../../dist/svgeomin.esm.js";

let geoDataUrl = '../dist/json/ne_50m_admin_0_countries.geojson';

(async () => {

    let options = {
        scale: 10000,
        // filter features
        features: ['germany', 'switzerland', 'austria'],

        // filter properties
        properties: ['name'],

        // apply RDP simplification
        simplify: 10,
    }

    /**
     * filter geojson
     */

    // filter from url
    let geoFiltered = await filterGeoData(geoDataUrl, options);
    console.log({ geoFiltered });

    /*
    // test: remove geodata filter options
    delete options.features;
    delete options.exclude;
    */

    let svGeo = await svgFromGeo(geoFiltered, options);

    let { svg, bb, x, y, bbGeo, scale, size } = svGeo;

    /**
     * convert simplified 
     * back to geojson
     */
    let geoOptions = {
        decimals: 4,
    }
    let geoJSONSimplified = svGeo.getGeoJson(geoOptions)
    textareaJson.value = JSON.stringify(geoJSONSimplified)

    //console.log(JSON.stringify(geoJSONSimplified));



    // render 
    //svGeo.render('#svgeoWrap')
    svGeo.render(svgeoWrap)
    //svgeoWrap.innerHTML = svg;




})();
