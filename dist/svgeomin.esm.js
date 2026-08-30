let degToRad = Math.PI / 180;

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
    let normX = x / scale;
    let normY = y / scale;

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

    for (let i = 0; i < polys.length; i++) {
        let pts = polys[i];

        // Skip invalid polygons (must have at least 3 points to form a shape)
        if (!pts || pts.length < 3) continue;

        // Start point of the current sub-polygon
        let M = pts[0];

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

    return pathData;
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
 * 
 * @param {Array<Array<number>>} ring - Array of 2D points [[x, y], ...]
 * @param {boolean} [isClosed=true] - Whether the path is closed
 * @returns {Array<Array<number>>} Optimized ring with zero redundant vertices
 */
function removeCollinearPoints(ring, isClosed = true) {
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

    // Step 3: Re-close ring if necessary
    if (isClosed && pts.length > 0) {
        pts.push([...pts[0]]);
    }

    return pts;
}

function pointsEqual(p1, p2) {
    return p1[0] === p2[0] && p1[1] === p2[1];
}

function getPolygonArea_arr(pts, absolute = true, maxPts=0) {
  let area = 0;
  let step = 1;

  let len = pts.length;

  // for sloppy but faster approximations
  if(maxPts && len>maxPts*2){
    step = Math.floor(pts.length/maxPts);
  }

  for (let i = step; len && i < len; i+=step) {
    let ptN = pts[i+step] ? pts[i+step] : pts[0];
    let pt = pts[i-step];
    let addX = pts[i-step][0];
    let addY = ptN[1];
    let subX = ptN[0];
    let subY = pt[1];
    area += addX * addY * 0.5 - subX * subY * 0.5;
  }

  area = absolute ? Math.abs(area) : area;
  console.log({absolute, step, area});

  return area;
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

function getPolyChunks(groups = []) {

    let getPtKey = (pt) => `${pt[0]},${pt[1]}`;

    // Map every undirected edge to the list of polygons that contain it
    let edgeMap = new Map();

    groups.forEach((group, groupIdx) => {
        group.polys.forEach((poly, polyIdx) => {
            let numPts = poly.length;
            if (numPts < 2) return;

            let polyId = `${groupIdx}_${polyIdx}`;

            for (let i = 0; i < numPts; i++) {
                let nextI = (i + 1) % numPts;
                let p1 = getPtKey(poly[i]);
                let p2 = getPtKey(poly[nextI]);

                // Undirected edge key
                let edgeKey = p1 < p2 ? `${p1}|${p2}` : `${p2}|${p1}`;

                if (!edgeMap.has(edgeKey)) {
                    edgeMap.set(edgeKey, new Set());
                }
                edgeMap.get(edgeKey).add(polyId);
            }
        });
    });

    // Extract continuous chunks for each polygon
    let chunkData = {};

    groups.forEach((group, groupIdx) => {
        group.polys.forEach((poly, polyIdx) => {
            let key = `${groupIdx}_${polyIdx}`;
            let numPts = poly.length;
            if (numPts < 2) return;

            let segmentSignatures = new Array(numPts);
            for (let i = 0; i < numPts; i++) {
                let nextI = (i + 1) % numPts;
                let p1 = getPtKey(poly[i]);
                let p2 = getPtKey(poly[nextI]);
                let edgeKey = p1 < p2 ? `${p1}|${p2}` : `${p2}|${p1}`;

                let owners = Array.from(edgeMap.get(edgeKey)).sort();
                segmentSignatures[i] = owners.join('|');
            }

            // Find junction points where neighbor signatures change
            let splitIndices = new Set();
            for (let i = 0; i < numPts; i++) {
                let prevI = (i - 1 + numPts) % numPts;
                if (segmentSignatures[i] !== segmentSignatures[prevI]) {
                    splitIndices.add(i);
                }
            }

            let splits = Array.from(splitIndices).sort((a, b) => a - b);
            if (splits.length === 0) {
                splits = [0];
            }

            // Extract chunks between junction split indices
            let chunks = [];
            let chunkSignatures = [];

            for (let k = 0; k < splits.length; k++) {
                let startIdx = splits[k];
                let endIdx = splits[(k + 1) % splits.length];

                let chunk = [];
                let curr = startIdx;

                // Handles ring traversal, including full loops when splits.length === 1
                do {
                    chunk.push(poly[curr]);
                    curr = (curr + 1) % numPts;
                } while (curr !== endIdx);

                chunk.push(poly[endIdx]);

                chunks.push(chunk);
                chunkSignatures.push(segmentSignatures[startIdx]);
            }

            let shared_chunk_indices = chunkSignatures
                .map((sig, idx) => (sig.includes('|') ? idx : -1))
                .filter(idx => idx !== -1);

            chunkData[key] = {
                chunks,
                chunkSignatures,
                shared_chunk_indices
            };
        });
    });

    return chunkData;
}

/**
 * Ramer Douglas Peucker
 * polygon simplification
 */

function simplifyRDP(pts = [], sqTolerance = 0.01, normalizeDirection = false, protectBB=false) {
    if (pts.length <= 2) return pts;

    let bb = protectBB ? getPolyBBox_arr(pts) : {};
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

function simplifyPolyGroups(groups = [], chunkData = {}, sqTolerance = 0.1, normalizeDirection=false, protectBB = true) {

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
                simplifiedChunk = simplifyRDP(chunk, sqTolerance, normalizeDirection, protectBB);

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

        if (y > maxY ) {
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
        if (geoData.includes('.geoData') || geoData.includes('.geogeoData')) {
            let res = await fetch(geoData);
            if (res.ok) {
                geoData = await res.geoData();
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

    // no filters
    if (!features.length &&!exclude.length) {

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

// object for chainable methods
function SVGEO(props = {}) {
    Object.assign(this, props);
}

SVGEO.prototype.getGeoJson = function ({ decimals = -1, name = 'svgeomin', properties=[] } = {}) {
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
        for(let prop in properties){
            if(propertiesFiltered.length && propertiesFiltered.includes(prop)){
                propertiesN[prop] = properties[prop];
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
        };
        geogeoData.features.push(featureN);
    }

    return geogeoData

};

async function svgFromGeo(geoData = {}, {
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
    let maxPts = 0;

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
        let position = {};
        let { bbox = [], geometry, properties } = item;
        let { coordinates } = geometry;
        let type = geometry.type;

        if (!bbox.length) {
            let coordsFlat = coordinates.flat(3);
            let lonArr = coordsFlat.filter((val, i) => i % 2 === 0);
            let latArr = coordsFlat.filter((val, i) => i % 2 !== 0);
            bbox = [Math.min(...lonArr), Math.min(...latArr), Math.max(...lonArr), Math.max(...latArr)];

        }

        let [lonMin, latMin, lonMax, latMax] = bbox;
        lonArr.push(lonMin, lonMax);
        latArr.push(latMin, latMax);

        /**
         * projected Mercator 
         * bbox for svg viewBox
         */
        let bbM = projectPointArr([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], projection, scale, decimals);

        // poly get position for reordering
        let left = Math.min(bbM[0][0], bbM[1][0]);
        let top = Math.min(bbM[0][1], bbM[1][1]);
        position = { top, left };
        let areas = [];

        // main land area
        for (let sub of coordinates) {
            // normalize complex poly nesting
            let pts = type === 'MultiPolygon' ? sub[0] : sub;

            // get area
            let area = removeIslands ? getPolygonArea_arr(pts, true, maxPts) : 0;
            areas.push(area);

            /**
             * warp around eastern regions
             * < lon 178
             * e.g russia
             */

            // add poly
            polys.push(pts);

        }

        featureArr.push({
            properties,
            position,
            areas,
            polys
        });

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
            let bb0 = getPolyBBox_arr(path.polys[idx]);
            let mid0 = [bb0.x + bb0.width * 0.5, bb0.y + bb0.height * 0.5];
            let thresh = (bb0.width + bb0.height) * 2;

            // add for bbox calc
            lonArr.push(bb0.x, bb0.right);
            latArr.push(bb0.y, bb0.bottom);

            let pathN = JSON.parse(JSON.stringify(path));
            let polysN = [];

            for (let j = 0, k = polys.length; j < k; j++) {
                let area = areas[j];
                let ratio = area / area0 * 100;
                let poly = polys[j];

                /**
                 * get distance from main land mass
                 * remove if too far away or too small
                 */
                let bb = getPolyBBox_arr(poly);

                if (removeIslands) {

                    let mid = [bb.x + bb.width * 0.5, bb.y + bb.height * 0.5];
                    let distMan = getDistManhattan_arr(mid0, mid);

                    // ignore small or far away
                    if (ratio < removeIslands || distMan > thresh) {
                        continue
                    }
                }

                // add to accurate bbox
                lonArr.push(bb.x, bb.right);
                latArr.push(bb.y, bb.bottom);

                // add to filtered
                polysN.push(poly);

            }
            pathN.polys = polysN;
            featureArrFilter.push(pathN);

        }

        featureArr = featureArrFilter;

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

    // get ultimate SVG bbox in mercator projection
    let ptsBBMercator = projectPointArr([[lonMin, latMin], [lonMax, latMax]], projection, scale, decimals);
    let xArrM = [ptsBBMercator[0][0], ptsBBMercator[1][0]];
    let yArrM = [ptsBBMercator[0][1], ptsBBMercator[1][1]];

    let x = Math.min(...xArrM);
    let right = Math.max(...xArrM);
    let y = Math.min(...yArrM);
    let bottom = Math.max(...yArrM);
    let svgMarkup = [];

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

        // convert to pathData
        let pathData = multiPolyToRelativePathData(polysFilter, decimals);

        if (!pathData.length) continue;

        let offX = pathData[0].values[0] - x;
        let offY = pathData[0].values[1] - y;

        pathData[0].values[0] = offX;
        pathData[0].values[1] = offY;

        /**
         * add selected properties
         * as data attributes
         */
        let attArr = [];

        for (let prop in properties) {
            if (atts.has(prop)) {
                attArr.push(`data-${prop}="${properties[prop]}"`);
            }
        }

        let d = serializePathData(pathData);
        svgMarkup.push(`<path ${attArr.join(' ')} d="${d}" />`);
    }

    let bb = { x: 0, y: 0, width: right - x, height: bottom - y };

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

if (typeof window !== 'undefined') {
    window.svgFromGeo = svgFromGeo;
    window.filterGeoData = filterGeoData;
}

export { filterGeoData, svgFromGeo };
