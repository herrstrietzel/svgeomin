const degToRad = Math.PI / 180;
const radToDeg = 180/Math.PI;

// Shared rounding helper
function roundPt(pt, decimals = -1) {
  return decimals > -1 ? pt.map(val => +val.toFixed(decimals)) : pt;
}

function projectPointArr(coords, type = "mercator", scale = 1, decimals = -1, revert=false, x=0, y=0) {

  let len = coords.length;

  /**
  * get all projected points
  */
  let ptsP = [];
  for (let i = 0; i < len; i++) {
    let coord = coords[i];

    coord = projectPoint(...coord, type, scale, decimals, revert, x, y);

    ptsP.push(coord);

  }

  return ptsP;

}

/**
 * wrapper for
 * all different projection types
 */
function projectPoint(lon = 0, lat = 0, type = "mercator", scale = 1, decimals = -1, revert=false, x=0, y=0) {

  if (type === 'equirectangular' || type === 'plate carrée') {
    return equirectangularProject(lon, lat, scale, decimals, revert, x, y)
  }
  if (type === 'miller') {
    return millerProject(lon, lat, scale, decimals, revert, x, y)
  }
  if (type === 'behrmann') {
    return behrmannProject(lon, lat, scale, decimals, revert, x, y)
  }

  // default: web mercator
  return mercatorProject(lon, lat, scale, decimals, revert, x, y)

}

/**
 * Web Mercator Projection & Inversion
 */
function mercatorProject(lon = 0, lat = 0, scale = 1, decimals = -1, revert = false, x = 0, y = 0) {
  let m = 85.05112878;

  if (revert) {
    let normX = x/scale;
    let normY = y/scale;

    let lonDeg = normX * 360 - 180;
    let latRad = 2 * Math.atan(Math.exp(Math.PI - normY * 2 * Math.PI)) - Math.PI / 2;
    let latDeg = Math.max(-m, Math.min(m, latRad * radToDeg));

    return roundPt([lonDeg, latDeg], decimals);
  }

  let clampedLat = Math.max(-m, Math.min(m, lat));
  let pt = [
    ((lon * degToRad + Math.PI) / (2 * Math.PI)) * scale,
    ((Math.PI - Math.log(Math.tan(Math.PI / 4 + (clampedLat * degToRad) / 2))) / (2 * Math.PI)) * scale,
  ];

  return roundPt(pt, decimals);
}

/**
 * Equirectangular Projection & Inversion
 */
function equirectangularProject(lon = 0, lat = 0, scale = 1, decimals = -1, revert = false, x = 0, y = 0) {
  if (revert) {
    let lonDeg = (x / scale) * 360 - 180;
    let latDeg = 90 - (y / scale) * 180;

    let clampedLon = Math.max(-180, Math.min(180, lonDeg));
    let clampedLat = Math.max(-90, Math.min(90, latDeg));

    return roundPt([clampedLon, clampedLat], decimals);
  }

  let clampedLat = Math.max(-90, Math.min(90, lat));
  let clampedLon = Math.max(-180, Math.min(180, lon));

  let pt = [
    ((clampedLon + 180) / 360) * scale,
    ((90 - clampedLat) / 180) * scale,
  ];

  return roundPt(pt, decimals);
}

/**
 * Miller Cylindrical Projection & Inversion
 */
function millerProject(lon = 0, lat = 0, scale = 1, decimals = -1, revert = false, x = 0, y = 0) {
  let maxY = 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * (Math.PI / 2)));

  if (revert) {
    let normX = x / scale;
    let normY = y / scale;

    let lonDeg = normX * 360 - 180;
    let yVal = maxY - normY * (2 * maxY);

    // Inverse Miller latitude formula
    let latRad = (Math.atan(Math.exp(yVal / 1.25)) - Math.PI / 4) / 0.4;
    let latDeg = Math.max(-90, Math.min(90, latRad * radToDeg));

    return roundPt([lonDeg, latDeg], decimals);
  }

  let clampedLat = Math.max(-90, Math.min(90, lat));
  let latRad = clampedLat * degToRad;
  let yVal = 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * latRad));

  let pt = [
    ((lon * degToRad + Math.PI) / (2 * Math.PI)) * scale,
    ((maxY - yVal) / (2 * maxY)) * scale,
  ];

  return roundPt(pt, decimals);
}

/**
 * Behrmann Equal-Area Projection & Inversion
 */
function behrmannProject(lon = 0, lat = 0, scale = 1, decimals = -1, revert = false, x = 0, y = 0) {
  let k = 0.75;
  let maxYNorm = 1 / k;

  if (revert) {
    let normX = x / scale;
    let normY = y / scale;

    let lonRad = normX * (2 * Math.PI) - Math.PI;
    let yNorm = maxYNorm - normY * (2 * maxYNorm);

    // Inverse Behrmann latitude formula
    let sinLat = Math.max(-1, Math.min(1, yNorm * k));
    let latDeg = Math.asin(sinLat) * radToDeg;

    return roundPt([lonRad * radToDeg, latDeg], decimals);
  }

  let clampedLat = Math.max(-90, Math.min(90, lat));
  let latRad = clampedLat * degToRad;
  let xNorm = lon * degToRad;
  let yNorm = Math.sin(latRad) / k;

  let pt = [
    ((xNorm + Math.PI) / (2 * Math.PI)) * scale,
    ((maxYNorm - yNorm) / (2 * maxYNorm)) * scale,
  ];

  return roundPt(pt, decimals);
}

