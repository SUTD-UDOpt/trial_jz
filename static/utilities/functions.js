// THREE bit
import * as MAT from './materials.js'

export function updateDeets(){
    document.getElementById("detailsMax").style.display = "block"

    document.getElementById("var0").innerHTML = document.getElementById("input1").value;
    document.getElementById("var1").innerHTML = document.getElementById("input2").value;
    document.getElementById("var2").innerHTML = document.getElementById("BKeyXScale1").value/100 + "-" + document.getElementById("BKeyXScale2").value/100
    document.getElementById("var3").innerHTML = document.getElementById("BKeyYScale1").value/100 + "-" + document.getElementById("BKeyYScale2").value/100
    document.getElementById("var4").innerHTML = Math.round(document.getElementById("GridAngle1").value*1.8) + "-" + Math.round(document.getElementById("GridAngle2").value*1.8)
    document.getElementById("var5").innerHTML = document.getElementById("GridSpacing1").value/5+10 + "-" + (document.getElementById("GridSpacing2").value/5+10)
    document.getElementById("var6").innerHTML = document.getElementById("ParcelStoreyScale1").value/100 + "-" + document.getElementById("ParcelStoreyScale2").value/100
    document.getElementById("var7").innerHTML = document.getElementById("input5").value;
    document.getElementById("var8").innerHTML = document.getElementById("input6").value;

    recordRaw(inheritTime, "parameterInput", "GenCount", document.getElementById("input1").value);
    recordRaw(inheritTime, "parameterInput",  "PopCount", document.getElementById("input2").value);
    recordRaw(inheritTime, "parameterInput",  "BKeyXScale", document.getElementById("BKeyXScale1").value/100 + "-" + document.getElementById("BKeyXScale2").value/100);
    recordRaw(inheritTime, "parameterInput",  "BKeyYScale", document.getElementById("BKeyYScale1").value/100 + "-" + document.getElementById("BKeyYScale2").value/100);
    recordRaw(inheritTime, "parameterInput",  "GridAngle", Math.round(document.getElementById("GridAngle1").value*1.8) + "-" + Math.round(document.getElementById("GridAngle2").value*1.8));
    recordRaw(inheritTime, "parameterInput",  "GridSpacing", document.getElementById("GridSpacing1").value/5+10 + "-" + (document.getElementById("GridSpacing2").value/5+10));
    recordRaw(inheritTime, "parameterInput",  "ParcelStoreyScale", document.getElementById("ParcelStoreyScale1").value/100 + "-" + document.getElementById("ParcelStoreyScale2").value/100);
    recordRaw(inheritTime, "parameterInput", "MutationRate", document.getElementById("input5").value);
    recordRaw(inheritTime, "parameterInput",  "CrossoverRate", document.getElementById("input6").value);

    if (weighted){
        document.getElementById("detailsWeight").style.display = "block"
        document.getElementById("var10").innerHTML = document.getElementById("input3").value;
        document.getElementById("var11").innerHTML = document.getElementById("input4").value;

        recordRaw(inheritTime, "parameterInput",  "Orientation Weight", document.getElementById("input3").value);
        recordRaw(inheritTime, "parameterInput",  "Blocked Views Weight", document.getElementById("input4").value);
    }
}

export function toggleMaterial(obj, sel){
    if (sel){
        obj.material = MAT.selParcelMat
    } else {
        obj.material = MAT.parcelMat
    }
}

export function clearScene(){
    for (let i = scene.children.length - 1; i >= 0; i--) { 
        var obj = scene.children[i];
        if (obj.name == "genBuild" || obj.name == "genAcs"){
            scene.remove(obj); 
        }
    }
}

