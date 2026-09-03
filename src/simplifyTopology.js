//import { getPolyBBox_arr } from "./geometry_arr.js";
//import { polyPtsToArray, toPointArray } from "./poly_normalize.js";
import { simplifyRDP } from "./simplifyRDP.js";
import { unitePolygonPts } from "./simplify_unite_polygon.js";

export function simplifyPolyGroups(groups = [], chunkData = {}, sqTolerance = 0.1, normalizeDirection = false, protectBB = true) {

    /**
     * Includes signature in key to distinguish between 
     * shared borders vs outer unshared boundaries between the same 2 vertices
     */
    const getArcCacheKey = (chunk, signature) => {
        let start = `${chunk[0][0]},${chunk[0][1]}`;
        let end = `${chunk[chunk.length - 1][0]},${chunk[chunk.length - 1][1]}`;
        let endpoints = start < end ? `${start}|${end}` : `${end}|${start}`;
        return `${endpoints}::${signature}`;
    };

    let arcCache = new Map();

    // Deep clone original group structure safely
    let updatedGroups = groups.map(g => ({
        ...g,
        polys: g.polys.map(p => [...p])
    }));


    for (let key in chunkData) {
        let [groupIdx, polyIdx] = key.split('_').map(Number);
        let { chunks, chunkSignatures } = chunkData[key];

        let fullPoly = [];

        chunks.forEach((chunk, idx) => {
            let signature = chunkSignatures[idx];
            let cacheKey = getArcCacheKey(chunk, signature);
            let simplifiedChunk;

            if (arcCache.has(cacheKey)) {
                let cachedArc = arcCache.get(cacheKey);
                let firstPt = chunk[0];
                let cachedFirstPt = cachedArc[0];

                if (firstPt[0] === cachedFirstPt[0] && firstPt[1] === cachedFirstPt[1]) {
                    simplifiedChunk = cachedArc;
                } else {
                    simplifiedChunk = [...cachedArc].reverse();
                }
            } else {

                // Compute simplification once and store in cache
                let bb = protectBB ?
                    (groups[groupIdx]?.bboxes[polyIdx] || {})
                    : {};

                let item = groups[groupIdx];

                // skip RDP for tiny polygons
                if(item.tinyPolys.includes(polyIdx)){
                    simplifiedChunk = chunk;
                }else{
                    simplifiedChunk = simplifyRDP(chunk, sqTolerance, normalizeDirection, bb);
                }

                arcCache.set(cacheKey, simplifiedChunk);
            }

            // Omit last point of each chunk except the last chunk to avoid duplicate vertices at joints
            let ptsToAdd = (idx === chunks.length - 1)
                ? simplifiedChunk
                : simplifiedChunk.slice(0, -1);


            fullPoly.push(...ptsToAdd);
        });

        // sort to bottom most
        fullPoly = polyStartToBottomMost(fullPoly);
        //console.log({fullPoly});

        /**
         * unite self intersections
         * only for higher simplification thresholds
         */
        let unitePoly = sqTolerance > 0.001;
        unitePoly = false
        //console.log(unitePoly);
        if (unitePoly) {
            fullPoly = unitePolygonPts(fullPoly)
        }

        updatedGroups[groupIdx].polys[polyIdx] = fullPoly;
    }

    return updatedGroups;
}

/**
 * sort to bottom most in cartesian
 * conerted to top most in SVG
 */
export function polyStartToBottomMost(poly = []) {
    let len = poly.length;
    if (len < 3) return poly;

    let bottomIdx = 0;
    let maxY = 0;

    for (let i = 0; i < len; i++) {
        let [x, y] = poly[i];

        if (y > maxY) {
            maxY = y;
            bottomIdx = i;
        }
    }

    if (bottomIdx === 0) return poly;

    let polyN = [
        ...poly.slice(bottomIdx),
        ...poly.slice(0, bottomIdx)
    ];

    return polyN;
}





