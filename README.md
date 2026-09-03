
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


## The challenges of geodata (why another library)
Geojsons are most often massive – 10K+ of coordinates are rather the lower end of the scale. For reasonably sized SVG assets, geometry simplifications are rather mandatory. But when we apply these (Ramer Douglas Peucker, Visvalingam etc) for each feature (e.g country border) individually we often get gaps between polygon edges. 

Advanced map/geodata libraries have developed solutions such as the TopoJson superset for specifying shared polygon edges to allow for predictable simplification results.
However, these libraries are more focused on map specific use cases and highly complex. Besides, they often provide only basic control over the SVG output – resulting in rather huge markup sizes

## Usage

### Basic example: render from src URL
```js
// esm
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
See [basic.html](demo/basic.html).

### With options: Filter features and simplify
```js
// esm
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
See [demo/options.html](demo/demo/options.html).





#### Recommendations (tools and documentations)
* [geojson.io](https://geojson.io): A webapp to inspect and edit geojson data
* [svg-path-editor](https://yqnn.github.io/svg-path-editor): A webapp to inspect and edit SVG pathdata