export function resetState(){
    clearScene();
    toggleMaterial(parcels[selectedKey], false)
    parcels[selectedKey].visible = true
    boundary[selectedKey].visible = false
    selectedKey = undefined
    formAnswered = false
    instructionReady = false
    pressedResult = undefined

    document.getElementById("output").innerHTML = "";
    document.getElementById("parcelButton").classList.remove("special");
    document.getElementById("parcelButton").classList.add("disabled");
    document.getElementById("parcelButton").disabled = true;
    document.getElementById("selectedParcel").innerHTML = "";
    document.getElementById("detailsMax").style.display = "none"
    document.getElementById("detailsWeight").style.display = "none"

    for (let i=0; i<7; i++){
        document.getElementById("var" + i).innerHTML = ""
    }
    for (let i=0; i<2; i++){
        document.getElementById("var1" + i).innerHTML = ""
    }
}

export function meshToThreejs(mesh, material) {
    const loader = new THREE.BufferGeometryLoader()
    const geometry = loader.parse(mesh.toThreejsJSON())
    return new THREE.Mesh(geometry, material)
}

export function renderParcels(data, type){
    let keyList = Object.keys(data)
    let numKeys = keyList.length
    for (let i=0; i<numKeys; i++){
        try{
            var key = keyList[i]
            var mesh = rhino.DracoCompression.decompressBase64String(data[key])
            if (type == "parcel"){
                var threeMesh = meshToThreejs(mesh, MAT.parcelMat)
            } else if (type == "boundary"){
                var threeMesh = meshToThreejs(mesh, MAT.boundaryMat)
            }
            threeMesh.name = type
            threeMesh.key = key
            renderParcel(threeMesh, key, type);
        } catch(err){
            console.log("aiyo")
        }
    }
}

export function renderParcel(mesh, key, type){
    if (type == "parcel") {
        parcels[key] = mesh;
    } else if (type == "boundary"){
        boundary[key] = mesh;
        mesh.visible = false;
    }
    mesh.scale.set(uniScale, uniScale, uniScale)
    mesh.position.set(-(siteCenter[0]*uniScale), -(siteCenter[1]*uniScale), 0)
    mesh.castShadow = true
    mesh.receiveShadow = true
    scene.add(mesh);
}

export function renderBuilding(mesh) {
    mesh.scale.set(uniScale, uniScale, uniScale)
    mesh.position.set(-(siteCenter[0]*uniScale), -(siteCenter[1]*uniScale), 0)
    mesh.castShadow = true
    scene.add(mesh);
}

export function renderBase(mesh) {
    mesh.scale.set(uniScale, uniScale, uniScale)
    mesh.position.set(-(siteCenter[0]*uniScale), -(siteCenter[1]*uniScale), 0)
    mesh.receiveShadow = true
    scene.add(mesh);
}

export async function vis(dracoBuild, dracoBase, nameID){
    // hide spinner
    document.getElementById('loader').style.display = 'none'
            
    // clear the scene
    clearScene();

    if (dracoBuild){
        let Mesh = rhino.DracoCompression.decompressBase64String(dracoBuild)
        let ThreeMesh = meshToThreejs(Mesh, MAT.normalMat)
        ThreeMesh.name = nameID
        renderBuilding(ThreeMesh);

        let baseMesh = rhino.DracoCompression.decompressBase64String(dracoBase)
        let baseThreeMesh = meshToThreejs(baseMesh, MAT.baseMat)
        baseThreeMesh.name = nameID
        renderBase(baseThreeMesh);
    } else {
        console.error(`Not possible to build...`);
    }
}

// UI bit
export function visualizeFunction(i){
    let buildingMesh = lastResult[i]["BuildingDraco"][1]
    let baseMesh = lastResult[i]["BuildingDraco"][0]
    vis(buildingMesh.slice(1, buildingMesh.length - 1), baseMesh.slice(1, baseMesh.length - 1), "genBuild")
}

export function buttonPress(id){
    if (pressedResult != undefined){
        document.getElementById(pressedResult).firstChild.classList.add("special")
        document.getElementById(pressedResult).firstChild.classList.remove("pressed")
    }
    pressedResult = id
    document.getElementById(id).firstChild.classList.remove("special")
    document.getElementById(id).firstChild.classList.add("pressed")
}

