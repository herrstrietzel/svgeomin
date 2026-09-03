import { nominatimGeoSearch, nominatimGeoSearchReverse } from "../../dist/svgeomin_geosearch.esm.js";


let inpAddress = document.getElementById('inpAddress');
let inpLon = document.getElementById('inpLon');
let inpLat = document.getElementById('inpLat');
let inpZoom = document.getElementById('inpZoom');
let inpReverse = document.getElementById('inpReverse');
let inpRenderGeoJson = document.getElementById('inpRenderGeoJson');
let textareaGeojsonResult = document.getElementById('textareaGeojsonResult');
let textareaGeoJson = document.getElementById('textareaGeoJson');



let cacheName = 'nominatim_geosearch';
let queryCache = { address: {}, coords: {} }
let queryCacheLocal = null;

try {
    queryCacheLocal = localStorage.getItem(cacheName);
    if (queryCacheLocal) {
        queryCacheLocal = JSON.parse(queryCacheLocal)
    }
} catch {
    console.warn('no cache');
}
if (queryCacheLocal) queryCache = queryCacheLocal;

// autofill data list
let geoSearches = document.getElementById('geoSearches');
if (Object.keys(queryCache.address)) {
    let items = queryCache.address;

    let dataList = ''
    for (let add in items) {
        let addN = add.split('_').map(val => {
            let valN = val;
            if (isNaN(val)) {
                valN = val.substring(0, 1).toUpperCase() + val.substring(1)
            }
            return valN
        }).join(' ');

        dataList += `<option value="${addN}">${addN}</option>`
    }
    geoSearches.innerHTML = dataList;
}




// init leaflet map
let lon = 10.0013165;
let lat = 53.5501721;
let zoom = +inpZoom.value;

// init
let leafletMap = initMap(lon, lat, zoom);
// add listeners
listenToGeoUpdates();


async function listenToGeoUpdates() {


    // sync zoom
    inpZoom.addEventListener('change', (e) => {
        leafletMap.map.setZoom(+inpZoom.value)
    })

    leafletMap.map.on('zoomend', (e) => {
        zoom = e.target._zoom
        inpZoom.value = zoom
        //let numField = inpZoom.closest('.input-wrap').querySelector('.input-number')
        //if (numField) numField.value = zoom;
        inpZoom.dispatchEvent(new Event('input'));
        //console.log(e.target._zoom);
    });


    // render geoJSON
    textareaGeoJson.addEventListener('change', (e) => {
        updateGeoJsonRendering(leafletMap)
    })

    inpRenderGeoJson.addEventListener('input', (e) => {
        updateGeoJsonRendering(leafletMap)
    })

    // get lon/lat from address
    inpAddress.addEventListener('change', async (e) => {
        let query = inpAddress.value;
        let geoData = await resolveGeoSearch({ query });

        updateGeoInputsAndMap(geoData);
    })

    let inputsLonLat = [inpLon, inpLat];
    inputsLonLat.forEach(inp => {
        inp.addEventListener('change', async (e) => {

            // force complete input
            if (inpLon.value === '' || inpLat.value === '') {
                console.warn('lon or lat missing');
                return;
            }

            let [lonInp, latInp] = [+inpLon.value, +inpLat.value]
            let valid = lonInp >= -180 && lonInp <= 180 && latInp >= -90 && latInp <= 90;
            if (!valid) {
                console.warn('invalid lon lat');
                return;
            }

            let reverse = inpReverse.checked;
            let geoData = await resolveGeoSearch({ lon: lonInp, lat: latInp, reverse })

            // zoom out
            if (reverse && geoData.addressStr === undefined) {
                leafletMap.map.setZoom(1);
            }

            // update inputs
            updateGeoInputsAndMap(geoData);

        })

    })



}

function updateGeoJsonRendering(leafletMap) {

    // reset
    removeGeoJson(leafletMap);

    // add
    if (inpRenderGeoJson.checked) {
        console.log('render');
        let polygonGeoJSON = textareaGeoJson.value.trim();
        if (geojson) {
            try {
                polygonGeoJSON = JSON.parse(polygonGeoJSON);
                setGeoJson(leafletMap, polygonGeoJSON, { style: { color: "red", fillOpacity: 0.4 } }, true);

            } catch {
                console.warn('could not parse');
            }
        }
    }
    // remove
    else {
        //console.log('remove');
        removeGeoJson(leafletMap);
    }
}




function updateGeoInputsAndMap(geoData = {}) {

    if (!Object.keys(geoData).length) return

    let { lon, lat, addressStr = '' } = geoData;

    // update inputs
    if (addressStr) inpAddress.value = addressStr;
    inpLon.value = +lon;
    inpLat.value = +lat;
    textareaGeojsonResult.value = JSON.stringify(geoData, null, ' ');

    // update map view
    updateMap(leafletMap, lon, lat)

}


async function resolveGeoSearch({ query = '', lon = '', lat = '', reverse = false } = {}) {

    //let reverse = query === '' && lat && lon;
    // just return coordinates to show on map
    if (!reverse && !query) {
        return { lon, lat }
    }

    let prop = reverse ? 'coords' : 'address';
    let geoData = {}
    let queryKey = reverse ? [lon, lat].map(Number).join('_') : getQueryKey(query);
    //console.log({query});

    let isCached = queryCache[prop][queryKey] !== undefined;
    let isValid = false;

    // is cached
    if (isCached) {
        console.warn('is cached', queryCache);
        geoData = queryCache[prop][queryKey]
        if (geoData.lon && geoData.lat) {
            isValid = true;
        }
    } else {
        console.warn('not cached', queryCache);
        let geoDataAPI = reverse ?
            await nominatimGeoSearchReverse(lon, lat) :
            await nominatimGeoSearch(query);

        if (geoDataAPI.error) {
            console.warn('could not decode');
            return { lon, lat }
        }

        if ((reverse && geoData.addressStr === undefined) ||
            (geoDataAPI.lon !== undefined && geoDataAPI.lat !== undefined)) {
            isValid = true;
            geoData = geoDataAPI
        }
    }

    if (!isCached) {
        queryCache[prop][queryKey] = geoData;
        localStorage.setItem(cacheName, JSON.stringify(queryCache))
    }

    console.log({ geoData });
    return geoData
}


function getQueryKey(query = '') {
    query = query.trim();
    if (!query) return '';
    let queryKey = query.toLowerCase().split(/[,| ]/).filter(Boolean).join('_')
    return queryKey;
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

    L.control.scale().addTo(map);
    //let marker = L.marker([lat, lon]).addTo(map);

    let marker = L.marker([lat, lon], {
        icon: getSVGMarker(
            {
                fill: "#136c5e",
                fillInner: "white",
                size: [48, 48]
            })
    }).addTo(map);


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


/**
 * Add or update a GeoJSON feature/featureCollection on the map
 * Handles Polygon, MultiPolygon, and feature collections seamlessly.
 */
function setGeoJson(leafletMap, geoJsonData, options = {}, fitBounds = false) {
    // 1. Remove existing layer if one is already present
    removeGeoJson(leafletMap);

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
        leafletMap.map.fitBounds(newLayer.getBounds());
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
