

let degToRad = Math.PI / 180;



// Shared rounding helper
function roundPt(pt, decimals = -1) {
  return decimals > -1 ? pt.map(val => +val.toFixed(decimals)) : pt;
}

export function projectPointArr(coords, type = "mercator", scale = 1, decimals = -1, revert=false, x=0, y=0) {

  let len = coords.length;

  /**
  * get all projected points
  */
  let ptsP = [];
  for (let i = 0; i < len; i++) {
    let coord = coords[i];
    //let [lon, lat] = coord;

    coord = projectPoint(...coord, type, scale, decimals, revert, x, y);
    //coord = mercatorProject(...coord , scale, decimals);
    ptsP.push(coord)

  }

  return ptsP;

}



/**
 * wrapper for
 * all different projection types
 */
export function projectPoint(lon = 0, lat = 0, type = "mercator", scale = 1, decimals = -1, revert=false, x=0, y=0) {

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
export function mercatorProject(lon = 0, lat = 0, scale = 1, decimals = -1, revert = false, x = 0, y = 0) {
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
export function equirectangularProject(lon = 0, lat = 0, scale = 1, decimals = -1, revert = false, x = 0, y = 0) {
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
export function millerProject(lon = 0, lat = 0, scale = 1, decimals = -1, revert = false, x = 0, y = 0) {
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
export function behrmannProject(lon = 0, lat = 0, scale = 1, decimals = -1, revert = false, x = 0, y = 0) {
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


/*
export function pointsToMercatorArr(coords, scale = 1, decimals = -1) {

  let len = coords.length;
  // get all projected points
  let ptsP = [];
  for (let i = 0; i < len; i++) {
    let coord = coords[i];
    let [lon, lat] = coord;
    ptsP.push(mercatorProject(lon, lat, scale, decimals))
  }

  return ptsP;
}
*/
