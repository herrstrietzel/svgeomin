
/**
 * Extracts topology and splits 
 * polygons into shared & unshared 
 * continuous arc chunks.
 */

export function getPolyChunks(groups = []) {

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
