[![npm version](https://img.shields.io/npm/v/svgeomin)](https://www.npmjs.com/package/svgeomin)
[![license](https://img.shields.io/npm/l/svgeomin)](https://www.npmjs.com/package/svgeomin)
[![CDN](https://img.shields.io/badge/CDN-jsDelivr-E84D3D?style=flat)](https://cdn.jsdelivr.net/npm/svgeomin@latest/dist/svgeomin.min.js)
[![CDN](https://img.shields.io/badge/CDN-unpkg-blue?style=flat)](https://www.unpkg.com/svgeomin@latest/dist/svgeomin.js)



<div align="center" style="text-align:center">
<img width="100" height="100" style="display:inline-block" src="./favicon.svg">
<h1 align="center">svgeomin</h1>
<h2 align="center">Create compact map SVGs and GeoJson subsets</h2>
</div>   


## Key features
*svgeomin* has a strong focus on SVG application – most importantly creating lightweight SVG map assets. However, it also comes with some handy geoJson helpers to reduce a given data source to the actually needed geo features.
* topology aware Ramer-Douglas-Peucker polygon simplification for Geojson supsets and SVG
* removal of small sub features e.g islands or exclaves 
* advanced SVG pathData minification (e.g relative commands)
* multiple projection modes: Web Mercator, Miller, Behrmann, Equi-rectangular
* property based filtering of geodata feautures for subset creation
* convert/revert SVG to geoJson
* add markers to SVG using common lon/lat coordinates

## TOC
* [Key features](#key-features)
* [The challenges of geodata (why another library)](#the-challenges-of-geodata-why-another-library)
  + [svgeomin might be interesting if …](#svgeomin-might-be-interesting-if)
  + [not very suitable for you if …](#not-very-suitable-for-you-if)
* [Usage](#usage)
  + [CDN](#cdn)
  + [Todos](#todos)
  + [Basic example: render from src URL](#basic-example-render-from-src-url)
  + [With options: Filter features and simplify](#with-options-filter-features-and-simplify)
* [Options](#options)
* [SVGEO object and API methods](#svgeo-object-and-api-methods)
* [Topology aware simplification](#topology-aware-simplification)
  + [erm, but I still see tiny gaps?](#erm-but-i-still-see-tiny-gaps)
* [Demos](#demos)
* [Credits](#credits)
  + [Recommendations (tools and documentations)](#recommendations-tools-and-documentations)
  + [Related projects](#related-projects)



## The challenges of geodata (why another library)
Geojsons are most often massive – 10K+ of coordinates are rather the lower end of the scale. For reasonably sized SVG assets, geometry simplifications are rather mandatory. But when we apply these (Ramer Douglas Peucker, Visvalingam etc) for each feature (e.g country border) individually we often get gaps between polygon edges. 

Advanced map/geodata or data visualization libraries – e.g [d3](https://github.com/d3/d3) or [mapshaper](https://mapshaper.org) – have developed sophisticated solutions such as the [TopoJson](https://github.com/topojson/topojson ) superset for specifying shared polygon edges to allow for predictable simplification results.

However, these libraries are more focused on map specific use cases and highly complex. Besides, they often provide only basic control over the SVG output – resulting in rather huge markup sizes.

To put it differently: 
### svgeomin might be interesting if …
* you just need a convenient way to create compact svg maps
* shrink a massive geojson to used features

### not very suitable for you if …
* if you're already a d3 or map pro 
* your focus is on interactive map applications

## Usage

Svgeomin can be loaded as IIFE or ESM module.
For testing you can require it via CDN e.g.


### CDN

**IIFE**  
```html
<script src="https://cdn.jsdelivr.net/npm/potrace-plus@latest/dist/potrace-plus.min.js"></script>

```
**ESM**  
```js
import { svgFromGeo } from "https://cdn.jsdelivr.net/npm/svgeomin@latest/dist/svgeomin.esm.min.js";
```

### Todos
* Node.js is currently not supported as some helpers require DOM Parser API.

### Basic example: render from src URL

Svgeomin allows multiple input formats: 
* geojson URL (requires async function call)
* stringified geojson
* parsed geojson object

```js
// ESM import – not needed for IIFE build
import { svgFromGeo } from "./dist/svgeomin.esm.js";

// static geojson asset
let geoDataUrl = 'geoData.geojson';

// needs async when loading from URL
(async () => {
    // process
    let svGeo = await svgFromGeo(geoDataUrl);

    // render/append to HTML target element
    let target = document.getElementById('svgeoWrap');

    svGeo.render(target)
})();
```
See [basic.html](https://herrstrietzel.github.io/svgeomin/demo/basic.html).

### With options: Filter features and simplify
You can filter geodata features by property names e.g to show only a selection of countries.
Also, you can apply multiple options e.g for Ramer-Douglas-Peucker simplification.  

```js
// ESM import – not needed for IIFE build
import { svgFromGeo } from "./dist/svgeomin.esm.js";

// static geojson asset
let geoDataUrl = 'geoData.geojson';

// needs async when loading from URL
(async () => {

    let options = {
        scale: 10000,

        // remove small areas e.g island
        minArea: 1,

        // filter to these features
        features: ['germany', 'switzerland', 'austria'],

        // filter properties
        properties: ['name'],
    }

    // process
    let svGeo = await svgFromGeo(geoDataUrl, options);

    // render/append to HTML target element
    let target = document.getElementById('svgeoWrap');

    svGeo.render(target)
})();
```
See [demo/options.html](https://herrstrietzel.github.io/svgeomin/demo/options.html).

## Options

| parameter | type | description | default/values |
|--|--|--|--|
|features|array|features to filter|empty|
|properties|array|properties to include in filtered Geojson and SVG output|empty|
|exclude|array|exclude feature items by property values|empty|
|scale|number|scale to reasonable coordinate space to avoid floating points and tiny SVG viewBoxes|10000|
|simplify|number|threshold for RDP simplification ~in km|0|
|minArea|number|remove small feautes e.g islands or exclaves by km² threshold (sloppy area approximation) |0|
|split|number/Boolean|create path el for each sub poly e.g islands |0|
|meta|number/Boolean|add meta for original geodata reference in SVG |0|
|classPre|string|CSS classname prefix for SVG elements |'svgeomin'|
|css|string|append CSS `<style>` element to SVG |''|
|cssInline|string|main svg inline css |''|
|projection|string |changes projection method | 'mercator' (Web Mercator). `mercator`,`miller`, `equirectangular` (Plate carrée), `behrmann` |projection method. See [wikipedia: List of map projections](https://en.wikipedia.org/wiki/List_of_map_projections) |
|markers|array| add map markers to SVG |empty|
|**marker params**|| ||
|lon|number| longitude |0|
|lat|number| latitude |0|
|icon|string| Add custom SVG icon: Accepts SVG markup or pathData strings |'' – inserts default marker icon|
|bb|array| controls alignment of custom icon: `x`, `y`, `width`, `height` |[0,0,24,24]|
|width|number| controls size of marker icon |24|
|styles|object/string| Add CSS properties for markers: CSS string or object. When using objects you need to camleCase property names (e.g `strokeWidth`) |''|
|meta|object| adds properties as data-attributes to marker element |0|

## Topology aware simplification
When applying polygon simplification algorithms (e.g Ramer Douglas Peucker) on adjacent/neighboring polygons we often get gaps between shapes. 

To prevent this we first analyze the topology of all filtered features to detect shared polygon arcs to ensure a consistent edge simplification.

## SVGEO object and API methods
Once you parsed the geoJson via `svgFromGeo()` an object is created which allows further processing:

```js 
// init object
const SVGEO = await svgFromGeo(geoDataUrl, options);

// retrieve properties directly from object
let { svg, bb, x, y, bbGeo, scale, size } = SVGEO;

// render
SVGEO.render(svgeoWrap)

// get GeoJson
let geojsonOptions = {
    // round to decimals
    decimals:4,

    // name for feature collection
    name: 'svgeomin',

    // properties to include
    properties:[],
}
let geojson = SVGEO.getGeoJson(geojsonOptions)

/**
 * get object or data 
 * URLs for download
 */
let urlOptions = {
    // return svg or json
    data='svg',

    //round to decimals
    decimals=3

    // return dataURL or object URL
    dataUrl=true,

    // add width and height attributes for SVG
    addDimensions=true

    // add SVG xlink namespace for legacy apps
    addXlink=false

}
let dataUrl = SVGEO.getUrl(urlOptions)

```

### erm, but I still see tiny gaps?
1. The aforementioned topology simplification takes for granted the GeoData itself doesn't have any gaps
2. if you notice thin hairlines in SVG rendering: it is simply due to sub-pixel rendering. Anti-aliasing will inevitable produce tiny gaps due to pixel-grid fitting problems. 

**Quick fix** 
* Apply a thin stroke to your paths
* disable anti-aliasing via SVG [`shape-rendering`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/shape-rendering) attribute: `shape-rendering="crispEdges"` should do the trick.

## Demos
*   [SVG from GeoJson (basic)](https://herrstrietzel.github.io/svgeomin/demo/basic.html) | [codepen](https://codepen.io/herrstrietzel/pen/XJMXNxN?editors=1010)
*   [Apply options: filter and simplify](https://herrstrietzel.github.io/svgeomin/demo/options.html) | [codepen](https://codepen.io/herrstrietzel/pen/dPvGOLm?editors=1010)
*   [filtered and add markers](https://herrstrietzel.github.io/svgeomin/demo/filtered_features_markers.html)
*   [Get filtered and minified GeoJson (only selected features)](https://herrstrietzel.github.io/svgeomin/demo/filter_geojson.html)
*   [SVG to GeoJson (reverse projection)](https://herrstrietzel.github.io/svgeomin/demo/svg2geo.html)
*   [Geosearch helper (find lon/lat, show geojson on map)](https://herrstrietzel.github.io/svgeomin/demo/geosearch.html)


## Credits
* Sample geojson was retrieved from [nvkelso's natural-earth-vector](https://github.com/nvkelso/natural-earth-vector)
* [Leaflet](https://github.com/leaflet/Leaflet): Volodymyr Agafonkin and contributors. Leaflet is used in geojson sample rendering and geo search helper
* [osm-search/nominatim](https://github.com/osm-search/Nominatim) – used in geo search helper 


### Recommendations (tools and documentations)
* [geojson.io](https://geojson.io): A webapp to inspect and edit geojson data
* [svg-path-editor](https://yqnn.github.io/svg-path-editor): A webapp to inspect and edit SVG pathdata
* [mapshaper](https://mapshaper.org): sophisticated geodata conversions and simplifications
* [wikipedia: List of map projections](https://en.wikipedia.org/wiki/List_of_map_projections)

### Related projects
* [poly-simplify](https://github.com/herrstrietzel/poly-simplify): Simplify/reduce polylines/polygon vertices in JS
* [svg-path-simplify](https://github.com/herrstrietzel/svg-path-simplify): Simplify SVG Bézier paths while maintaining their shape