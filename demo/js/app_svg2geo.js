import { svgFromGeo } from "../../dist/svgeomin.esm.js";
import { projectPoint } from "../../src/geometry_geo.js";
import { parsePathDataNormalized, splitSubpaths } from "../../src/pathdata_parse.js";


(async () => {

    let svgEl = document.querySelector('svg')
    let svgMarkup = new XMLSerializer().serializeToString(svgEl);
    //console.log(svgMarkup);

    /*
    let meta = JSON.parse(svgEl.dataset.svgeo)
    console.log(meta);
    */

    let meta = {
        "projection": "mercator",
        "lonMin": 5.85752,
        "latMin": 45.830029,
        "lonMax": 17.147363,
        "latMax": 55.05874
    }

    let { lonMin, latMin, lonMax, latMax, projection } = meta


    let stringify = false;

    let geoJson = svg2GeoJson(svgEl, { lonMin, latMin, lonMax, latMax, projection, stringify });

    console.log(JSON.stringify(geoJson));


    //let geoJson = svg2GeoJson(svgMarkup, { lonMin, latMin, lonMax, latMax, projection, stringify });

    let lat = (latMax+latMin)*0.5
    let lon = (lonMax+lonMin)*0.5
    //lat = 52.5173885;
    //lon = 13.3951309
    let zoom = 6

    // init
    let leafletMap = initMap(lon, lat, zoom);

    setGeoJson(leafletMap, geoJson, { style: { color: "red", fillOpacity: 0.4 } }, true);


})();


function svg2GeoJson(svg = null, { lonMin = 0, latMin = 0, lonMax = 0, latMax = 0, projection, decimals = 5, stringify = false } = {}) {

    let svgEl = null;

    if (typeof svg === 'string') {
        try {
            svgEl = new DOMParser().parseFromString(svg, 'image/svg+xml').querySelector('svg');
        } catch {
            console.warn('Could not parse SVG');
        }
    }
    else if (typeof svg === 'object' && svg.nodeName.toLowerCase() === 'svg') {
        svgEl = svg
    }

    if (!svgEl) {
        console.warn('Could not parse SVG');
        return {}
    }

    let paths = svgEl.querySelectorAll('path');
    let featureGroups = [];
    let featureMeta = [];


    // parse all paths
    for (let i = 0, l = paths.length; l && i < l; i++) {
        let path = paths[i];
        let properties = Object.assign({}, path.dataset)
        featureMeta.push(properties)
        let d = path.getAttribute('d')
        // normalize to all absolute
        let pathData = parsePathDataNormalized(d)
        // split sub paths
        let pathDataArr = splitSubpaths(pathData);
        featureGroups.push(pathDataArr)
    }

    console.log(featureGroups);

    /**
     * convert to points
     */
    let groups = [];
    let xArr = [];
    let yArr = [];

    for (let i = 0, l = featureGroups.length; l && i < l; i++) {
        let pathDataArr = featureGroups[i];
        //let group = []
        let polys = [];

        for (let j = 0, k = pathDataArr.length; j < k; j++) {
            let pathData = pathDataArr[j];
            let poly = [];

            // sub paths
            for (let c = 0, len = pathData.length; c < len; c++) {
                let com = pathData[c];
                let { type, values } = com;
                // get final on-path points
                let pt = values.slice(-2)
                if (values.length) {
                    xArr.push(pt[0])
                    yArr.push(pt[1])
                    poly.push(pt)
                }
            }
            polys.push(poly)
        }
        groups.push(polys)
    }


    // calculate bbox
    let xMin = Math.min(...xArr)
    let yMin = Math.min(...yArr)
    let xMax = Math.max(...xArr)
    let yMax = Math.max(...yArr)
    let bb = { x: xMin, y: yMin, width: xMax - xMin, height: yMax - yMin }



    let scale = null
    let xOffset = 0
    let yOffset = 0

    let metaData = svgEl.dataset.svgeo ? JSON.parse(svgEl.dataset.svgeo) : null;

    // retrieve scale and offsets from meta data attribute
    if (metaData) {
        console.log('use data attribute', { metaData });
        scale = metaData.scale
        xOffset = metaData.x
        yOffset = metaData.y
    }
    // calculate from projection and vertices
    else {

        console.log('calculate from polys', { metaData });

        // get scaling factor
        let ptTL = projectPoint(lonMin, latMin, projection)
        let ptBR = projectPoint(lonMax, latMax, projection)

        let xMinG = Math.min(ptTL[0], ptBR[0])
        let xMaxG = Math.max(ptTL[0], ptBR[0])
        let yMinG = Math.min(ptTL[1], ptBR[1])
        let yMaxG = Math.max(ptTL[1], ptBR[1])

        let bbG = { x: xMinG, y: yMinG, width: xMaxG - xMinG, height: yMaxG - yMinG }
        console.log({ bbG });

        //let scale = Math.ceil(bb.width/+bbG.width.toFixed(4))
        let scaleX = (bb.width / bbG.width.toFixed(4))
        let scaleY = (bb.height / bbG.height.toFixed(4))
        scale = Math.max(scaleX, scaleY)

        xOffset = Math.round(bbG.x * scale)
        yOffset = Math.round(bbG.y * scale)

    }


    /**
     * project back to geo coordinates
     */

    // create geojson object
    let geojson = {
        type: "FeatureCollection",
        name: "svgeo",
        features: []
    }

    groups.forEach((polys, i) => {
        // polys
        let isMulti = polys.length > 1;

        // add properties
        let properties = featureMeta[i] ? featureMeta[i] : { id: `feature_${i}` }

        let feature = {
            type: "Feature",
            properties,
            geometry: {
                type: isMulti ? "MultiPolygon" : "Polygon",
                coordinates: []
            }
        }

        let polysG = [];
        polys.forEach((pts, j) => {

            let polyG = [];
            let revert = true

            // project pts
            pts.forEach(pt => {
                pt[0] = (pt[0] + xOffset);
                pt[1] = (pt[1] + yOffset);
                let ptG = projectPoint(0, 0, projection, scale, decimals, revert, pt[0], pt[1])
                polyG.push(ptG)
            })
            polysG.push(isMulti ? [polyG] : polyG);
        })

        feature.geometry.coordinates = polysG;
        geojson.features.push(feature)

    })


    return stringify ? JSON.stringify(geojson) : geojson

}




