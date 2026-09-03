import {svgFromGeo, SVGEO} from './main.js';
import {filterGeoData} from './geojson_filter.js';
import {svg2GeoJson} from './geojson_from_svg.js';

export {svg2GeoJson as svg2GeoJson};
export {filterGeoData as filterGeoData};
export {svgFromGeo as svgFromGeo};



SVGEO.prototype.getUrl = function ( { data='svg', decimals=-1, addXlink=false, addDimensions=true, dataUrl = false } = {}) {
    let url = ''
    let {svg='', svgEl=null, bb={}} = this;

    // return geojson
    data = data.toLowerCase();
    if(data==='geojson' || data==='geo' || data==='json'){
        let geodata = this.getGeoJson({decimals});
        let json = JSON.stringify(geodata);
        let blob = new Blob([json], {type:'application/json'})
        url = URL.createObjectURL(blob)
        return url;
    }

    // return svg
    if(!svg && !svgEl) return '';

    // parse from markup
    if(!svgEl){
        svgEl = new DOMParser().parseFromString(svg, 'text/html').querySelector('svg');
    }

    if(addXlink){
        svgEl.setAttribute('xmlns:xlink','http://www.w3.org/1999/xlink')
    }

    if(addDimensions){
        svgEl.setAttribute('width', bb.width)
        svgEl.setAttribute('height', bb.height)
    }

    let xml = new XMLSerializer().serializeToString(svgEl);

    if(dataUrl){
        xml = xml.replaceAll('"',"'")
        // Handle nested single quotes inside attribute values
        .replace(/="([^"]*)"/g, (match, p1) => {
            const content = p1.replace(/'/g, "&quot;");
            return `='${content}'`;
        })
        // id references and colors
        .replace(/#/g, "%23");
        url = `data:image/svg+xml,${xml}`;

    }else{
        let blob = new Blob([xml], {type:'image/svg+xml'})
        url = URL.createObjectURL(blob)
    }
    return url

}

SVGEO.prototype.render = function (target = null, { overwrite = true } = {}) {

    if (!target) return;

    if(typeof target ==='string'){
        target = document.querySelector(`${target}`)
        //console.log(target);
    }

   if(!target.nodeName) return

    if (target) {
        let svgEl = new DOMParser().parseFromString(this.svg, 'text/html').querySelector('svg');

        // delete all
        if (overwrite) {
            [...target.children].forEach(child=>{child.remove()});
        }

        // add to object
        this.svgEl = svgEl;
        target.append(svgEl)
    };

}


SVGEO.prototype.getGeoJson = function ({ decimals = -1, name = 'svgeomin', properties = [] } = {}) {
    let geogeoData = {
        type: "FeatureCollection",
        name,
        features: [],
    }

    //let featuresFiltered = this.featureArr;
    let propertiesFiltered = properties;
    //console.log({featuresNew});

    for (let feature of this.featureArr) {
        let { properties, polys } = feature
        //console.log(properties, polys);

        let type = polys.length > 1 ? "MultiPolygon" : "Polygon";

        //round
        if (decimals > -1) {
            polys = polys.map(poly => poly.map(pt => pt.map(val => +val.toFixed(decimals))))
        }

        let polysN = type === 'MultiPolygon' ? polys.map(poly => [poly]) : polys;

        //console.log({type, polysN});

        let propertiesN = {}
        for (let prop in properties) {
            if (propertiesFiltered.length && propertiesFiltered.includes(prop)) {
                propertiesN[prop] = properties[prop]
            }
        }

        let featureN = {
            type: 'Feature',
            properties: propertiesN,
            geometry: {
                type,
                coordinates:
                    polysN
            }
        }
        geogeoData.features.push(featureN)
    }

    return geogeoData

}



if (typeof window !== 'undefined') {
    window.svg2GeoJson = svg2GeoJson;
    window.svgFromGeo = svgFromGeo;
    window.filterGeoData = filterGeoData;
}