export function reorderThumb(move, before) {
    const elToMove = document.getElementById(move);
    const elBefore = document.getElementById(before);
    elBefore.parentNode.insertBefore(elToMove, elBefore);
}

export function singleSlider(num, name){
    var slider = document.getElementById(name)
    var value=(100/(parseInt(slider.max)-parseInt(slider.min)))*parseInt(slider.value)-(100/(parseInt(slider.max)-parseInt(slider.min)))*parseInt(slider.min);
    document.getElementById('sl' + num + '_1').style.width = (100-value)+'%'
    document.getElementById('sl' + num + '_2').style.right = (100-value)+'%'
    document.getElementById('sl' + num + '_3').style.left = value+'%'
}

export function leftSlider(num, name){
    var slider = document.getElementById(name + 1)
    var sliderVal = Math.min(slider.value, (parseInt(document.getElementById(name + 2).value) - 1));
    slider.value = sliderVal
    var value=(100/(parseInt(slider.max)-parseInt(slider.min)))*parseInt(sliderVal)-(100/(parseInt(slider.max)-parseInt(slider.min)))*parseInt(slider.min);
    if (value > 75){
        reorderThumb(name + 2, name + 1)
    }

    document.getElementById("sl" + num + "_0").style.width=value+'%'
    document.getElementById("sl" + num + "_2").style.left=value+'%';
    document.getElementById("sl" + num + "_3").style.left=value+'%';
    document.getElementById("sl" + num + "_5").style.left=value+'%';
    if (num == 3){
        document.getElementById("sl" + num + "_5").childNodes[1].innerHTML=Math.round(value*1.8)
    } else if (num == 4){
        document.getElementById("sl" + num + "_5").childNodes[1].innerHTML=value/5 + 10;
    } else {
        document.getElementById("sl" + num + "_5").childNodes[1].innerHTML=value/100;
    }
}

export function rightSlider(num, name){
    var slider = document.getElementById(name + 2)
    var sliderVal = Math.max(slider.value, (parseInt(document.getElementById(name + 1).value) + 1));
    slider.value = sliderVal
    var value=(100/(parseInt(slider.max)-parseInt(slider.min)))*parseInt(slider.value)-(100/(parseInt(slider.max)-parseInt(slider.min)))*parseInt(slider.min);

    if (value < 25){
        reorderThumb(name + 1, name + 2)
    }

    document.getElementById("sl" + num + "_1").style.width=(100-value)+'%';
    document.getElementById("sl" + num + "_2").style.right=(100-value)+'%';
    document.getElementById("sl" + num + "_4").style.left=value+'%';
    document.getElementById("sl" + num + "_6").style.left=value+'%';
    if (num == 3){
        document.getElementById("sl" + num + "_6").childNodes[1].innerHTML=Math.round(value*1.8)
    } else if (num == 4){
        document.getElementById("sl" + num + "_6").childNodes[1].innerHTML=value/5 + 10;
    } else {
        document.getElementById("sl" + num + "_6").childNodes[1].innerHTML=value/100;
    }
}

export function toggleWeight(){
    if (weighted){
        weighted = false
        document.getElementById("weightOptions").style.display = "none"
        document.getElementById("weightButton").value = "WEIGHTED: OFF"
        document.getElementById("resultDesc").style.display = "block"
        recordToggle("weight", "off")
    } else {
        weighted = true
        document.getElementById("weightOptions").style.display = "flex"
        document.getElementById("weightButton").value = "WEIGHTED: ON"
        document.getElementById("resultDesc").style.display = "none"
        recordToggle("weight", "on")
    }
}

export function toggleHyper(){
    if (hyperParamOn){
        hyperParamOn = false
        document.getElementById("hyperOptions").style.display = "none"
        document.getElementById("hyperButton").value = "OPT SETTINGS: CUSTOM"
        recordToggle("optSettings", "off")
    } else {
        hyperParamOn = true
        document.getElementById("hyperOptions").style.display = "flex"
        document.getElementById("hyperButton").value = "OPT SETTINGS: DEFAULT"
        recordToggle("optSettings", "on")
    }
}