function multiPolyToRelativePathData(polys = [], {
    decimals = -1,
    toRelative = true,
    toShorthand = true
} = {}) {

    if (!polys.length) return [];

    let pathData = [];
    let x = 0;
    let y = 0;
    
    // separate sub paths
    let pathDataArr = [];
    // collect abssolute M start coordinates 
    let M_arr = [];

    for (let i = 0; i < polys.length; i++) {
        let pts = polys[i];

        // Skip invalid polygons (must have at least 3 points to form a shape)
        if (!pts || pts.length < 3) continue;

        // Start point of the current sub-polygon
        let M = pts[0];
        M_arr.push(M);

        // First M
        if (pathData.length === 0) {
            pathData.push({ type: 'M', values: [M[0], M[1]] });
        } else {
            // close path
            pathData.push({ type: 'z', values: [] });
            
            let [dx, dy] = [M[0] - x, M[1] - y];
            pathData.push({ type: 'm', values: [dx, dy] });
        }

        // Advance current pen position to M
        x = M[0];
        y = M[1];

        // Process remaining points in this sub-polygon
        for (let j = 1; j < pts.length; j++) {
            let pt = pts[j];
            let dx = pt[0] - x;
            let dy = pt[1] - y;

            // Skip duplicate points / zero-length movements
            if (dx === 0 && dy === 0) continue;

            let type = 'l';
            let values = [dx, dy];

            if (toShorthand) {
                if (dx === 0) {
                    type = 'v';
                    values = [dy];
                } else if (dy === 0) {
                    type = 'h';
                    values = [dx];
                }
            }

            pathData.push({ type, values });

            // Update pen position
            x = pt[0];
            y = pt[1];
        }

        // Update current pen position to sub-path origin after 'z'
        x = M[0];
        y = M[1];
    }

    // Close the final sub-polygon
    if (pathData.length > 0) {
        pathData.push({ type: 'z', values: [] });
    }

    // create sub path array
    let idx = -1;
    pathData.forEach((com,i)=>{
        let {type, values} = com;

        // round
        if(decimals>0){
            values = values.length ? 
            values.map(val=>+val.toFixed(decimals)) : 
            values;
            pathData[i].values = values;
        }

        if(type.toLowerCase()==='m'){
            idx++;
            type='M';
            values=M_arr[idx];
            pathDataArr.push([]);
        }

        pathDataArr[idx].push({type, values});
    });

    return {pathData, pathDataArr};
}

function serializePathData(pathData = []) {

    let typePrev = 'M';
    let typeStr = 'M';
    let sameType = false;
    let separator = '';
    let d = [`M${pathData[0].values.join(' ')}`];

    for (let i = 1, l = pathData.length; i < l; i++) {
        let com = pathData[i];
        let { type, values } = com;
        sameType = type === typePrev;
        typeStr = sameType ? '' : type;
        separator = sameType ? ' ' : '';
        d.push(`${separator}${typeStr}${values.join(' ')}`);

        typePrev = type;
    }

    // stringify
    d = d.join('')
        // Space before small decimals
        .replace(/ 0\./g, " .")
        // Remove space before negatives
        .replace(/ -/g, "-")
        // Remove leading zero from negative decimals
        .replace(/-0\./g, "-.")
        // Convert uppercase 'Z' to lowercase
        .replace(/Z/g, "z");

    return d
}

/**
 * Deduplicates and removes collinear points from an integer polygon ring.
 */
function removeCollinearPoints(ring, isClosed = true) {

    const pointsEqual = (p1, p2) => {
        return p1[0] === p2[0] && p1[1] === p2[1];
    };

    if (!ring || ring.length < 3) return ring;

    // Step 1: Remove adjacent duplicate coordinates
    let pts = [];
    for (let i = 0; i < ring.length; i++) {
        if (i === 0 || !pointsEqual(ring[i], ring[i - 1])) {
            pts.push(ring[i]);
        }
    }

    // Unclose array temporarily
    if (isClosed && pts.length > 1 && pointsEqual(pts[0], pts[pts.length - 1])) {
        pts.pop();
    }

    if (pts.length < 3) return ring;

    // Step 2: Multi-pass elimination of collinear points
    let changed = true;

    while (changed && pts.length >= 3) {
        changed = false;
        let cleaned = [];
        let n = pts.length;

        for (let i = 0; i < n; i++) {
            let prev = pts[(i - 1 + n) % n];
            let curr = pts[i];
            let next = pts[(i + 1) % n];

            let dx1 = curr[0] - prev[0];
            let dy1 = curr[1] - prev[1];
            let dx2 = next[0] - curr[0];
            let dy2 = next[1] - curr[1];

            // 2D Cross product
            let crossProduct = dx1 * dy2 - dy1 * dx2;

            if (crossProduct === 0) {
                // Dot product check to ensure 'curr' is strictly between 'prev' and 'next'
                // (and not a sharp 180-degree dead-end spike)
                let dotProduct = dx1 * dx2 + dy1 * dy2;
                if (dotProduct >= 0) {
                    changed = true;
                    continue;
                }
            }

            cleaned.push(curr);
        }

        pts = cleaned;
    }

    return pts;
}

/**
 * Calculates polygon area on a sphere in km^2.
 * @param {Array<[number, number]>} ring - Array of [longitude, latitude] pairs in degrees.
 * @returns {number} Area in square kilometers.
 */

