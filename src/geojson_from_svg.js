import { projectPoint } from "./geometry_geo.js";
import { parsePathDataNormalized, splitSubpaths } from "./pathdata_parse.js";


export function svg2GeoJson(svg = null, { lonMin = 0, latMin = 0, lonMax = 0, latMax = 0, projection, decimals = 5, stringify = false } = {}) {

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

        //console.log('calculate from polys', { metaData });

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