export function toggleFootPrint(){
    let xRange = [document.getElementById("BKeyXScale1").value/100, document.getElementById("BKeyXScale2").value/100]
    let yRange = [document.getElementById("BKeyYScale1").value/100, document.getElementById("BKeyYScale2").value/100]
    selectedFootprints = []
    
    for(let i=0; i<15; i++){
        document.getElementById('ft'+i).style.backgroundImage = "url(" + "'/static/icons/emptyft/emptyft" + i + ".png')"
        if (bKeyX[i] >= xRange[0] && bKeyX[i] <= xRange[1]){
            if (bKeyY[i] >= yRange[0] && bKeyY[i] <= yRange[1]){
                selectedFootprints.push(i)
            }
        }
    }

    selectedFootprints.forEach(e => {
        document.getElementById('ft'+e).style.backgroundImage = "url(" + "'/static/icons/filledft/filledft" + e + ".png')"
    })
}

export function togglePopUps(num){
    document.getElementById("instPop").style.display = "none";
    popup.forEach(e => {
        e.style.display = "none"
    })
    document.getElementById("popup").style.display = "block";
    if ((num%2 == 0 && num != 8)){
        document.getElementById("instPop").style.display = "block";
    }
    if (num == 12){
        document.getElementById("ok").style.display = "none"
        document.getElementById("end").style.display = "block"
    }
    popup[num].style.display = "block"
}

export function toggleHelp(){
    popup.forEach(e => {
        e.style.display = "none"
    })
    document.getElementById("popup").style.display = "block";
    document.getElementById("instPop").style.display = "block";
    popup[10].style.display = "block"

    if (((document.getElementById("phase1").style.display != "none") || (document.getElementById("phase0").style.display != "none")) && simplePhase){
        popup[0].style.display = "block"
    } else if (((document.getElementById("phase3").style.display != "none" || document.getElementById("phase0").style.display != "none") && simplePhase == false)){
        popup[4].style.display = "block"
    } else if ((document.getElementById("phase2").style.display != "none")){
        popup[2].style.display = "block"
    } else if ((document.getElementById("phase4").style.display != "none")){
        popup[6].style.display = "block"
    }
}

export function toggleDescription(id, msg){
    popup.forEach(e => {
        e.style.display = "none"
    })
    sliderImg.forEach(e => {
        e.style.display = "none"
    })
    document.getElementById("popup").style.display = "block";
    document.getElementById("instPop").style.display = "block";
    document.getElementById("sliderImg" + id).style.display = "block";
    popup[13].style.display = "block";
    document.getElementById("sliderDesc").innerHTML = msg;
}

export function togglePhase(num){
    document.getElementById("param").style.display = "none";
    document.getElementById("result").style.display = "none";
    phases.forEach(e => {
        e.style.display = "none"
    })
    if (num == 1 || num == 3){
        document.getElementById("param").style.display = "flex";
    } else if (num == 2 || num == 4){
        document.getElementById("result").style.display = "flex";
    }
    phases[num].style.display = "flex"
}

export function finalizeParcel(){
    if (selectedKey){
        var stamp = Date.now().toString().slice(-8);
        recordRaw(stamp, "parameterInput", "parcelID", selectedKey)
        if (simplePhase){
            togglePhase(1);
        } else {
            togglePhase(3);
        }
    } else {
        alert("Please select a parcel first!")
    }
}

export function submit(){
    if (simplePhase == false){
        resetState();
        togglePhase(0)
        firstReset = true
    }
}

export function turnOffPopUp(input){
    document.getElementById("popup").style.display = "none";
}

export function overlayBlock(){
    document.getElementById("loader").style.display = "block";
    document.getElementById("spinner").style.display = "none";
}

