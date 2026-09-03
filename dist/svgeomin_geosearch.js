(function (exports) {
    'use strict';

    async function nominatimGeoSearch(query = "", {
        properties = ['lon', 'lat', 'boundingbox', 'addresstype']
    } = {}) {

        // sanitize
        let querySan = query.trim() ? encodeURIComponent(query) : '';
        if (!querySan) return;
        let apiUrl = `https://nominatim.openstreetmap.org/search?q=${querySan}&format=json`;

        let data = {};
        let geoData = {};
        let res = await fetch(apiUrl);
        if (res.ok) {
            data = await res.json();

            // filter output
            if (properties.length) {
                properties.forEach(prop => {
                    geoData[prop] = data[0][prop];
                });
            }else {
                geoData = data;
            }
        }
        return geoData;
    }

    async function nominatimGeoSearchReverse(lon = '', lat = '', {
        properties = ['lon', 'lat', 'boundingbox', 'addresstype', 'address']
    } = {}) {

        let apiURL = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
        let data = {};
        let geoData = {};
        let res = await fetch(apiURL);
        if (res.ok) {
            data = await res.json();

            // no data
            if (data.address === undefined) return data;

            // filter output
            if (properties.length) {
                properties.forEach(prop => {
                    geoData[prop] = data[prop];
                });
            }else {
                geoData = data;
            }

            // add address string
            let { address = {} } = geoData;
            let { road, house_number, city, postcode } = address;
            let addressStr = [[road, house_number].join(' '), [postcode, city].join(' ')].join(', ');
            geoData.addressStr = addressStr;

        }

        return geoData
    }

    if (typeof window !== 'undefined') {
        window.nominatimGeoSearch = nominatimGeoSearch;
        window.nominatimGeoSearchReverse = nominatimGeoSearchReverse;
    }

    exports.nominatimGeoSearch = nominatimGeoSearch;
    exports.nominatimGeoSearchReverse = nominatimGeoSearchReverse;

})(this.svgeomin = this.svgeomin || {});
