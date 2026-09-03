
export async function filterGeoData(geoData = {}, {
    features = [],
    exclude = [],
    properties = []
} = {}) {

    // fetch and parse geoData
    if (typeof geoData === 'string') {
        //console.log('is string', geoData);

        // is URL
        if (geoData.startsWith('https://') || geoData.includes('.json') || geoData.includes('.geojson')) {
            let res = await fetch(geoData);
            if (res.ok) {
                geoData = await res.json()
            }
        }
        // is stringified
        else {
            try {
                geoData = JSON.parse(geoData);
            } catch {
                geoData = null;
                console.warn('No valid geoData input');
            }

            // exit: has no relevant data
            if (geoData.features === undefined || geoData.features[0].geometry === undefined) {
                console.warn('No valid geogeoData input');
                geoData = null;
            }
        }
    }

    // exit
    if (geoData && typeof geoData !== 'object') return;

    // check if properties are to filter
    let propLen = Object.keys(geoData.features[0].properties);
    let propsToFilter = properties.length && propLen!==properties.length

    // no filters - ready to go
    if (!features.length &&!exclude.length && !propsToFilter ) {
        //console.log('ready to go!');
        return geoData
    }

    let allProperties = new Set([]);
    let filterVals = new Set([]);
    let excludedVals = new Set(exclude);
    let geoFeatures = geoData.features;

    /**
     * collect all 
     * required property keys
     * from property and final attribute 
     * arrayinput
     */
    properties.forEach(propName => {
        allProperties.add(propName.toLowerCase())
    });


    features.forEach(f => {
        if (typeof f === 'object') {
            let allkeys = Object.keys(f)
            allkeys.forEach(key => {
                allProperties.add(key.toLowerCase())
                let val = isNaN(f[key]) ? f[key].toLowerCase() : f[key];
                filterVals.add(val)
            })
        }
        else {
            filterVals.add(f)
        }
    });

    //console.log({filterVals});


    /**
     * normalize features
     */
    let featuresFiltered = [];
    let excludedIdx = new Set([]);

    for (let i = 0; i < geoFeatures.length; i++) {
        let feature = geoFeatures[i];
        let { properties } = feature;
        let propsLc = {}
        for (let prop in properties) {
            let propLc = prop.toLowerCase();
            let valLc = isNaN(properties[prop]) ? properties[prop].toLowerCase() : properties[prop];

            if (excludedVals.has(valLc)) {
                excludedIdx.add(i)
                continue
            }

            if (allProperties.size) {
                if (allProperties.has(propLc)) {
                    propsLc[propLc] = valLc
                }
                else if (filterVals.has(valLc)) {
                    propsLc[propLc] = valLc
                }
            } else {
                if (filterVals.has(valLc)) {
                    propsLc[propLc] = valLc
                }
            }
        }
        feature.properties = propsLc;
    }

    /**
     * filter
     */
    for (let i = 0; i < geoFeatures.length; i++) {
        let feature = geoFeatures[i];
        let { properties } = feature;
        let vals = Object.values(properties);
        //console.log(properties, vals);

        if (excludedIdx.has(i)) {
            continue
        }


        let filtered = vals.filter(it => filterVals.has(it));


        if (filtered.length) {
            featuresFiltered.push(feature)
        }
    }

    if (featuresFiltered.length) {
        geoData.features = featuresFiltered;
    }

    return geoData

}