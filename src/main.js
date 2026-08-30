import { projectPointArr } from './geometry_geo.js';
import { multiPolyToRelativePathData, serializePathData } from './pathData_from_multipoly.js';
import { removeCollinearPoints } from './simplifyRC_poly.js'
import { getPolygonArea_arr, getPolyBBox_arr, getDistManhattan_arr } from './geometry_arr.js';
import { removeZeroLength } from './simplifyZero.js';
import { getPolyChunks } from './analyze_get_poly_group_chunks.js';
import { simplifyPolyGroups } from './simplifyTopology.js';
import { filterGeoData } from './geojson_filter.js';



// object for chainable methods
export function SVGEO(props = {}) {
    Object.assign(this, props)
}



SVGEO.prototype.getGeoJson = function ({ decimals = -1, name = 'svgeomin', properties=[] } = {}) {
    let geogeoData = {
        type: "FeatureCollection",
        name,
        features: [],
    }

    //let featuresFiltered = this.featureArr;
    let propertiesFiltered = properties;
    //console.log({featuresNew});

    for (let feature of this.featureArr) {
        let { properties, polys } = feature
        //console.log(properties, polys);

        let type = polys.length > 1 ? "MultiPolygon" : "Polygon";

        //round
        if (decimals > -1) {
            polys = polys.map(poly => poly.map(pt => pt.map(val => +val.toFixed(decimals))))
        }

        let polysN = type === 'MultiPolygon' ? polys.map(poly => [poly]) : polys;

        //console.log({type, polysN});

        let propertiesN = {}
        for(let prop in properties){
            if(propertiesFiltered.length && propertiesFiltered.includes(prop)){
                propertiesN[prop] = properties[prop]
            }
        }

        let featureN = {
            type: 'Feature',
            properties:propertiesN,
            geometry: {
                type,
                coordinates:
                    polysN
            }
        }
        geogeoData.features.push(featureN)
    }



    return geogeoData

}




