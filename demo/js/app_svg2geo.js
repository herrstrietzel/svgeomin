import { svgFromGeo, svg2GeoJson } from "../../dist/svgeomin.esm.js";


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
    //console.log(JSON.stringify(geoJson));


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
