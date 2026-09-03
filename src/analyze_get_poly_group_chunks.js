
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

export function getPolyChunks(groups = []) {
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
    //let sigCache = new Map();
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
 * Detects if a group of sub-polygons (MultiPolygon) spans the antimeridian,
 * and shifts negative longitudes (Western Hemisphere) by +360° for continuous projection.
 *
 */

export function shiftAntimeridianPolys(polys = [], threshold = 170) {
    if (!polys || polys.length < 2) return polys;

    let hasPositiveEdge = false;
    let hasNegativeEdge = false;

    // Fast check: look for vertices at both sides of the seam (+180 and -180)
    for (let i = 0; i < polys.length; i++) {
        let ring = polys[i];
        if (!ring || ring.length === 0) continue;

        // Check first, last (closing), and middle vertex for speed
        let sampleIndices = [0, Math.floor(ring.length / 2), ring.length - 1];

        for (let idx of sampleIndices) {
            let lon = ring[idx][0];
            if (lon >= threshold) hasPositiveEdge = true;
            if (lon <= -threshold) hasNegativeEdge = true;
        }

        if (hasPositiveEdge && hasNegativeEdge) break;
    }

    // If sub-polygons don't touch opposite sides of the antimeridian, return unchanged
    if (!hasPositiveEdge || !hasNegativeEdge) {
        return polys;
    }

    // Apply +360° shift ONLY to the sub-polygons located on the negative side
    let p2=[]
    return polys.map(ring => {
        // Evaluate average longitude to determine if this sub-polygon belongs to the West
        let avgLon = ring.reduce((sum, pt) => sum + pt[0], 0) / ring.length;

        if (avgLon < 0) {
            return ring.map(([lon, lat]) => [lon + 360, lat]);
            //return []
        }

        return ring;
    });
}
