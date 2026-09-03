/**
 * Deduplicates and removes collinear points from an integer polygon ring.
 */
export function removeCollinearPoints(ring, isClosed = true) {

    const pointsEqual = (p1, p2) => {
        return p1[0] === p2[0] && p1[1] === p2[1];
    }

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

    /*
    // Step 3: Re-close ring if necessary
    if (isClosed && pts.length > 0) {
        pts.push([...pts[0]]);
    }
    */

    return pts;
}