function getSphericalArea(pts=[], absolute = true, maxPts = 0) {

  const RAD = Math.PI / 180;
  const R = 6371.0088; // Earth radius in km

  let len = pts.length;
  if (len < 3) return 0;

  let area = 0;
  let step = 1;

  // Calculate stride if subsampling is requested
  if (maxPts > 0 && len > maxPts * 2) {
    step = Math.floor(len / maxPts);
  }

  let i = 0;
  while (i < len) {
    // Determine current point and next point based on step
    let p1 = pts[i];
    
    let nextIdx = i + step;
    // Wrap around to the start point if we reach or pass the end
    if (nextIdx >= len) {
      nextIdx = 0;
    }
    
    let p2 = pts[nextIdx];

    let lon1 = p1[0] * RAD;
    let lat1 = p1[1] * RAD;
    let lon2 = p2[0] * RAD;
    let lat2 = p2[1] * RAD;

    // Spherical Shoelace contribution
    area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));

    // Move to next sampled point
    i += step;
    
    // Stop after closing the loop with point 0
    if (nextIdx === 0) break;
  }

  // Convert spherical excess to square kilometers
  area = +((area * R * R) * 0.5).toFixed(3);

  return absolute ? Math.abs(area) : area;
}

function getPolyBBox_arr(vertices) {
  let xArr = vertices.map(pt => pt[0]);
  let yArr = vertices.map(pt => pt[1]);
  let left = Math.min(...xArr);
  let right = Math.max(...xArr);
  let top = Math.min(...yArr);
  let bottom = Math.max(...yArr);
  let bb = {
    x: left,
    left: left,
    right: right,
    y: top,
    top: top,
    bottom: bottom,
    width: right - left,
    height: bottom - top
  };

  return bb;
}

/**
 * get Manhattan/Cab distance 
 * based on x/y deltas
 * sloppy but fast
 */

function getDistManhattan_arr(pt1, pt2) {

  let dx = Math.abs(pt2[0] - pt1[0]);
  let dy = Math.abs(pt2[1] - pt1[1]);
  return dx + dy;
}

function removeZeroLength(pts = [], addClosePt = false) {

    let ptsN = [];
    let l = pts.length;

    let pt0 = pts[0];
    let ptL = pts[l - 1];

    if( pt0[0] === ptL[0] && pt0[1] === ptL[1]);

    // closing: last vertice equals 1st – remove 
    if (!addClosePt && pt0[0] === ptL[0] && pt0[1] === ptL[1]) {
        l--;

    } 
    // duplicate start point to end
    else if (addClosePt && pt0[0] !== ptL[0] && pt0[1] !== ptL[1]) {
        console.log('add close');
        pts.push(pts[0]);
        l++;
    }

    for (let i = 0; i < l; i++) {
        let pt = pts[i];

        let ptN = pts[i + 1] ? pts[i + 1] : null;

        if (ptN && pt[0] === ptN[0] && pt[1] === ptN[1]) {
            continue
        }
        ptsN.push(pt);
    }

    // 1st/last: 5265, 3496

    return ptsN
}

/**
 * Extracts topology and splits 
 * polygons into shared & unshared 
 * continuous arc chunks.
 */
function doBBoxesIntersect(a, b) {
    return !(
        a.right < b.left ||
        a.left > b.right ||
        a.bottom < b.top ||
        a.top > b.bottom
    );
}

