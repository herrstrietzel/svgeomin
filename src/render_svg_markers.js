import { projectPoint } from "./geometry_geo.js";

export const getSvgMarker = ({
    // custom marker
    svg = null,
    meta = null,
    classPre='',
    x = 0,
    y = 0,
    width = 24,
    height = 0,
    decimals = 3,
    styles = {},
    bb = [0, 0, 24, 24] // viewBox [x, y, w, h] of the internal path
} = {}) => {

    height = !height ? width : height;
    width = !width && height ? height : width;

    // Calculate transforms
    let scaleX = +(width / bb[2]).toFixed(decimals);
    let translateX = +(x - width * 0.5).toFixed(decimals);
    let translateY = +(y - height).toFixed(decimals);

    // add CSS
    let css = [];

    // convert camelCase to kebab-case
    const kebabize = str => {
        return str.split('').map((letter, idx) => {
            return letter.toUpperCase() === letter
                ? `${idx !== 0 ? '-' : ''}${letter.toLowerCase()}`
                : letter;
        }).join('');
    }

    // copy CSS directly
    if (typeof styles === 'string') {
        css.push(styles);
    }
    else if (typeof styles === 'object') {
        for (let prop in styles) {
            css.push(`${kebabize(prop)}:${styles[prop]}`);
        }
    }

    let cssAtt = css.length ? ` style="${css.join('; ')}"` : '';

    // choose custom marker svg or default
    let markerElMarkup = svg ? svg : `<path fill="#000" style="stroke:none;mask-image:linear-gradient(rgba(0,0,0,0), 80%, rgba(0,0,0,0.5));filter:blur(1px)" d="M 21.5 14.5 c 3.15 0 3.85 1.5 1.75 3.5 c -3.5 3.5 -11.2 6 -11.2 6 c 0 0 -3.15 -2 0.7 -6 c 2.1 -2 5.95 -3.5 8.75 -3.5 z" /><path d="M12 23.5c0 0-7.5-4.5-7.5-12a1 1 0 1 1 15 0c0 7-7.5 12-7.5 12z" fill="currentColor" /><path d="M12 9a1 1 0 0 0 0 6 1 1 0 0 0 0-6z" fill="white" />`;

    // omit scale for factor 1
    let scaleProp= scaleX!=1 ? ` scale(${scaleX})` : '';

    // add marker meta
    let metaAtt = meta ? ` data-meta='${JSON.stringify(meta)}'`: '';

    // wrap in transform g element
    return `<g class="${[classPre, 'marker'].filter(Boolean).join('-')}" transform="translate(${translateX} ${translateY})${scaleProp}"${cssAtt}${metaAtt}>${markerElMarkup}</g>`;
};


export function getMarkerSVGMarkup(markers = [], { projection = 'mercator', scale = 10000, x = 0, y = 0, revert = false, decimals = 0, classPre = 'svgeomin' } = {}) {
    let markersMarkup = '';

    for (let i = 0; i < markers.length; i++) {
        let marker = markers[i];
        let { lat = 0, lon = 0, bb = [0, 0, 24, 24], width = 24, height = null, styles = {}, icon = '', meta=null } = marker;

        let [xM, yM] = projectPoint(lon, lat, projection, scale, decimals, revert, x, y);

        xM -= x + bb[0];
        yM -= y + bb[1];

        // get custom icon
        let markerCustom = icon ? icon.trim() : null;
        let markerEl = null;
        let markerCustomMarkup = null;

        let vB = []

        if (markerCustom) {

            let isPathData = markerCustom.startsWith('M') || markerCustom.startsWith('m')

            // is pathdata string
            if (isPathData) {
                markerCustomMarkup = `<path d="${icon}"/>`
            }
            // is SVG or SVG geometry element try to parse
            else {
                try {
                    markerEl = new DOMParser().parseFromString(icon, 'image/svg+xml').documentElement;
                    if (markerEl.nodeName.toLowerCase() === 'svg') {
                        vB = markerEl.getAttribute('viewBox') ? markerEl.getAttribute('viewBox').replaceAll(',', '').split(' ').filter(Boolean).map(Number) : vB;

                        // prefer viewBox
                        if (vB.length) bb = vB;
                        markerCustomMarkup = icon.split('>').slice(1).join('>').split('</svg')[0]
                    } else {
                        markerCustomMarkup = icon
                    }
                } catch {
                    console.warn('no valid svg markup');
                }
            }
        }


        //Only for debugging: Render reference point
        //markersMarkup += `<circle cx="${xM.toFixed(3)}" cy="${yM.toFixed(3)}" r="2" fill="blue"/>`;

        // Pass calculated layout to marker generator
        let markerDef = getSvgMarker({ classPre, svg: markerCustomMarkup, x: xM, y: yM, width, height, bb, styles, meta });
        markersMarkup += markerDef;
    }

    return `<g class="${[classPre, 'markers'].filter(Boolean).join('-')}">${markersMarkup}</g>`;
}
