import { getPolyBBox_arr, getPolygonArea_arr } from "./geometry_arr.js";

/**
 * Ramer Douglas Peucker
 * polygon simplification
 */

export function simplifyRDP(pts = [], sqTolerance = 0.01, normalizeDirection = false, bb={}) {
    if (pts.length <= 2) return pts;

    let protectBB = Object.keys(bb).length;
    //bb = protectBB ? getPolyBBox_arr(pts) : {};
    let { x=0, y=0, right=0, bottom=0 } = bb;

    /**
     * normalize southing
     * for predictable results
     * when simplifying 
     * identical vertical in reverse order
     */

    let l = pts.length;
    let idx1 = l - 1;

    let isSouth = normalizeDirection ? pts[0][1] < pts[l - 1][1] : false;
    if (isSouth) pts = pts.slice().reverse(); 

    let pts_simplified = [pts[0]];

    function step(idx0, idx1) {
        let maxSqDist = sqTolerance;
        let index = -1;
        let isExtreme = false;

        for (let i = idx0 + 1; i < idx1; i++) {
            let px = pts[i][0];
            let py = pts[i][1];

            // Check if point touches any bounding box extreme
            let touchesBB = !protectBB ? false : (px === x || px === right || py === y || py === bottom);

            if (touchesBB) {
                // Instantly prioritize extreme bounding box points
                index = i;
                isExtreme = true;
                break;
            }

            let sqDist = getSqSegDist(pts[i], pts[idx0], pts[idx1]);
            if (sqDist > maxSqDist) {
                index = i;
                maxSqDist = sqDist;
            }
        }

        if (index !== -1) {
            if (index - idx0 > 1) step(idx0, index);
            pts_simplified.push(pts[index]);
            if (idx1 - index > 1) step(index, idx1);
        }
    }

    step(0, idx1);
    pts_simplified.push(pts[idx1]);

    // reverse back
    if (isSouth) pts_simplified.reverse();
    return pts_simplified;
}


export function simplifyRDP__(pts = [], sqTolerance = 0.01, normalizeDirection = false) {
    if (pts.length <= 2) return pts;


    let bb = getPolyBBox_arr(pts);
    let {x, y, right, bottom} = bb;


    /**
     * normalize southing
     * for predictable results
     * when simplifying 
     * identical vertical in reverse order
     */

    let l = pts.length;
    let idx1 = l - 1;

    let isSouth = normalizeDirection ? pts[0][1] < pts[l-1][1] : false;
    if (isSouth) pts = pts.reverse();

    let pts_simplified = [pts[0]];

    function step(idx0, idx1) {
        let maxSqDist = sqTolerance;
        let index = -1;

        for (let i = idx0 + 1; i < idx1; i++) {
            let sqDist = getSqSegDist(pts[i], pts[idx0], pts[idx1]);
            if (sqDist > maxSqDist) {
                index = i;
                maxSqDist = sqDist;
            }
        }

        if (index !== -1) {
            if (index - idx0 > 1) step(idx0, index);
            pts_simplified.push(pts[index]);
            if (idx1 - index > 1) step(index, idx1);
        }
    }

    step(0, idx1);
    pts_simplified.push(pts[idx1]);

    // reverse back
    if (isSouth) pts_simplified.reverse();
    return pts_simplified;
}



export function getSqSegDist(p, p1, p2) {
    let [x, y] = p1;
    let [dx, dy] = [p2[0] - x, p2[1] - y];

    if (dx !== 0 || dy !== 0) {
        let t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
        if (t > 1) {
            x = p2[0]; y = p2[1];
        } else if (t > 0) {
            x += dx * t; y += dy * t;
        }
    }
    dx = p[0] - x;
    dy = p[1] - y;
    return dx * dx + dy * dy;
}




