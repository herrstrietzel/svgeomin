//import { renderPoint } from "./visualize.js";

export function removeZeroLength(pts = [], addClosePt = false) {

    let ptsN = [];
    let l = pts.length;

    let pt0 = pts[0];
    let ptL = pts[l - 1];

    if( pt0[0] === ptL[0] && pt0[1] === ptL[1]){
        //console.log('is closed');
    }

    // closing: last vertice equals 1st – remove 
    if (!addClosePt && pt0[0] === ptL[0] && pt0[1] === ptL[1]) {
        l--
        /*
        renderPoint(svg, [ptL[0]-5163, ptL[1]-3160 ], 'green', '0.5%')
        renderPoint(svg, [pt0[0]-5163, pt0[1]-3160 ], 'red', '0.25%')
        */
    } 
    // duplicate start point to end
    else if (addClosePt && pt0[0] !== ptL[0] && pt0[1] !== ptL[1]) {
        console.log('add close');
        pts.push(pts[0])
        l++
    }



    for (let i = 0; i < l; i++) {
        let pt = pts[i];
        //let ptN = pts[i+1] ? pts[i+1] : pts[l-1];
        let ptN = pts[i + 1] ? pts[i + 1] : null;

        if (ptN && pt[0] === ptN[0] && pt[1] === ptN[1]) {
            continue
        }
        ptsN.push(pt);
    }


    // 1st/last: 5265, 3496
    //5260, 3493

    //console.log(pts.length, ptsN.length);
    //console.log({ptsN}, ptsN.length);

    return ptsN
}