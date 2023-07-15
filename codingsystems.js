import papa from 'https://cdn.skypack.dev/papaparse-min';


function load_data(url,col_name){
    return new Promise( (resolve,reject) => {
        let codes=[]
        papa.parse(url,{
            download: true,
            header:true,
            skipEmptyLines: true,
            //step: function(results){
            //    codes.push(results.data[col_name])
            //}
            complete: function(results){
                results.data.forEach( (row) => {
                    codes.push(row[col_name])
                })
            }
        })
        resolve(codes)
    } )
}

function load_soc2010(){
    return load_data(
        "https://danielruss.github.io/codingsystems/soc2010_6digit.csv",
        "soc_code")
}

function load_soc1980() {
    return load_data(
        "https://danielruss.github.io/codingsystems/soc1980_most_detailed.csv",
        "soc_code")
}

function load_noc2011() {
    return load_data(
        "https://danielruss.github.io/codingsystems/noc_2011_4d.csv",
        "noc_code"
    )
}

export let codingsystems = {
    soc2010: await load_soc2010(),
    soc1980: await load_soc1980(),
    noc2011: await load_noc2011()
}