import { svgFromGeo } from "../../dist/svgeomin.esm.js";

let geoDataUrl = '../dist/json/ne_50m_admin_0_countries.geojson';
//geoDataUrl = '../dist/json/ne_110m_admin_0_countries.geojson';
//geoDataUrl = '../dist/json/ne_10m_admin_0_countries.geojson';
//geoDataUrl = '../dist/json/russia.json';
//console.log({geoDataUrl});

/**
 * markers to preject 
 * on SVG map
 */
let markers = [

    {
        lon:7.4521749,
        lat:46.9484742,
        icon:'',
        bb: [0,0,24,24],
        //width:32,
        styles:{color:'#136c5e'},
        meta:{
            name: 'Bern'
        }
    },

    {
        lon:8.5410422,
        lat:47.3744489,
        icon:'',
        bb: [0,0,24,24],
        //width:32,
        styles:{color:'#136c5e'},
        meta:{
            name: 'Zürich'
        }
    },

    {
        lon:16.3725042,
        lat:48.2083537,
        icon:'',
        bb: [0,0,24,24],
        //width:32,
        styles:'color:#136c5e',
        meta:{
            name: 'Wien'
        }
    },

    {
        lon:14.286198,
        lat:48.3059078,
        icon:'',
        bb: [0,0,24,24],
        //width:32,
        styles:{fill:'#136c5e'},
        meta:{
            name: 'Linz'
        }
    },



    {
        lon:13.3951309,
        lat:52.5173885,
        icon:'',
        bb: [0,0,24,24],
        width:32,
        styles:{fill:'#136c5e'},
        meta:{
            name: 'Berlin'
        }
    },

    {
        lon:10.0013165,
        lat:53.5501721,
        width:32,
        //height:32,
        //styles:{fill:'green', stroke:'white', strokeWidth: '0.25%'},
        styles:'fill:#136c5e; stroke:#fff; stroke-width:0%;',

        icon:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0, 0, 16 16"><path d="M6 0l-4 4v5l2 2h2l3-3h-4v-3l5.06-5zm4 3-3 3h4v3l-5 5 2 2 6-6v-5l-2-2z"/></svg>',
        icon:'<path d="M6 0l-4 4v5l2 2h2l3-3h-4v-3l5.06-5zm4 3-3 3h4v3l-5 5 2 2 6-6v-5l-2-2z"/>',
        icon:'M6 0l-4 4v5l2 2h2l3-3h-4v-3l5.06-5zm4 3-3 3h4v3l-5 5 2 2 6-6v-5l-2-2z',

        bb: [0,0,16,16],
        meta:{
            name: 'Hamburg'
        }
    },

    {
        lon:9.7385532,
        lat:52.3744779,
        icon:'',
        bb: [0,0,24,24],
        styles:{fill:'#136c5e'},
        meta:{
            name: 'Hannover'
        }
    },

    {
        lon:9.1800132,
        lat:48.7784485,
        icon:'',
        bb: [0,0,24,24],
        styles:{fill:'#136c5e'},
        meta:{
            name: 'Stuttgart'
        }
    },


    {
        lon:11.5753822,
        lat:48.1371079,
        icon:'',
        bb: [0,0,24,24],
        //styles:{fill:'#136c5e'},
        meta:{
            name: 'Munich'
        }
    },




];


(async () => {

    let options = {
        scale: 10000,
        //scale: 5000,

        // remove small areas e.g island
        minArea: 1,
        //removeIslands: 0,

        // filter features
        //features:[  'ch', 'at', {ISO_A2_EH: 'de'}, {name:'denmark'} ],
        //features:[ 'russia'],
        //features:[ 'france'],
        features: [{ continent: 'europe' }],

        // exclude features with these property values
        //exclude: ['russia'],
        features: ['europe'],

        //features: [],
        features: ['switzerland'],
        features: ['germany', 'switzerland', 'austria'],
        features: ['fiji'],
        features: ['italy', 'vatican'],
        
        features: ['germany', 'switzerland', 'austria'],



        features: ['russia'],
        
        features: ['germany', 'switzerland', 'austria'],
        
        features: ['vatican'],
        
        features: [],
        features: ['europe'],
        //features: [{continent:'europe'}],
        exclude: ['russia'],
        
        features: ['germany', 'switzerland', 'austria'],


        // split sub features e.g islands
        split: 0,

        // add meta
        meta: 1,

        // filter properties
        //properties : ['ISO_A2', 'id', 'name'],
        properties: ['name'],


        // apply RDP simplification
        simplify: 10,
        //simplify: 0,

        classPre: 'svgeomin',

        projection: 'equirectangular',
        projection: 'miller',
        projection: 'mercator',

        // add markers
        markers,

        // map css
        //css: `.svgeomin-feature{fill:#ccc; stroke-width:0.25%; stroke:red}`,
        cssInline :`fill:#ccc; stroke:#fff; color:#555`

    }


    /*
    let km = 0.111;
    let km2sq = km_to_squared_distance(km)
    console.log({ km2sq });
    */


    /**
     * filter geojson
     */

    /*
    // string test
    let geoDataRemote = await fetch(geoDataUrl);
    let geoDataString = await geoDataRemote.text();
    */


    // filter from url
    let geoFiltered = await filterGeoData(geoDataUrl, options);
    console.log({ geoFiltered });


    // test: remove geodata filter options
    delete options.features;
    delete options.exclude;

    console.log(options);


    let t0 = performance.now();
    let svGeo = await svgFromGeo(geoFiltered, options);
    //let svGeo = await svgFromGeo(geoDataUrl, options);
    let t1 = +(performance.now() - t0).toFixed(3);
    console.log({ t1 });
    let { svg, bb, x, y, bbGeo, scale, size } = svGeo;

    /**
     * convert simplified 
     * back to geojson
     */
    let geoOptions = {
        decimals: 4,
        //properties: ['name']
    }
    let geoJSONSimplified = svGeo.getGeoJson(geoOptions)
    /*
    console.log(geoJSONSimplified);
    console.log(JSON.stringify(geoJSONSimplified));
    */


    console.log(svGeo);
    console.log({ size });
    //console.log(size,'KB');


    // render 
    //svGeo.render('#svgeoWrap')
    svGeo.render(svgeoWrap)
    //svgeoWrap.innerHTML = svg;

    // get data URL and add to link
    let dataURL = svGeo.getUrl({dataUrl:true})
    //console.log(dataURL);
    linkDownload.href = dataURL;


    // download geojson
    let dataURLGeo = svGeo.getUrl({data:'geojson', decimals:2})
    linkDownloadGeo.href = dataURLGeo


})();
