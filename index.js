import { codingsystems } from "./codingsystems.js"
import { socwalk } from "./socwalk.js"
window.socwalk = socwalk

const stat = document.getElementById("status")
stat.innerText = "... in index.js ..."

let use_model = null

// once the universal sentence encoder is loaded, we can load the data...
stat.innerText = `... Loading Universal sentence encoder ...`
use.load().then((model) => {
    use_model = model
    stat.innerText = `... Universal sentence encoder is loaded ...`
}).then(() => {
    stat.innerText = `... loading socwalk model ...`
    document.getElementById("model_select").dispatchEvent(new Event("change"))
})


function reset_input(){
    document.querySelectorAll([".progress-bar"]).forEach(pb=>{
        pb.innerText = ''
        pb.style.width = `0%`
    })
    results_to_download=null;
    document.getElementById("download_button").disabled = true
}

// the model has changed!!
document.getElementById("model_select").addEventListener("change", (event) => {
    reset_input()
    console.log(event.target.value)
    if (event.target.value == -1) {
        stat.innerText = ""
        return
    }
    stat.innerText = `load model: ${event.target.value}`
    socwalk.load_model(`https://danielruss.github.io/soc_walk_models/${event.target.value}/model.json`)
    document.getElementById("run_button").dispatchEvent(new Event("active"))
})

// the file input has changed.. check the run button
document.getElementById("file_input").addEventListener("change", (event) => {
    reset_input()
    document.getElementById("run_button").dispatchEvent(new Event("active"))
})

// the socwalk model has changed.. check the run button
document.body.addEventListener("socwalk_model_changed", (event) => {
    console.log("... the socwalk model changed ...")
    document.getElementById("run_button").dispatchEvent(new Event("active"))
})

// socwalk finished turn on the download button...
document.body.addEventListener("download_ready", (event) => {
    console.log("... download ready ...")
    document.getElementById("download_button").disabled = false
})

// download
document.getElementById("download_button").addEventListener("click", (event) => {
    console.log(results_to_download, event.target)
    if (results_to_download == null) {
        stat.innerText = "... ERROR: Lost the results???? ..."
        return
    }
    let n = parseInt(document.getElementById("nresults").value ?? 10)
    console.log(n)
    let num_soc2010_codes = codingsystems['soc2010'].length

    let download = results_to_download.map(row =>
        row.inverseSortIndices().map(i => ({ score: row[i], code: codingsystems['soc2010'][i] }))
    )
    if (n < num_soc2010_codes) {
        download.forEach((r) => r.splice(n))
    }

    let convert_to_csv = document.getElementById('csv_button').checked;
    let dfilename=`${crypto.randomUUID()}`
    if (document.getElementById("file_input").files[0]?.name){
        dfilename = document.getElementById("file_input").files[0].name.replace(/\.(\w+)$/,"_socwalk_results")
    }
    dfilename+=(convert_to_csv)?".csv":".json"
            
    if (convert_to_csv) {
        download = download.map((row, indx) => row.reduce((ov, pv) => `${ov},${pv.code},${pv.score}`, results_to_download.id[indx]))
        download.unshift("Id," + Array(n).fill().map((_, i) => `soc2010_${i + 1},score_${i + 1}`).join(","))
        download=download.join("\n")
        download_blob(dfilename,download,"text/csv")
    }else {
        download_blob(dfilename,JSON.stringify(download),"application/json")
    }



})
function download_blob(filename, text, mime_type='text/csv') {
    var a = window.document.createElement('a');
    a.href = window.URL.createObjectURL(new Blob([text], {type: mime_type}));
    a.download = filename;
    
    // Append anchor to body.
    document.body.appendChild(a);
    a.click();
    
    // Remove anchor from body
    document.body.removeChild(a);
    
}



// check if the run button should be active... (has socwalk model and has a file...)
document.getElementById("run_button").addEventListener("active", (event) => {
    event.target.disabled = (socwalk.has_model()) || (document.getElementById("file_input").value == "")
})

function pb_callback(pbElementId) {
    return function (x) {
        let pb = document.getElementById(pbElementId)
        let pct = Math.round(100 * x)
        pb.innerText = `${pct}%`
        pb.style.width = `${pct}%`
    }
}

// run socwalk
let results_to_download = null
document.getElementById("run_button").addEventListener("click", async (event) => {
    reset_input();
    
    // parsing the csv data...
    stat.innerText = "... parsing csv ..."
    let model_select = document.getElementById("model_select")
    let codingsystem = model_select.options[model_select.selectedIndex].dataset.codingsystem
    let input_data = await socwalk.parse_csv(document.getElementById("file_input").files[0])
    let features = await socwalk.embed(use_model, input_data, codingsystem, pb_callback("embedding_pb"))
    results_to_download = await socwalk.crosswalk(features, pb_callback("xw_pb"))
    window.results_to_download = results_to_download;
    document.body.dispatchEvent(new Event("download_ready"))

})
