import papa from 'https://cdn.skypack.dev/papaparse-min';
import { codingsystems } from './codingsystems.js';

window.codingsystems = codingsystems
  
Array.prototype.sortIndices = function(sortfun){
    let default_sfun = (a,b)=> (this[a]<this[b])?-1:(this[a]==this[b])?0:1 
    let sfun = sortfun ?? default_sfun
    return Array.from(this.keys()).sort( sfun )
}
Array.prototype.inverseSortIndices = function(sortfun){
    let default_sfun = (a,b)=> (this[a]<this[b])?1:(this[a]==this[b])?0:-1 
    let sfun = sortfun ?? default_sfun
    return Array.from(this.keys()).sort( sfun )
}
let socwalk_model = null;
function has_model() {
    socwalk_model != null
}

function load_model(model_url) {
    const model = tf.loadGraphModel(model_url).then(
        model => {
            document.body.dispatchEvent(new CustomEvent("socwalk_model_changed", {
                detail: {
                    model: model
                }
            }))
            socwalk_model = model;
            window.socwalk_model=socwalk_model
        })
}

function parse_csv(file) {
    console.log(` ... parsing ${file.name} ...`)
    return new Promise(function (resolve, reject) {
        papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: function (results, file) {
                console.log("... finished parsing ...", results, file)
                resolve(results.data)
            },
        })
    })
}

function no_callback(x) {
    console.log(`${(100 * x).toFixed(2)}% complete`)
}

/**
 * embeds the JobTitle, JobTasks using the
 * Universal sentence encoder...
 * 
 * pb_callback is a function that takes a 
 * value between 0->1 (%complete...)
 */
async function embed(use, values, codingsystem, pb_callback = no_callback) {
    console.log(values)
    // noc2011 and 2016 are identical.  map to 2011
    codingsystem = (codingsystem == "noc2016") ? "noc2011" : codingsystem

    let initvalue = { Id: [], JobTask: [], JobTitle: [] };
    initvalue[codingsystem] = [];
    let colData = values.reduce((acc, curr) => {
        acc.Id.push(curr.Id)
        acc.JobTitle.push(curr.JobTitle)
        acc.JobTask.push(curr.JobTask)
        acc[codingsystem].push(curr[codingsystem])
        return acc
    }, initvalue)
    console.log(colData)

    if (colData.JobTitle.length != colData.JobTask.length)
        throw new Error('Job Titles and JobTasks are not the same size!');

    let embed_chunk_size = 500;
    let features = {
        title: [],
        task: []
    }

    pb_callback(0)
    for (let indx = 0; indx < colData.JobTitle.length; indx += 500) {
        let last = Math.min(indx + 500, colData.JobTitle.length)
        console.log(`embed chunk ${indx} ${last}`)
        features.title.push(await use.embed(colData.JobTitle.slice(indx, last)))
        features.task.push(await use.embed(colData.JobTask.slice(indx, last)))
        pb_callback(last / colData.JobTitle.length)
    }
     
    console.log(" ...... passed loop .....")
    features[codingsystem] = colData[codingsystem].map(code => tf.oneHot(
        [ codingsystems[codingsystem].indexOf(code) ],
        codingsystems[codingsystem].length,
        1,0,'float32'))

    features.Id = colData.Id
    features.title = tf.concat(features.title)
    features.task = tf.concat(features.task)
    features[codingsystem] = tf.concat(features[codingsystem])

    window.features = features
    return features;
}


function makeMatrix(array,numCols){
    let matrix=[]
    while(array.length) matrix.push(array.splice(0,numCols));
    return matrix
}



async function crosswalk(features,pb_callback=no_callback) {
    pb_callback(0)
    let ids = features.Id;
    delete features.Id
    let prediction = await socwalk_model.predict(features)
    window.prediction=prediction
    pb_callback(1)

    let mat = Array.from(prediction)
    const matrix = makeMatrix(
        Array.from(prediction.dataSync()),
        codingsystems.soc2010.length)
    matrix.id=ids
    return matrix
}

export let socwalk = {
    parse_csv,
    load_model,
    has_model,
    embed,
    crosswalk
}