function getPolyChunks(groups = []) {
    let polyMeta = [];

    // Flatten polygons and pre-identify overlapping candidates via bounding boxes
    groups.forEach((group, groupIdx) => {

        group.polys.forEach((poly, polyIdx) => {
            let bbox = group.bboxes ? group.bboxes[polyIdx] : null;

            polyMeta.push({
                groupIdx,
                polyIdx,
                polyId: `${groupIdx}_${polyIdx}`,
                poly,
                bbox,
                hasOverlapCandidate: false
            });
        });
    });

    let totalPolys = polyMeta.length;

    // Determine if each polygon intersects with at least one other polygon
    for (let i = 0; i < totalPolys; i++) {
        let metaA = polyMeta[i];
        if (!metaA.bbox) {
            metaA.hasOverlapCandidate = true; // Fallback if no bbox provided
            continue;
        }

        for (let j = i + 1; j < totalPolys; j++) {
            let metaB = polyMeta[j];
            if (!metaB.bbox) continue;

            if (doBBoxesIntersect(metaA.bbox, metaB.bbox)) {
                metaA.hasOverlapCandidate = true;
                metaB.hasOverlapCandidate = true;
            }
        }
    }

    let edgeMap = new Map();

    // 2. Register edges ONLY for polygons that have bounding box overlaps
    polyMeta.forEach(meta => {
        if (!meta.hasOverlapCandidate) return;

        let poly = meta.poly;
        let numPts = poly.length;
        if (numPts < 2) return;

        for (let i = 0; i < numPts; i++) {
            let nextI = (i + 1) % numPts;
            let pt1 = poly[i];
            let pt2 = poly[nextI];

            // Integer/String coordinate key without excessive temporary strings
            let p1 = `${pt1[0]},${pt1[1]}`;
            let p2 = `${pt2[0]},${pt2[1]}`;
            let edgeKey = p1 < p2 ? `${p1}|${p2}` : `${p2}|${p1}`;

            let entry = edgeMap.get(edgeKey);
            if (!entry) {
                entry = [];
                edgeMap.set(edgeKey, entry);
            }
            if (!entry.includes(meta.polyId)) {
                entry.push(meta.polyId);
            }
        }
    });

    // Cache sorted owner signatures to avoid recalculating identical edge ownership strings

    let getSortedSig = (ownersArray) => {
        if (ownersArray.length === 1) return ownersArray[0];
        ownersArray.sort();
        let key = ownersArray.join('|');
        return key;
    };

    let chunkData = {};

    // 3. Extract continuous chunks
    polyMeta.forEach(meta => {
        let { polyId, poly, hasOverlapCandidate } = meta;
        let numPts = poly.length;
        if (numPts < 2) return;

        // Fast path: Polygon bbox does not touch any other polygon
        if (!hasOverlapCandidate) {
            chunkData[polyId] = {
                chunks: [[...poly, poly[0]]],
                chunkSignatures: [polyId],
                shared_chunk_indices: []
            };
            return;
        }

        let segmentSignatures = new Array(numPts);

        for (let i = 0; i < numPts; i++) {
            let nextI = (i + 1) % numPts;
            let pt1 = poly[i];
            let pt2 = poly[nextI];

            let p1 = `${pt1[0]},${pt1[1]}`;
            let p2 = `${pt2[0]},${pt2[1]}`;
            let edgeKey = p1 < p2 ? `${p1}|${p2}` : `${p2}|${p1}`;

            let owners = edgeMap.get(edgeKey);
            if (!owners) {
                segmentSignatures[i] = polyId;
            } else {
                segmentSignatures[i] = getSortedSig(owners);
            }
        }

        // Identify split indices where signatures change
        let splits = [];
        for (let i = 0; i < numPts; i++) {
            let prevI = (i - 1 + numPts) % numPts;
            if (segmentSignatures[i] !== segmentSignatures[prevI]) {
                splits.push(i);
            }
        }

        if (splits.length === 0) {
            splits = [0];
        }

        let chunks = [];
        let chunkSignatures = [];
        let shared_chunk_indices = [];

        for (let k = 0; k < splits.length; k++) {
            let startIdx = splits[k];
            let endIdx = splits[(k + 1) % splits.length];

            let chunk = [];
            let curr = startIdx;

            do {
                chunk.push(poly[curr]);
                curr = (curr + 1) % numPts;
            } while (curr !== endIdx);

            chunk.push(poly[endIdx]);

            let sig = segmentSignatures[startIdx];
            chunks.push(chunk);
            chunkSignatures.push(sig);

            if (sig.includes('|')) {
                shared_chunk_indices.push(k);
            }
        }

        chunkData[polyId] = {
            chunks,
            chunkSignatures,
            shared_chunk_indices
        };
    });

    return chunkData;
}

/**
 * Ramer Douglas Peucker
 * polygon simplification
 */