/*
// Collects and returns points that CAN be removed using Ramer-Douglas-Peucker
export function getRDP_removalCandidates(pts, sqTolerance = 1) {
    if (!pts || pts.length <= 2) return [];

    let last = pts.length - 1;
    let candidates = [];

    findRemovalCandidates(pts, 0, last, sqTolerance, candidates);

    return candidates;
}

function findRemovalCandidates(pts, idx0, last, sqTolerance, candidates) {
    let maxSqDist = sqTolerance;
    let index;

    // Find the point with the maximum distance from the segment [pts[idx0], pts[last]]
    for (let i = idx0 + 1; i < last; i++) {
        let sqDist = getSqSegDist(pts[i], pts[idx0], pts[last]);

        if (sqDist > maxSqDist) {
            index = i;
            maxSqDist = sqDist;
        }
    }

    // If max distance exceeds tolerance, this sub-segment needs further splitting
    if (maxSqDist > sqTolerance) {
        if (index - idx0 > 1) {
            findRemovalCandidates(pts, idx0, index, sqTolerance, candidates);
        }
        if (last - index > 1) {
            findRemovalCandidates(pts, index, last, sqTolerance, candidates);
        }
    } else {
        // All intermediate points in this range fall within tolerance, so mark them for removal
        for (let i = idx0 + 1; i < last; i++) {
            candidates.push(pts[i]);
        }
    }
}

// Square distance from a point to a line segment
function getSqSegDist(p, p1, p2) {
    let x = p1[0];
    let y = p1[1];
    let dx = p2[0] - x;
    let dy = p2[1] - y;

    if (dx !== 0 || dy !== 0) {
        let t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);

        if (t > 1) {
            x = p2[0];
            y = p2[1];
        } else if (t > 0) {
            x += dx * t;
            y += dy * t;
        }
    }

    dx = p[0] - x;
    dy = p[1] - y;

    return dx * dx + dy * dy;
}
*/


export function getPtsAreas(pts = []) {

    let ptsA = [];
    let l = pts.length;
    let area0 = getPolygonArea_arr(pts);
    //console.log({area0});

    for (let i = 0; i < l; i++) {
        let ptPrev = pts[i - 1] ? pts[i - 1] : pts[l - 1];
        let pt = pts[i]
        let ptNext = pts[i + 1] ? pts[i + 1] : pts[0];
        //console.log(ptPrev, pt, ptNext);

        let area = getPolygonArea_arr([ptPrev, pt, ptNext], true);
        ptsA.push({
            x: pt[0],
            y: pt[1],
            area
        })
    }



    // get adjacent areas
    let range = 5;

    for (let i = 0; i < l; i++) {
        let idxNext = ptsA[i + range] ? i + range : range;
        let areaLocal = 0;

        let ptsL = [];
        for (let j = 0; j < idxNext; j++) {
            //areaLocal += ptsA[j].area
            ptsL.push([ptsA[j].x, ptsA[j].y])
        }

        //ptsA[i].areaLocal = areaLocal
        ptsA[i].areaLocal = getPolygonArea_arr(ptsL, true)
    }


    // find small areas
    for (let i = 0; i < l; i++) {
        let pt = ptsA[i];
        let { area, areaLocal } = pt;
        let ratio = area / areaLocal
        //let ratio = areaLocal / area0
        ptsA[i].ratio = ratio
    }


    // try to simplify
    let ptsS = [];
    let thresh = 0.0005

    for (let i = 0; i < l; i++) {

        let pt = ptsA[i];
        let { area, areaLocal, ratio } = pt;

        if(ratio>thresh || !area){
            ptsS.push(pt)
        }

        /*
        if(ratio<=thresh ){
            ptsS.push(pt)
        }
        */


    }


    console.log({ptsA, ptsS});

    return ptsS
    return ptsA

}




export function rdpSimplify_seq(pts = [], sqTolerance = 0.01, reverse = false) {

    let idxM = Math.floor(pts.length / 2)
    let chunk1 = pts.slice(0, idxM + 1)
    let chunk2 = pts.slice(idxM)
    let chunks = [chunk1, chunk2];

    let ptsS = [];
    chunks.forEach(chunk => {
        let s = rdpSimplify(chunk, sqTolerance);
        ptsS.push(...s)
    })

    //console.log({ptsS});
    //return pts
    return ptsS

}
