import {nominatimGeoSearch, nominatimGeoSearchReverse} from './geosearch_nominatim.js';
export {nominatimGeoSearch as nominatimGeoSearch};
export {nominatimGeoSearchReverse as nominatimGeoSearchReverse};


if (typeof window !== 'undefined') {
    window.nominatimGeoSearch = nominatimGeoSearch;
    window.nominatimGeoSearchReverse = nominatimGeoSearchReverse;
}