function simplifyRDP(pts = [], sqTolerance = 0.01, normalizeDirection = false, bb={}) {
    if (pts.length <= 2) return pts;

    let protectBB = Object.keys(bb).length;

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

        for (let i = idx0 + 1; i < idx1; i++) {
            let px = pts[i][0];
            let py = pts[i][1];

            // Check if point touches any bounding box extreme
            let touchesBB = !protectBB ? false : (px === x || px === right || py === y || py === bottom);

            if (touchesBB) {
                // Instantly prioritize extreme bounding box points
                index = i;
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

function getSqSegDist(p, p1, p2) {
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

/**
 * unite self intersecting polygons
 * based on J. Holmes's answer
 * https://stackoverflow.com/a/10673515/15015675
 */

function unitePolygonPts(poly) {
    let len = poly.length;
    if (len < 3) return poly;

    const epsilon = 1e-9;

    // Helper: line segment intersection for [lon, lat] pairs
    const getLineIntersection = (p0, p1, p2, p3) => {
        let [x1, y1] = p0;
        let [x2, y2] = p1;
        let [x3, y3] = p2;
        let [x4, y4] = p3;

        // get x/y deltas
        let [dx1, dx2] = [x1 - x2, x3 - x4];
        let [dy1, dy2] = [y1 - y2, y3 - y4];

        let denominator = dx1 * dy2 - dy1 * dx2;
        if (Math.abs(denominator) < 1e-12) return null; // Parallel or collinear

        let cross1 = x1 * y2 - y1 * x2;
        let cross2 = x3 * y4 - y3 * x4;

        let x = (cross1 * dx2 - dx1 * cross2) / denominator;
        let y = (cross1 * dy2 - dy1 * cross2) / denominator;

        // Boundary check with float tolerance
        if (
            x < Math.min(x1, x2) || x > Math.max(x1, x2) ||
            x < Math.min(x3, x4) || x > Math.max(x3, x4) ||
            y < Math.min(y1, y2) || y > Math.max(y1, y2) ||
            y < Math.min(y3, y4) || y > Math.max(y3, y4)
        ) {
            return null;
        }

        return [x, y];
    };

    // Find intersections along a given line segment
    const getSelfIntersections = (pts, pt0, pt1) => {
        let intersections = [];
        let segLenSq = squaredDist(pt0, pt1);
        let thresh = segLenSq / 1000;
        let l = pts.length;

        for (let i = 0; i < l; i++) {
            let pt2 = pts[i];
            let pt3 = pts[(i + 1) % l];

            // Skip adjacent or identical segments
            if (
                (pt0[0] === pt2[0] && pt0[1] === pt2[1]) ||
                (pt1[0] === pt3[0] && pt1[1] === pt3[1]) ||
                (pt0[0] === pt3[0] && pt0[1] === pt3[1])
            ) {
                continue;
            }

            let intersectionPoint = getLineIntersection(pt0, pt1, pt2, pt3);

            if (intersectionPoint) {
                let lengthSq = squaredDist(pt0, intersectionPoint);

                if (lengthSq > thresh && lengthSq < segLenSq) {
                    intersections.push({
                        intersectionPoint,
                        endPoint: pt3,
                        lengthSq,
                    });
                }
            }
        }

        intersections.sort((a, b) => a.lengthSq - b.lengthSq);
        return intersections;
    };

    let squaredDist = (p1, p2) => (p1[0] - p2[0]) * (p1[0] - p2[0]) + (p1[1] - p2[1]) * (p1[1] - p2[1]);

    // Track next indices using a Map to avoid mutating input array
    let nextMap = new Map();
    for (let i = 0; i < len; i++) {
        nextMap.set(poly[i], poly[(i + 1) % len]);
    }

    let newPoly = [];
    let currentPoint = poly[0];
    let nextPoint = nextMap.get(currentPoint);
    newPoly.push(currentPoint);

    // Safety cap against infinite loops
    let maxSteps = len * 3;
    for (let i = 0; i < maxSteps; i++) {
        let intersections = getSelfIntersections(poly, currentPoint, nextPoint);

        if (intersections.length === 0) {
            newPoly.push(nextPoint);
            currentPoint = nextPoint;
            nextPoint = nextMap.get(nextPoint) || poly[(poly.indexOf(nextPoint) + 1) % len];
        } else {
            let closest = intersections[0];
            currentPoint = closest.intersectionPoint;
            nextPoint = closest.endPoint;
            newPoly.push(currentPoint);
        }

        // Check if loop closed back to start
        if (
            newPoly.length > 2 &&
            Math.abs(currentPoint[0] - newPoly[0][0]) < epsilon &&
            Math.abs(currentPoint[1] - newPoly[0][1]) < epsilon
        ) {
            break;
        }
    }

    // Remove trailing point if it duplicates the start point
    let first = newPoly[0];
    let last = newPoly[newPoly.length - 1];
    if (
        newPoly.length > 1 &&
        Math.abs(first[0] - last[0]) < epsilon &&
        Math.abs(first[1] - last[1]) < epsilon
    ) {
        newPoly.pop();
    }

    return newPoly;
}

function simplifyPolyGroups(groups = [], chunkData = {}, sqTolerance = 0.1, normalizeDirection = false, protectBB = true) {

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
                }else {
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

        /**
         * unite self intersections
         * only for higher simplification thresholds
         */
        let unitePoly = sqTolerance > 0.001;
        unitePoly = false;

        if (unitePoly) {
            fullPoly = unitePolygonPts(fullPoly);
        }

        updatedGroups[groupIdx].polys[polyIdx] = fullPoly;
    }

    return updatedGroups;
}

/**
 * sort to bottom most in cartesian
 * conerted to top most in SVG
 */
function polyStartToBottomMost(poly = []) {
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

async function filterGeoData(geoData = {}, {
    features = [],
    exclude = [],
    properties = []
} = {}) {

    // fetch and parse geoData
    if (typeof geoData === 'string') {

        // is URL
        if (geoData.startsWith('https://') || geoData.includes('.json') || geoData.includes('.geojson')) {
            let res = await fetch(geoData);
            if (res.ok) {
                geoData = await res.json();
            }
        }
        // is stringified
        else {
            try {
                geoData = JSON.parse(geoData);
            } catch {
                geoData = null;
                console.warn('No valid geoData input');
            }

            // exit: has no relevant data
            if (geoData.features === undefined || geoData.features[0].geometry === undefined) {
                console.warn('No valid geogeoData input');
                geoData = null;
            }
        }
    }

    // exit
    if (geoData && typeof geoData !== 'object') return;

    // check if properties are to filter
    let propLen = Object.keys(geoData.features[0].properties);
    let propsToFilter = properties.length && propLen!==properties.length;

    // no filters - ready to go
    if (!features.length &&!exclude.length && !propsToFilter ) {

        return geoData
    }

    let allProperties = new Set([]);
    let filterVals = new Set([]);
    let excludedVals = new Set(exclude);
    let geoFeatures = geoData.features;

    /**
     * collect all 
     * required property keys
     * from property and final attribute 
     * arrayinput
     */
    properties.forEach(propName => {
        allProperties.add(propName.toLowerCase());
    });

    features.forEach(f => {
        if (typeof f === 'object') {
            let allkeys = Object.keys(f);
            allkeys.forEach(key => {
                allProperties.add(key.toLowerCase());
                let val = isNaN(f[key]) ? f[key].toLowerCase() : f[key];
                filterVals.add(val);
            });
        }
        else {
            filterVals.add(f);
        }
    });

    /**
     * normalize features
     */
    let featuresFiltered = [];
    let excludedIdx = new Set([]);

    for (let i = 0; i < geoFeatures.length; i++) {
        let feature = geoFeatures[i];
        let { properties } = feature;
        let propsLc = {};
        for (let prop in properties) {
            let propLc = prop.toLowerCase();
            let valLc = isNaN(properties[prop]) ? properties[prop].toLowerCase() : properties[prop];

            if (excludedVals.has(valLc)) {
                excludedIdx.add(i);
                continue
            }

            if (allProperties.size) {
                if (allProperties.has(propLc)) {
                    propsLc[propLc] = valLc;
                }
                else if (filterVals.has(valLc)) {
                    propsLc[propLc] = valLc;
                }
            } else {
                if (filterVals.has(valLc)) {
                    propsLc[propLc] = valLc;
                }
            }
        }
        feature.properties = propsLc;
    }

    /**
     * filter
     */
    for (let i = 0; i < geoFeatures.length; i++) {
        let feature = geoFeatures[i];
        let { properties } = feature;
        let vals = Object.values(properties);

        if (excludedIdx.has(i)) {
            continue
        }

        let filtered = vals.filter(it => filterVals.has(it));

        if (filtered.length) {
            featuresFiltered.push(feature);
        }
    }

    if (featuresFiltered.length) {
        geoData.features = featuresFiltered;
    }

    return geoData

}

const getSvgMarker = ({
    // custom marker
    svg = null,
    meta = null,
    classPre='',
    x = 0,
    y = 0,
    width = 24,
    height = 0,
    decimals = 3,
    styles = {},
    bb = [0, 0, 24, 24] // viewBox [x, y, w, h] of the internal path
} = {}) => {

    height = !height ? width : height;
    width = !width && height ? height : width;

    // Calculate transforms
    let scaleX = +(width / bb[2]).toFixed(decimals);
    let translateX = +(x - width * 0.5).toFixed(decimals);
    let translateY = +(y - height).toFixed(decimals);

    // add CSS
    let css = [];

    // convert camelCase to kebab-case
    const kebabize = str => {
        return str.split('').map((letter, idx) => {
            return letter.toUpperCase() === letter
                ? `${idx !== 0 ? '-' : ''}${letter.toLowerCase()}`
                : letter;
        }).join('');
    };

    // copy CSS directly
    if (typeof styles === 'string') {
        css.push(styles);
    }
    else if (typeof styles === 'object') {
        for (let prop in styles) {
            css.push(`${kebabize(prop)}:${styles[prop]}`);
        }
    }

    let cssAtt = css.length ? ` style="${css.join('; ')}"` : '';

    // choose custom marker svg or default
    let markerElMarkup = svg ? svg : `<path fill="#000" style="stroke:none;mask-image:linear-gradient(rgba(0,0,0,0), 80%, rgba(0,0,0,0.5));filter:blur(1px)" d="M 21.5 14.5 c 3.15 0 3.85 1.5 1.75 3.5 c -3.5 3.5 -11.2 6 -11.2 6 c 0 0 -3.15 -2 0.7 -6 c 2.1 -2 5.95 -3.5 8.75 -3.5 z" /><path d="M12 23.5c0 0-7.5-4.5-7.5-12a1 1 0 1 1 15 0c0 7-7.5 12-7.5 12z" fill="currentColor" /><path d="M12 9a1 1 0 0 0 0 6 1 1 0 0 0 0-6z" fill="white" />`;

    // omit scale for factor 1
    let scaleProp= scaleX!=1 ? ` scale(${scaleX})` : '';

    // add marker meta
    let metaAtt = meta ? ` data-meta='${JSON.stringify(meta)}'`: '';

    // wrap in transform g element
    return `<g class="${[classPre, 'marker'].filter(Boolean).join('-')}" transform="translate(${translateX} ${translateY})${scaleProp}"${cssAtt}${metaAtt}>${markerElMarkup}</g>`;
};

function getMarkerSVGMarkup(markers = [], { projection = 'mercator', scale = 10000, x = 0, y = 0, revert = false, decimals = 0, classPre = 'svgeomin' } = {}) {
    let markersMarkup = '';

    for (let i = 0; i < markers.length; i++) {
        let marker = markers[i];
        let { lat = 0, lon = 0, bb = [0, 0, 24, 24], width = 24, height = null, styles = {}, icon = '', meta=null } = marker;

        let [xM, yM] = projectPoint(lon, lat, projection, scale, decimals, revert, x, y);

        xM -= x + bb[0];
        yM -= y + bb[1];

        // get custom icon
        let markerCustom = icon ? icon.trim() : null;
        let markerEl = null;
        let markerCustomMarkup = null;

        let vB = [];

        if (markerCustom) {

            let isPathData = markerCustom.startsWith('M') || markerCustom.startsWith('m');

            // is pathdata string
            if (isPathData) {
                markerCustomMarkup = `<path d="${icon}"/>`;
            }
            // is SVG or SVG geometry element try to parse
            else {
                try {
                    markerEl = new DOMParser().parseFromString(icon, 'image/svg+xml').documentElement;
                    if (markerEl.nodeName.toLowerCase() === 'svg') {
                        vB = markerEl.getAttribute('viewBox') ? markerEl.getAttribute('viewBox').replaceAll(',', '').split(' ').filter(Boolean).map(Number) : vB;

                        // prefer viewBox
                        if (vB.length) bb = vB;
                        markerCustomMarkup = icon.split('>').slice(1).join('>').split('</svg')[0];
                    } else {
                        markerCustomMarkup = icon;
                    }
                } catch {
                    console.warn('no valid svg markup');
                }
            }
        }

        // Pass calculated layout to marker generator
        let markerDef = getSvgMarker({ classPre, svg: markerCustomMarkup, x: xM, y: yM, width, height, bb, styles, meta });
        markersMarkup += markerDef;
    }

    return `<g class="${[classPre, 'markers'].filter(Boolean).join('-')}">${markersMarkup}</g>`;
}

// object for chainable methods
function SVGEO(props = {}) {
    Object.assign(this, props);
}

async function svgFromGeo(geoData = {}, {
    // features to filter
    features = [],
    // properties to include in SVG
    properties = [],
    // exclude property values
    exclude = [],
    // scale to reasonable coordinate space
    scale = 10000,

    // autoscale tiny features

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
        simplify = simplify * (1 / 11100);

        console.log({ simplify });
    }

    // parse and filter geodata
    geoData = await filterGeoData(geoData, { features, properties, exclude });

    // normalize projection type to lowercase
    projection = projection.toLowerCase();

    // for approximated area calc
    let maxPts = 96;

    let geoFeatures = geoData.features;

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
        let type = geometry.type;

        // main land area
        for (let sub of coordinates) {
            // normalize complex poly nesting
            let pts = type === 'MultiPolygon' ? sub[0] : sub;

            // get sloppy area approximation
            let area = minArea ? getSphericalArea(pts, true, maxPts) : 0;
            areas.push(area);

            /**
             * warp around eastern regions
             * < lon 178
             * e.g russia
             */
            let autoWrap = geoFeatures.length == 1 && bbox[0] < 0 && bbox[2] > 0;

            if (autoWrap) {

                pts.forEach((pt) => {
                    if (pt[0] < 0) pt[0] += 360;
                });
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
        });

    }

    /**
     * add bboxes
     * detect tiny feautures
     */

    for (let i = 0, l = featureArr.length; i < l; i++) {
        let path = featureArr[i];
        let { polys } = path;
        path.tinyPolys = [];

        for (let j = 0, k = polys.length; j < k; j++) {
            let poly = polys[j];
            let bb = getPolyBBox_arr(poly);

            // autoscale
            let [w, h] = [bb.width * scale, bb.height * scale];
            let minDim = Math.min(w, h);

            if (minDim < scale * 0.01) {

                path.tinyPolys.push(j);
                // increase accuracy
                if (featureArr.length === 1) decimals = 3;
            }

            // add for bbox calc
            lonArr.push(bb.x, bb.right);
            latArr.push(bb.y, bb.bottom);

            // add bbox
            path.bboxes.push(bb);

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

            let bb0 = bboxes[idx];
            let mid0 = [bb0.x + bb0.width * 0.5, bb0.y + bb0.height * 0.5];

            // distance threshold
            let thresh = (bb0.width + bb0.height) * 2;

            let pathN = path;
            let bboxesN = [];
            let areasN = [];
            let polysN = [];

            for (let j = 0, k = polys.length; j < k; j++) {
                let area = areas[j];

                let poly = polys[j];

                /**
                 * get distance from main land mass
                 * remove if too far away or too small
                 */
                let bb = bboxes[j];

                if (minArea) {

                    let mid = [bb.x + bb.width * 0.5, bb.y + bb.height * 0.5];
                    let distMan = getDistManhattan_arr(mid0, mid);

                    // ignore small or far away
                    //
                    if (!isTiny && area < minArea || distMan > thresh) {
                        continue
                    }
                }

                // update lon/lat arrays for svg viewBox
                areasN.push(area);
                bboxesN.push(bb);
                lonArr.push(bb.x, bb.right);
                latArr.push(bb.y, bb.bottom);

                // add to filtered
                polysN.push(poly);

            }

            pathN.areas = areasN;
            pathN.polys = polysN;
            pathN.bboxes = bboxesN;
            featureArrFilter.push(pathN);
        }

        featureArr = featureArrFilter;

    }

    /**
     * simplify topology
     * find shared/adjacent poly segments 
     * and slice to polygon chunks
     */

    if (simplify) {

        // analyze polys to find chunks for shared arcs
        let polyChunks = getPolyChunks(featureArr);

        // apply RDP simplification
        let normalizeDirection = false;
        let protectBB = true;

        featureArr = simplifyPolyGroups(featureArr, polyChunks, simplify, normalizeDirection, protectBB);

    }

    console.log({ featureArr });

    /**
     * reorder top left to bottom right
     */

    /**
     * get final bbox/viewBox
     */
    lonArr = lonArr.filter(lon => lon !== Infinity && lon !== -Infinity && lon !== -null);
    latArr = latArr.filter(lat => lat !== Infinity && lat !== -Infinity && lat !== -null);

    let lonMin = Math.min(...lonArr);
    let lonMax = Math.max(...lonArr);
    let latMin = Math.min(...latArr);
    let latMax = Math.max(...latArr);

    // get ultimate SVG bbox in mercator projection

    let ptsBBMercator = projectPointArr([[lonMin, latMin], [lonMax, latMax]], projection, scale, decimals);

    let xArrM = [ptsBBMercator[0][0], ptsBBMercator[1][0]];
    let yArrM = [ptsBBMercator[0][1], ptsBBMercator[1][1]];

    let x = Math.min(...xArrM);
    let right = Math.max(...xArrM);
    let y = Math.min(...yArrM);
    let bottom = Math.max(...yArrM);
    let svgMarkup = [];
    let decimalsMax = 3;

    for (let i = 0, l = featureArr.length; i < l; i++) {

        let feature = featureArr[i];
        let { polys, properties = [] } = feature;

        /**
         * convert to 
         * SVG mercator coordinates
         */
        let polysFilter = [];
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

            polysFilter.push(poly);

        }

        if (!polysFilter.length) continue;

        // convert to pathData
        let { pathData, pathDataArr } = multiPolyToRelativePathData(polysFilter, {
            decimals,
        });

        if (!pathData.length) continue;

        // separate path el for each sub path

        if (!split) pathDataArr = [pathData];

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
                attArr.push(`data-${prop}="${properties[prop]}"`);
                classAtts.push(`${classAttPre}-${properties[prop]}`);
            }
        }

        pathDataArr.forEach((pathData, i) => {

            let offX = pathData[0].values[0] - x;
            let offY = pathData[0].values[1] - y;

            pathData[0].values[0] = +offX.toFixed(decimals);
            pathData[0].values[1] = +offY.toFixed(decimals);

            let d = serializePathData(pathData);
            let classAtt = classAtts.length ? `class="${classAtts.join(' ')}"` : '';

            let pathMarkup = split ? `<path d="${d}" />` : `<path ${classAtt} ${attArr.join(' ')} d="${d}" />`;

            groupMarkup.push({ atts: attArr.join(' '), classAtt, path: pathMarkup });

        });

        svgMarkup.push(groupMarkup);

    }

    let bb = { x: 0, y: 0, width: right - x, height: bottom - y };
    for (let key in bb) {
        bb[key] = +bb[key].toFixed(decimalsMax);
    }

    let svgFeatures = '';
    svgMarkup.forEach(g => {
        if (g.length > 1) {
            svgFeatures += `<g ${g[0].classAtt} ${g[0].atts} >${g.map(p => p.path).join('')}</g>`;
        } else {
            svgFeatures += `${g[0].path}`;
        }
    });

    /**
     * build self contained
     * svg markup
     */

    // add meta data

    let dataSvgGeo = JSON.stringify({ bb, x, y, scale, projection, lonMin, latMin, lonMax, latMax });
    let metaAtt = meta ? ` data-svgeo='${dataSvgGeo}'` : '';

    /**
     * add SVG markers
     * project and align
     */
    let markupMarker='';
    if(markers.length){

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

SVGEO.prototype.getUrl = function ( { data='svg', decimals=-1, addXlink=false, addDimensions=true, dataUrl = false } = {}) {
    let url = '';
    let {svg='', svgEl=null, bb={}} = this;

    // return geojson
    data = data.toLowerCase();
    if(data==='geojson' || data==='geo' || data==='json'){
        let geodata = this.getGeoJson({decimals});
        let json = JSON.stringify(geodata);
        let blob = new Blob([json], {type:'application/json'});
        url = URL.createObjectURL(blob);
        return url;
    }

    // return svg
    if(!svg && !svgEl) return '';

    // parse from markup
    if(!svgEl){
        svgEl = new DOMParser().parseFromString(svg, 'text/html').querySelector('svg');
    }

    if(addXlink){
        svgEl.setAttribute('xmlns:xlink','http://www.w3.org/1999/xlink');
    }

    if(addDimensions){
        svgEl.setAttribute('width', bb.width);
        svgEl.setAttribute('height', bb.height);
    }

    let xml = new XMLSerializer().serializeToString(svgEl);

    if(dataUrl){
        xml = xml.replaceAll('"',"'")
        // Handle nested single quotes inside attribute values
        .replace(/="([^"]*)"/g, (match, p1) => {
            const content = p1.replace(/'/g, "&quot;");
            return `='${content}'`;
        })
        // id references and colors
        .replace(/#/g, "%23");
        url = `data:image/svg+xml,${xml}`;

    }else {
        let blob = new Blob([xml], {type:'image/svg+xml'});
        url = URL.createObjectURL(blob);
    }
    return url

};

SVGEO.prototype.render = function (target = null, { overwrite = true } = {}) {

    if (!target) return;

    if(typeof target ==='string'){
        target = document.querySelector(`${target}`);

    }

   if(!target.nodeName) return

    if (target) {
        let svgEl = new DOMParser().parseFromString(this.svg, 'text/html').querySelector('svg');

        // delete all
        if (overwrite) {
            [...target.children].forEach(child=>{child.remove();});
        }

        // add to object
        this.svgEl = svgEl;
        target.append(svgEl);
    }
};

SVGEO.prototype.getGeoJson = function ({ decimals = -1, name = 'svgeomin', properties = [] } = {}) {
    let geogeoData = {
        type: "FeatureCollection",
        name,
        features: [],
    };

    let propertiesFiltered = properties;

    for (let feature of this.featureArr) {
        let { properties, polys } = feature;

        let type = polys.length > 1 ? "MultiPolygon" : "Polygon";

        if (decimals > -1) {
            polys = polys.map(poly => poly.map(pt => pt.map(val => +val.toFixed(decimals))));
        }

        let polysN = type === 'MultiPolygon' ? polys.map(poly => [poly]) : polys;

        let propertiesN = {};
        for (let prop in properties) {
            if (propertiesFiltered.length && propertiesFiltered.includes(prop)) {
                propertiesN[prop] = properties[prop];
            }
        }

        let featureN = {
            type: 'Feature',
            properties: propertiesN,
            geometry: {
                type,
                coordinates:
                    polysN
            }
        };
        geogeoData.features.push(featureN);
    }

    return geogeoData

};

if (typeof window !== 'undefined') {
    window.svgFromGeo = svgFromGeo;
    window.filterGeoData = filterGeoData;
}

export { filterGeoData, svgFromGeo };