export async function svgFromGeo(geoData = {}, {
    // features to filter
    features = [],
    // properties to include in SVG
    properties = [],
    // exclude property values
    exclude = [],
    // scale to reasonable coordinate space
    scale = 10000,
    // rounding: integers are best!
    decimals = 0,
    // square distance threshold for RDP simplification
    simplify = 0,
    // remove small islands or enclaves
    removeIslands = 0,
    wrapEast = 0,
    projection = 'mercator'
} = {}) {



    // parse and filter geodata
    geoData = await filterGeoData(geoData, {features, properties, exclude});

    // normalize projection type to lowercase
    projection = projection.toLowerCase();

    // for approximated area calc
    let maxPts = 0

    let geoFeatures = geoData.features

    // properties for data atts
    let atts = properties.length ? new Set(properties.slice().map(val => val.toLowerCase())) : new Set([]);


    // all country paths
    let featureArr = [];

    /**
     * collect lon/lat boundaries for 
     * marker placements and conversions
     */
    let lonArr = [];
    let latArr = [];


    for (let item of geoFeatures) {

        let polys = [];
        let position = {};
        let { bbox = [], geometry, properties } = item;
        let { coordinates } = geometry;
        let type = geometry.type


        //bbox = [];
        if (!bbox.length) {
            let coordsFlat = coordinates.flat(3)
            let lonArr = coordsFlat.filter((val, i) => i % 2 === 0)
            let latArr = coordsFlat.filter((val, i) => i % 2 !== 0)
            bbox = [Math.min(...lonArr), Math.min(...latArr), Math.max(...lonArr), Math.max(...latArr)]
            //console.log('manual', bbox, lonArr);
        }

        //console.log(item);

        let [lonMin, latMin, lonMax, latMax] = bbox;
        lonArr.push(lonMin, lonMax);
        latArr.push(latMin, latMax);

        /**
         * projected Mercator 
         * bbox for svg viewBox
         */
        let bbM = projectPointArr([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], projection, scale, decimals);

        // poly get position for reordering
        let left = Math.min(bbM[0][0], bbM[1][0])
        let top = Math.min(bbM[0][1], bbM[1][1])
        position = { top, left }
        let areas = [];

        //console.log({left, top});

        // main land area
        for (let sub of coordinates) {
            // normalize complex poly nesting
            let pts = type === 'MultiPolygon' ? sub[0] : sub;

            // get area
            let area = removeIslands ? getPolygonArea_arr(pts, true, maxPts) : 0
            areas.push(area);


            /**
             * warp around eastern regions
             * < lon 178
             * e.g russia
             */
            /*
            if (wrapEast) {
                if (pts[0][0] < wrapEast) {
                    pts.forEach(pt => {
                        pt[0] += 360
                    })
                }
            }
            */

            // add poly
            polys.push(pts);

        }

        featureArr.push({
            properties,
            position,
            areas,
            polys
        })

    }


    /**
     * simplify topology
     * find shared/adjacent poly segments 
     * and slice to polygon chunks
     */

    if (simplify) {

        // analyze polys to find chunks for shared arcs
        let polyChunks = getPolyChunks(featureArr);
        //console.log(polyChunks);

        // apply RDP simplification
        let normalizeDirection = false;
        let protectBB = true;

        featureArr = simplifyPolyGroups(featureArr, polyChunks, simplify, normalizeDirection, protectBB);


        //console.log({featureArr});

    }



    /**
     * remove small regions
     * like islands or enclaves
     * calculate accurate bbox
     */

    if (removeIslands || simplify || wrapEast) {

        let featureArrFilter = [];

        // reset lon lat for accurate bbox
        lonArr = [];
        latArr = [];

        for (let i = 0, l = featureArr.length; i < l; i++) {
            let path = featureArr[i];
            let { polys, areas } = path;

            let area0 = Math.max(...path.areas);
            let idx = path.areas.findIndex(area => area === area0);

            // get bbox of largest landmass
            let bb0 = getPolyBBox_arr(path.polys[idx])
            let mid0 = [bb0.x + bb0.width * 0.5, bb0.y + bb0.height * 0.5]
            let thresh = (bb0.width + bb0.height) * 2

            // add for bbox calc
            lonArr.push(bb0.x, bb0.right)
            latArr.push(bb0.y, bb0.bottom)

            let pathN = JSON.parse(JSON.stringify(path));
            let polysN = []

            for (let j = 0, k = polys.length; j < k; j++) {
                let area = areas[j]
                let ratio = area / area0 * 100
                let poly = polys[j];

                /**
                 * get distance from main land mass
                 * remove if too far away or too small
                 */
                let bb = getPolyBBox_arr(poly)

                if (removeIslands) {

                    let mid = [bb.x + bb.width * 0.5, bb.y + bb.height * 0.5];
                    let distMan = getDistManhattan_arr(mid0, mid);
                    //console.log({distMan});

                    // ignore small or far away
                    if (ratio < removeIslands || distMan > thresh) {
                        continue
                    }
                }

                // add to accurate bbox
                lonArr.push(bb.x, bb.right)
                latArr.push(bb.y, bb.bottom)

                // add to filtered
                polysN.push(poly)

            }
            pathN.polys = polysN;
            featureArrFilter.push(pathN)
            //console.log('polysN', polysN.length);
        }

        featureArr = featureArrFilter

    }



    /**
     * reorder top left to bottom right
     */
    featureArr = featureArr.sort((a, b) => a.position.top - b.position.top || a.position.left - b.position.left);


    /**
     * get final bbox/viewBox
     */
    lonArr = lonArr.filter(lon => lon !== Infinity && lon !== -Infinity && lon !== -null);
    latArr = latArr.filter(lat => lat !== Infinity && lat !== -Infinity && lat !== -null);

    let lonMin = Math.min(...lonArr);
    let lonMax = Math.max(...lonArr);
    let latMin = Math.min(...latArr);
    let latMax = Math.max(...latArr);
    //console.log({lonArr});

    // get ultimate SVG bbox in mercator projection
    let ptsBBMercator = projectPointArr([[lonMin, latMin], [lonMax, latMax]], projection, scale, decimals);
    let xArrM = [ptsBBMercator[0][0], ptsBBMercator[1][0]];
    let yArrM = [ptsBBMercator[0][1], ptsBBMercator[1][1]];

    let x = Math.min(...xArrM);
    let right = Math.max(...xArrM);
    let y = Math.min(...yArrM);
    let bottom = Math.max(...yArrM);

    let offsetsX = [];
    let offsetsY = [];
    let svgMarkup = [];

    //console.log({featureArr});
    for (let i = 0, l = featureArr.length; i < l; i++) {

        let feature = featureArr[i];
        let { polys, properties = [] } = feature;

        /**
         * convert to 
         * SVG mercator coordinates
         */
        let polysFilter = []
        polys = JSON.parse(JSON.stringify(polys));

        for (let p = 0, k = polys.length; p < k; p++) {
            let poly = polys[p];

            // ignore short
            if (poly.length < 3) continue

            // mercator projection
            poly = projectPointArr(poly, projection, scale, decimals);

            // remove zero length
            poly = removeZeroLength(poly);

            // remove colinear
            polys[p] = removeCollinearPoints(poly);

            // ignore short
            if (poly.length < 3) continue

            polysFilter.push(poly)

        }

        //console.log({polysFilter});


        // convert to pathData
        let pathData = multiPolyToRelativePathData(polysFilter, decimals);
        //console.log({pathData});

        if (!pathData.length) continue;

        let offX = pathData[0].values[0] - x;
        let offY = pathData[0].values[1] - y;

        offsetsX.push(offX);
        offsetsY.push(offY);

        pathData[0].values[0] = offX;
        pathData[0].values[1] = offY;

        /**
         * add selected properties
         * as data attributes
         */
        let attArr = [];

        for (let prop in properties) {
            if (atts.has(prop)) {
                attArr.push(`data-${prop}="${properties[prop]}"`)
            }
        }

        let d = serializePathData(pathData);
        svgMarkup.push(`<path ${attArr.join(' ')} d="${d}" />`);
    }

    let bb = { x: 0, y: 0, width: right - x, height: bottom - y }

    //console.log(offsetsX, offsetsY);
    svgMarkup = svgMarkup.join('');

    /**
     * build self contained
     * svg markup
     */

    let dataSvgGeo = JSON.stringify({ bb, x, y, scale, projection }).replaceAll('"', '&quot;');

    let svg =
        `<svg viewBox="${[bb.x, bb.y, bb.width, bb.height].join(' ')}" data-svgeo="${dataSvgGeo}">
        ${svgMarkup}
    </svg>`;

    // SVG markup size in KB
    let size = +(svg.length / 1024).toFixed(2);

    return new SVGEO({
        svg, bb, x, y, bbGeo: [lonMin, lonMax, latMin, latMax], size, scale, featureArr
    })

}



// convert property names to lower case
function sanitizeName(name) {
    return name && isNaN(name) ? name.split(/ |\(|\|\)|\.|\:/).filter(Boolean).join('-').toLowerCase() : name;
}


