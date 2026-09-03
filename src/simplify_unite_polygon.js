

/**
 * unite self intersecting polygons
 * based on J. Holmes's answer
 * https://stackoverflow.com/a/10673515/15015675
 */

export function unitePolygonPts(poly) {
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
        let l = pts.length

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