/**
 * init leaflet map
 */

function initMap(lon = 0, lat = 0, zoom = 10) {
    let map = L.map("map").setView([lat, lon], zoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap"
    }).addTo(map);

    //L.control.scale().addTo(map);
    let marker = L.marker([lat, lon]).addTo(map);

    /*
    let marker = L.marker([lat, lon], {
        icon: getSVGMarker(
            {
                fill: "#136c5e",
                fillInner: "white",
                size: [48, 48]
            })
    }).addTo(map);
    */


    return {
        map,
        marker,
        geoJsonLayer: null
    };
}

// update
function updateMap(leafletMap, lon, lat) {

    let { marker } = leafletMap;

    // update marker
    marker.setLatLng([lat, lon]);
    leafletMap.map.panTo([lat, lon]);

    return leafletMap;
}



/**
 * Add or update a GeoJSON feature/featureCollection on the map
 * Handles Polygon, MultiPolygon, and feature collections seamlessly.
 */
function setGeoJson(leafletMap, geoJsonData, options = {}, fitBounds = true) {
    // 1. Remove existing layer if one is already present
    //removeGeoJson(leafletMap);

    // 2. Default styling for polygons
    const defaultStyle = {
        color: "#3388ff",
        weight: 3,
        opacity: 0.8,
        fillColor: "#3388ff",
        fillOpacity: 0.2
    };

    // 3. Create new layer
    const newLayer = L.geoJSON(geoJsonData, {
        style: options.style || defaultStyle,
        ...options
    }).addTo(leafletMap.map);

    // 4. Update the reference on the object
    leafletMap.geoJsonLayer = newLayer;

    // 5. Optional: auto-zoom/pan to fit the rendered geometry
    if (fitBounds && newLayer.getBounds().isValid()) {
        //leafletMap.map.fitBounds(newLayer.getBounds());
    }

    return leafletMap;
}

/**
 * Remove the active GeoJSON layer from the map instance
 */
function removeGeoJson(leafletMap) {
    if (leafletMap.geoJsonLayer) {
        leafletMap.map.removeLayer(leafletMap.geoJsonLayer);
        leafletMap.geoJsonLayer = null;
    }
    return leafletMap;
}


/**
 * Create a custom Leaflet DivIcon with inline SVG markup
 */
function getSVGMarker({
    fill = "#3388ff",
    fillInner = "white",
    stroke = "white",
    size = [32, 32]
} = {}) {
    let svgHtml = `
    <svg viewBox="0 0 24 24" overflow="visible" width="${size[0]}" height="${size[1]}">
    <defs>
     <path id="pathMarker" d="M12 23.5c0 0-7.5-4.5-7.5-12a1 1 0 1115 0c0 7-7.5 12-7.5 12z" />
      <linearGradient id="markerShadow" x1="0" x2="0" y1="0" y2="1">
        <stop stop-color="black" offset="10%" stop-opacity="0" />
        <stop stop-color="black" offset="100%" stop-opacity="0.6" />
      </linearGradient>
    </defs>
     <use href="#pathMarker" fill-opacity="0.5" transform="skewX(-45) scale(0.8 0.6)" transform-origin="12 24" fill="url(#markerShadow)" />
     <use href="#pathMarker" fill="${fill}" stroke="${stroke}" />
     <path d="M12 9a1 1 0 000 6 1 1 0 000-6z" fill="${fillInner}" />
  </svg>`;

    return L.divIcon({
        html: svgHtml,
        className: "svg-marker",
        iconSize: size,
        iconAnchor: [size[0] * 0.5, size[1]]
    });
}
