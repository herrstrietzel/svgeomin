export function multiPolyToRelativePathData(polys = [], {
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


export function multiPolyToRelativePathData__(polys = [], {
    decimals = -1,
    toRelative = true,
    toShorthand = true
} = {}) {

    // ignore empty polys
    if (!polys.length) return [];

    // get starting point
    let M = polys[0].shift();
    let x = M[0];
    let y = M[1];

    let pathData = [{ type: 'M', values: [x, y] }];
    let type = 'l';
    let values = [];
    let l = polys.length;

    // sub polys
    for (let i = 0; i < l; i++) {
        let pts = polys[i];

        // single point
        if (pts.length < 3) continue

        for (let j = 0, k = pts.length; j < k; j++) {

            let pt = pts[j];
            values = [pt[0] - x, pt[1] - y];

            // zero length
            if (values[0] === 0 && values[1] === 0) {
                continue
            }

            // new subpath M
            if (i > 0 && j === 0) {
                //pathData.push({ type: 'z', values: [] });
                //[x,y]= M;
                //values = [M[0] - x, M[1] - y];
                type = 'm';
            }
            // relative lineto
            else {
                // v shorthand
                if (values[0] === 0) {
                    type = 'v';
                    values = [values[1]]
                }
                // h shorthand
                else if (values[1] === 0) {
                    type = 'h';
                    values = [values[0]]

                }
                // relative lineto
                else {
                    type = 'l';
                }
            }

            // add to relative path data
            pathData.push({ type, values })

            // update offsets
            x = pt[0]
            y = pt[1]

        }
    }

    // final close path
    pathData.push({ type: 'z', values: [] })
    //console.log( 'pathData:', JSON.parse(JSON.stringify(pathData))  );

    return pathData;
}


export function serializePathData(pathData = []) {

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
        d.push(`${separator}${typeStr}${values.join(' ')}`)
        //d.push(`${typeStr}${values.join(' ')}`)

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