export function recordInteraction(value) {
    var stamp = Date.now().toString().slice(-8);
    if (value.includes("Optimize") || value.includes("submit")){
        inheritTime = stamp
    }
    recordRaw(stamp, "action", value, "")
}

export function checkAnswers(id, num){
    var count = 0
    var invalid = false
    while (count < num && invalid == false){
        var qnid = "qn" + id + "_" + count;
        if (document.getElementById(qnid).type == "radio"){
            var value = getRadioValue("radio" + id + "_" + count);
            if (value == undefined){invalid = true}
        } else {
            var value = document.getElementById(qnid).value;
            if (value == ""){invalid = true}
        }
        count += 1
    }
    if (invalid){
        alert("Please answer all questions before submitting!")
        return false
    } else {return true}
    // Swap commented lines to bypass
    // return true
}

export function recordAnswers(id, num){
    for (let i=0; i<num; i++){
        var qnid = "qn" + id + "_" + i;
        if (document.getElementById(qnid).type == "radio"){
            var value = getRadioValue("radio" + id + "_" + i);
        } else {
            var value = document.getElementById(qnid).value;
            value = value.replace(/,/g, '-');
        }
        recordRaw(inheritTime, "question", qnid, value)
    }
}

export function recordSelectedParams(str){
    var num = parseInt(str)
    recordRaw(inheritTime, "parameterSelected", "BKeyXScale", lastResult[num]["x0"])
    recordRaw(inheritTime, "parameterSelected", "BKeyYScale", lastResult[num]["x1"])
    recordRaw(inheritTime, "parameterSelected", "GridAngle", lastResult[num]["x2"])
    recordRaw(inheritTime, "parameterSelected", "GridSpacing", lastResult[num]["x3"])
    recordRaw(inheritTime, "parameterSelected", "ParcelStoreyScale", lastResult[num]["x4"])
}

export function recordSimple(value){
    recordRaw(inheritTime, "parameterInput", "GenCount", value);
    recordRaw(inheritTime, "parameterInput", "PopCount", value);
}

export function recordToggle(object, value){
    var stamp = Date.now().toString().slice(-8);
    recordRaw(stamp, "parameterToggle", object, value)
}

export function recordRaw(stamp, tag, id, value){
    resultArr["Timestamp"].push(stamp);
    resultArr["Tag"].push(tag);
    resultArr["ID"].push(id)
    resultArr["Content"].push(value);
    console.log(resultArr);
}

export function getRadioValue(name) {
    var ele = document.getElementsByName(name);
    for(let i = 0; i < ele.length; i++) {
        if(ele[i].checked)
        return ele[i].value
    }
}

// S3 Bucket
export function bucketSave( blob, filename ) {
    var data = blob;
    var filename = filename;
    var s3 = new AWS.S3();
    return new Promise((resolve, reject) => {
        s3.putObject({
            Bucket: 'udoptbucket',
            Key: '2211TestGroup2/' + Date.now().toString().slice(-11) + '/' + filename,
            Body: data,
            ContentType: 'text/csv',
            ACL: 'public-read'
        }, function (err, result) {
            if (err) {
                console.log('Error placing file:', err);
                return reject(err);
            }
            else {
                console.log('successfully written file');
                return resolve(); 
            }
        })
    });
}

// download csv
export function download(data) {
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob)
    bucketSave(blob, "testFile");
    // *** Codes below is to download to own computer instead of upload to S3
    // const a = document.createElement('a')
    // a.setAttribute('href', url)
    // a.setAttribute('download', 'download.csv');
    // a.click()
}
 
export function csvmaker(data) {
    var csvRows = [];
    const headers = Object.keys(data);
 
    csvRows.push(headers.join(','));
    const values = Object.values(data)
    for (let i=0; i< values[0].length; i++){
        var row = [values[0][i], values[1][i], values[2][i], values[3][i]]
        csvRows.push(row.join(","))
    }
    return csvRows.join('\n')
}
 
export async function downloadData() {
    const csvdata = csvmaker(resultArr);
    download(csvdata);
}