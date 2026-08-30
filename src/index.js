import {svgFromGeo} from './main.js';
import {filterGeoData} from './geojson_filter.js';
export {filterGeoData as filterGeoData};
export {svgFromGeo as svgFromGeo};


if (typeof window !== 'undefined') {
    window.svgFromGeo = svgFromGeo;
    window.filterGeoData = filterGeoData;
}
