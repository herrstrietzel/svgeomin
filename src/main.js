import { projectPointArr } from './geometry_geo.js';
import { multiPolyToRelativePathData, serializePathData } from './pathData_from_multipoly.js';
import { removeCollinearPoints } from './simplifyRC_poly.js'
import { getPolygonArea_arr, getPolyBBox_arr, getDistManhattan_arr, getSphericalArea } from './geometry_arr.js';
import { removeZeroLength } from './simplifyZero.js';
import { getPolyChunks } from './analyze_get_poly_group_chunks.js';
import { simplifyPolyGroups } from './simplifyTopology.js';
import { filterGeoData } from './geojson_filter.js';
import { getMarkerSVGMarkup } from './render_svg_markers.js';


// object for chainable methods
export function SVGEO(props = {}) {
    Object.assign(this, props)
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

    // autoscale tiny features
    //autoScale = true,

    // coordinate rounding: integers are best!
    decimals = 0,
    // threshold for RDP simplification in km
    simplify = 0,

    // remove small feautes e.g islands or exclaves by km² threshold
    minArea = 0,

    // create path el for each sub poly e.g islands
    split = 0,

    // add meta for original geodata reference
    meta = 1,

    // CSS prefix
    classPre = 'svgmin',

    projection = 'mercator',


    // add map markers
    markers=[],

    // append CSS
    css='',

    // main svg inline css
    cssInline=''

} = {}) {


    // translate API simplify tolerance to square distance
    if (simplify) {
        simplify = simplify * (1 / 11100)
        //console.log({ simplify });
    }

    // parse and filter geodata
    geoData = await filterGeoData(geoData, { features, properties, exclude });

    // normalize projection type to lowercase
    projection = projection.toLowerCase();

    // for approximated area calc
    let maxPts = 96

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
        let areas = [];
        let position = {};
        let { bbox = [], geometry, properties } = item;
        let { coordinates } = geometry;
        let type = geometry.type

        //console.log({left, top});

        // main land area
        for (let sub of coordinates) {
            // normalize complex poly nesting
            let pts = type === 'MultiPolygon' ? sub[0] : sub;

            // get sloppy area approximation
            let area = minArea ? getSphericalArea(pts, true, maxPts) : 0
            areas.push(area);


            /**
             * warp around eastern regions
             * < lon 178
             * e.g russia
             */
            let autoWrap = geoFeatures.length == 1 && bbox[0] < 0 && bbox[2] > 0;

            if (autoWrap) {
                //console.log('shift', lonShift);
                pts.forEach((pt) => {
                    if (pt[0] < 0) pt[0] += 360
                })
            }

            // add poly
            polys.push(pts);

        }

        featureArr.push({
            properties,
            position,
            areas,
            bboxes: [],
            polys
        })

    }

    /**
     * add bboxes
     * detect tiny feautures
     */

    /*
    let tinyFeatures = {
        groups: new Set([]),
        polys: new Set([]),
        min: new Set([])
    };
    */

    for (let i = 0, l = featureArr.length; i < l; i++) {
        let path = featureArr[i];
        let { polys } = path;
        path.tinyPolys = [];

        for (let j = 0, k = polys.length; j < k; j++) {
            let poly = polys[j];
            let bb = getPolyBBox_arr(poly)

            // autoscale
            let [w, h] = [bb.width * scale, bb.height * scale];
            let minDim = Math.min(w, h)
            //console.log({w,h, simplify});

            //let isTiny = false

            if (minDim < scale * 0.01) {
                /*
                tinyFeatures.groups.add(i)
                tinyFeatures.polys.add(j)
                tinyFeatures.min.add(minDim)
                */
                path.tinyPolys.push(j)
                // increase accuracy
                if (featureArr.length === 1) decimals = 3
            }

            // add for bbox calc
            lonArr.push(bb.x, bb.right)
            latArr.push(bb.y, bb.bottom)

            // add bbox
            path.bboxes.push(bb)

        }
    }




    /**
     * remove small regions
     * like islands or enclaves
     * calculate accurate bbox
     */

    if (minArea || simplify) {

        // reset lon lat for new bbox excluding islands
        lonArr = [];
        latArr = [];

        let featureArrFilter = [];


        /**
         * auto scale
         */


        for (let i = 0, l = featureArr.length; i < l; i++) {
            let path = featureArr[i];
            let { polys, areas, bboxes, isTiny } = path;

            isTiny = featureArr.length === 1 ? isTiny : false;

            let area0 = Math.max(...path.areas);
            let idx = path.areas.findIndex(area => area === area0);

            // get bbox of largest landmass
            //let bb0 = getPolyBBox_arr(path.polys[idx])
            let bb0 = bboxes[idx];
            let mid0 = [bb0.x + bb0.width * 0.5, bb0.y + bb0.height * 0.5]

            // distance threshold
            let thresh = (bb0.width + bb0.height) * 2

            //let pathN = JSON.parse(JSON.stringify(path));
            let pathN = path;
            let bboxesN = [];
            let areasN = [];
            let polysN = []

            for (let j = 0, k = polys.length; j < k; j++) {
                let area = areas[j]
                //let ratio = area / area0 * 100
                let poly = polys[j];

                /**
                 * get distance from main land mass
                 * remove if too far away or too small
                 */
                let bb = bboxes[j]

                if (minArea) {

                    let mid = [bb.x + bb.width * 0.5, bb.y + bb.height * 0.5];
                    let distMan = getDistManhattan_arr(mid0, mid);
                    //console.log({distMan});

                    // ignore small or far away
                    //
                    if (!isTiny && area < minArea || distMan > thresh) {
                        continue
                    }
                }

                // update lon/lat arrays for svg viewBox
                areasN.push(area)
                bboxesN.push(bb)
                lonArr.push(bb.x, bb.right)
                latArr.push(bb.y, bb.bottom)

                // add to filtered
                polysN.push(poly)

            }

            pathN.areas = areasN;
            pathN.polys = polysN;
            pathN.bboxes = bboxesN
            featureArrFilter.push(pathN)
        }

        featureArr = featureArrFilter

    }

    //console.log({featureArr});


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
     * reorder top left to bottom right
     */
    //featureArr = featureArr.sort((a, b) => a.position.top - b.position.top || a.position.left - b.position.left);


    /**
     * get final bbox/viewBox
     */
    lonArr = lonArr.filter(lon => lon !== Infinity && lon !== -Infinity && lon !== -null);
    latArr = latArr.filter(lat => lat !== Infinity && lat !== -Infinity && lat !== -null);

    let lonMin = Math.min(...lonArr);
    let lonMax = Math.max(...lonArr);
    let latMin = Math.min(...latArr);
    let latMax = Math.max(...latArr);


    //console.log({lonArr, latArr});

    // get ultimate SVG bbox in mercator projection
    //let ptsBBMercator = projectPointArr([[lonMin, latMin], [lonMax, latMax]], projection, scale, decimals);

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
    let decimalsMax = 3;


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

            //let isTiny = feature.tinyPolys.includes(p);
            //let decimalsLocal = !isTiny ? decimals : decimalsMax
            //decimalsMax = decimalsLocal>decimalsMax ? decimalsLocal : decimalsMax;
            //decimalsMax = 5;

            // mercator projection
            poly = projectPointArr(poly, projection, scale, decimals);

            // remove zero length
            poly = removeZeroLength(poly);

            // remove colinear
            polys[p] = removeCollinearPoints(poly);

            //console.log(JSON.parse(JSON.stringify(poly)));

            // ignore short
            if (poly.length < 3) continue

            polysFilter.push(poly)

        }

        //console.log({polysFilter});
        if (!polysFilter.length) continue;

        // convert to pathData
        let { pathData, pathDataArr } = multiPolyToRelativePathData(polysFilter, {
            decimals,
        });
        //console.log({pathData});

        if (!pathData.length) continue;

        // separate path el for each sub path
        //split = true
        if (!split) pathDataArr = [pathData];

        //console.warn({x, y});

        let groupMarkup = [];

        /**
         * add selected properties
         * as data attributes
         */
        let attArr = [];

        let classAttPre = [classPre, 'feature'].filter(Boolean).join('-');
        let classAtts = [classAttPre];
        for (let prop in properties) {
            if (atts.has(prop)) {
                attArr.push(`data-${prop}="${properties[prop]}"`)
                classAtts.push(`${classAttPre}-${properties[prop]}`)
            }
        }


        pathDataArr.forEach((pathData, i) => {

            let offX = pathData[0].values[0] - x;
            let offY = pathData[0].values[1] - y;

            offsetsX.push(offX);
            offsetsY.push(offY);

            pathData[0].values[0] = +offX.toFixed(decimals);
            pathData[0].values[1] = +offY.toFixed(decimals);

            let d = serializePathData(pathData);
            let classAtt = classAtts.length ? `class="${classAtts.join(' ')}"` : ''

            let pathMarkup = split ? `<path d="${d}" />` : `<path ${classAtt} ${attArr.join(' ')} d="${d}" />`;

            groupMarkup.push({ atts: attArr.join(' '), classAtt, path: pathMarkup })

        })

        svgMarkup.push(groupMarkup);

    }

    let bb = { x: 0, y: 0, width: right - x, height: bottom - y }
    for (let key in bb) {
        bb[key] = +bb[key].toFixed(decimalsMax)
    }

    let svgFeatures = ''
    svgMarkup.forEach(g => {
        if (g.length > 1) {
            svgFeatures += `<g ${g[0].classAtt} ${g[0].atts} >${g.map(p => p.path).join('')}</g>`
        } else {
            svgFeatures += `${g[0].path}`
        }
    })


    /**
     * build self contained
     * svg markup
     */

    // add meta data
    //.replaceAll('"', '&quot;')
    let dataSvgGeo = JSON.stringify({ bb, x, y, scale, projection, lonMin, latMin, lonMax, latMax });
    let metaAtt = meta ? ` data-svgeo='${dataSvgGeo}'` : '';


    /**
     * add SVG markers
     * project and align
     */
    let markupMarker='';
    if(markers.length){
        //console.log({markers});
        let markerSVG = getMarkerSVGMarkup(markers, {projection, scale, x, y, decimals, classPre});
        markupMarker +=markerSVG;
    }

    let cssEl = css ? `<style>${css}</style>` : '';
    let styleAtt = cssInline ? ` style="${cssInline}"` : '';

    let svg = svgFeatures ?
        `<svg viewBox="${[bb.x, bb.y, bb.width, bb.height].join(' ')}" ${styleAtt}${metaAtt}>${cssEl}<g class="${[classPre, 'features'].filter(Boolean).join('-')}">${svgFeatures}</g>${markupMarker}</svg>` :
        '';

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


