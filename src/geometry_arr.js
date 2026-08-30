
export function getPolygonArea_arr(pts, absolute = true, maxPts=0) {
  let area = 0;
  let step = 1;
  //pts=pts.slice(0)
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
  console.log({absolute, step, area});

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


