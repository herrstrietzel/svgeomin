
/**
 * Calculates polygon area on a sphere in km^2.
 * @param {Array<[number, number]>} ring - Array of [longitude, latitude] pairs in degrees.
 * @returns {number} Area in square kilometers.
 */

export function getSphericalArea(pts=[], absolute = true, maxPts = 0) {

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
  //area = (area * R * R) * 0.5;

  return absolute ? Math.abs(area) : area;
}



export function getPolygonArea_arr(pts, absolute = true, maxPts=0) {
  let area = 0;
  let step = 1;
  let len = pts.length

  // for sloppy but faster approximations
  if(maxPts && len>maxPts*2){
    step = Math.floor(pts.length/maxPts)
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

  area = absolute ? Math.abs(area) : area
  //console.log({absolute, step, area});

  return area;
}

export function getPolyBBox_arr(vertices) {
  let xArr = vertices.map(pt => pt[0]);
  let yArr = vertices.map(pt => pt[1]);
  let left = Math.min(...xArr)
  let right = Math.max(...xArr)
  let top = Math.min(...yArr)
  let bottom = Math.max(...yArr)
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

export function getDistManhattan_arr(pt1, pt2) {
  //console.log(pt1, pt2);
  let dx = Math.abs(pt2[0] - pt1[0]);
  let dy = Math.abs(pt2[1] - pt1[1]);
  return dx + dy;
}


