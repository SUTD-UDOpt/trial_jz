// Import libraries
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.134.0/build/three.module.js'
import rhino3dm from 'https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/rhino3dm.module.js'
import { RhinoCompute } from 'https://cdn.jsdelivr.net/npm/compute-rhino3d@0.13.0-beta/compute.rhino3d.module.js'
// import { OrbitControls } from 'https://unpkg.com/three@0.119.1/examples/jsm/controls/OrbitControls.js';
import { OrbitControls } from './utilities/OrbitControls.js';
import * as FUNCT from './utilities/functions.js'
import * as DRACO from './utilities/tampines_dracomesh.js'
import * as BOUND from './utilities/tampines_parcelBoundary.js'
import * as LIKERT from './utilities/likertMaker.js'

// AWS S3 Setup
AWS.config.region = 'ap-southeast-1';
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: "ap-southeast-1:54809bd2-9a84-42dc-b260-188ed9fe50ac",
});

LIKERT.initialiseLikert()
FUNCT.toggleFootPrint()
init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xffffff );
    scene.fog = new THREE.FogExp2( 0xffffff, 0.0008);

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild( renderer.domElement );

    camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.set( 0, 0, 500 );
    camera.up.set( 0, 0, 1 );

    // controls
    controls = new OrbitControls( camera, renderer.domElement );
    // controls.screenSpacePanning = false;
    controls.minDistance = 150;
    controls.maxDistance = 1050;
    controls.maxPolarAngle = Math.PI / 2;
    controls.target = new THREE.Vector3(0, 0, 0 ); // set the center
    //COME BACK TO LOCK PANNING
    // controls.update(scope.target.clamp( new THREE.Vector3( - 200, - 200, - 200 ), new THREE.Vector3( 200, 200, 200 ) ))

    // mouse
    mouse = new THREE.Vector2();
    mouse_down = new THREE.Vector2();

    // RAYCASTER
    raycaster = new THREE.Raycaster();

    // lights
    const dirLight1 = new THREE.DirectionalLight( 0xffffff, 0.2);
    dirLight1.position.set( 500, 500, 500 );
    scene.add( dirLight1 );

    // DIRECTIONAL LIGHT SHADOWS
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 10000;
    dirLight1.shadow.mapSize.height = 10000;
    dirLight1.shadow.camera.near = 1;
    dirLight1.shadow.camera.far = 50000;
    dirLight1.shadow.camera.left = -1000;
    dirLight1.shadow.camera.bottom = -1000;
    dirLight1.shadow.camera.top = 1000;
    dirLight1.shadow.camera.right = 1000;

    const dirLight2 = new THREE.DirectionalLight( 0x002288 );
    dirLight2.position.set( - 1, - 1, - 1 );
    scene.add( dirLight2 );

    const dirLight3 = new THREE.DirectionalLight( 0xffffff, 0.8 );
    dirLight3.position.set( 500, 500, 500 );
    scene.add( dirLight3 );

    const ambientLight = new THREE.AmbientLight( 0x222222 );
    scene.add( ambientLight );

    // GROUND
    var ground_geo = new THREE.PlaneBufferGeometry( 10000, 10000 );
    var ground_mat = new THREE.MeshLambertMaterial( { color: 'white' } )
    ground = new THREE.Mesh( ground_geo, ground_mat );
    ground.receiveShadow = true;
    scene.add( ground );

    // EventListener
    window.addEventListener( 'resize', onWindowResize );
    document.addEventListener( 'mousemove', onMouseMove, false );
    document.addEventListener('mousedown', onMouseDown, false);
	document.addEventListener('mouseup', onMouseUp, false);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function onMouseMove( event ) {
    if (event.target.id == ""){
        event.preventDefault(); // ??? not too sure what this does
        mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    }
}

// Handle mouse click events, save the screen position when mouse down
function onMouseDown(event) {
    if (event.target.id == ""){
        mouse_down.x = event.clientX;
        mouse_down.y = event.clientY
    }
}

// Handle mouse click events
function onMouseUp(event) {
    if (event.target.id == ""){
        if ((Math.abs(mouse_down.x - event.clientX) > 10) || (Math.abs(mouse_down.y - event.clientY) > 10)) {
            // we are dragging, so no nothing
            return;
        } else if (document.getElementById("phase0").style.display != 'none') {
            if (selectedKey){
                FUNCT.toggleMaterial(parcels[selectedKey], false)
            }
            selectedKey = pointedKey
            
            document.getElementById("parcelButton").classList.add("special");
            document.getElementById("parcelButton").classList.remove("disabled");
            document.getElementById("parcelButton").disabled = false;
            document.getElementById("selectedParcel").innerHTML = selectedKey;

            FUNCT.toggleMaterial(parcels[selectedKey], true)
            
            FUNCT.recordToggle("parcelID", selectedKey)
        } else {
            return
        }
    }
}

function animate() {
    requestAnimationFrame( animate );
    render();
}

function render() {
    let isect_objs = Object.values(parcels)
    raycaster.setFromCamera( mouse, camera );
	var intersects = raycaster.intersectObjects( isect_objs );
    if (intersects.length > 0){
        var isect0 = intersects[ 0 ];
        pointedKey = isect0.object.key
    }
    renderer.render( scene, camera );
}

rhino3dm().then( async m => {
    console.log( 'Loaded rhino3dm.' )
    rhino = m // global
    computeContext()
})

async function computeContext() {
    try {
        // hide spinner
        document.getElementById('loader').style.display = 'none'
        let data = DRACO.draco;
        parcelData = data
        FUNCT.renderParcels(data, "parcel")
        let boundData = BOUND.boundary;
        boundaryData = boundData
        FUNCT.renderParcels(boundData, "boundary")
    }
    catch(error){
        console.error(`No parcel to display...`);
    }
}

// NODE BITS
let outputText = document.getElementById('output');

function optimizeFunction(){    
    if (simplePhase == false &&(document.getElementById("input1").value == "" || document.getElementById("input2").value == "")){
        alert("Please fill in the number of generation and population to start the optimization!")
    } else if (simplePhase == false && weighted && (document.getElementById("input3").value == "" || document.getElementById("input4").value == "")){
        alert("Please fill in the weight for the 2 objectives! Remember that they have to add to 100")
    } else if (weighted && Math.round(document.getElementById("input3").value) + Math.round(document.getElementById("input4").value) != 100){
        alert("Total weights must add up to 100!")
    } else if (selectedFootprints.length == 0){
        alert("No block key is selected for optimization!")
    } else {
        parcels[selectedKey].visible = false
        boundary[selectedKey].visible = true

        document.getElementById('loader').style.display = 'block';
        if (firstReset && simplePhase){
            FUNCT.togglePopUps(1)    
        } else if (firstReset && simplePhase == false){
            FUNCT.togglePopUps(5)
        }

        let input = {}

        if (simplePhase){
            FUNCT.recordInteraction("StartOptimizeSimple")
            var simpleVal = Math.round(document.getElementById("simple1").value * 0.08) + 2;
            input = {
                'OptimizationType': 'simple',
                'Parcel_ID': selectedKey,
                'GenCount': simpleVal,
                'PopCount': simpleVal,
                'BKeySelection': [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14],
                'ParameterBounds': {
                    'BKeyXScale': [0.3,0.5],
                    'BKeyYScale': [0.6,0.8],
                    'GridAngle': [0.0,90.0],
                    'GridSpacing':[10.0,20.0],
                    'ParcelStoreyScale': [0.2,1.0]
                },
                'MutationRate': 0.4,
                'CrossOverRate': 0.9
            };
            FUNCT.recordSimple(simpleVal);
        } else if (weighted) {
            FUNCT.recordInteraction("StartOptimizeAdvancedWeighted")
            input = {
                'OptimizationType': 'weighted',
                'Parcel_ID': selectedKey,
                'GenCount': document.getElementById("input1").value,
                'PopCount': document.getElementById("input2").value,
                'BKeySelection': selectedFootprints,
                'ParameterBounds': {
                    'BKeyXScale': [document.getElementById("BKeyXScale1").value/100,document.getElementById("BKeyXScale2").value/100],
                    'BKeyYScale': [document.getElementById("BKeyYScale1").value/100,document.getElementById("BKeyYScale2").value/100],
                    'GridAngle': [Math.round(document.getElementById("GridAngle1").value*1.8),Math.round(document.getElementById("GridAngle2").value*1.8)],
                    'GridSpacing':[document.getElementById("GridSpacing1").value/5+10,document.getElementById("GridSpacing2").value/5+10],
                    'ParcelStoreyScale': [document.getElementById("ParcelStoreyScale1").value/100,document.getElementById("ParcelStoreyScale2").value/100]
                },
                'ObjectiveWeights': [ Math.round(document.getElementById("input3").value)/100,Math.round(document.getElementById("input4").value)/100],
                'MutationRate': Math.round(document.getElementById("input5").value)/100,
                'CrossOverRate': Math.round(document.getElementById("input6").value)/100
            };
        } else {
            FUNCT.recordInteraction("StartOptimizeAdvanced")
            input = {
                'OptimizationType': 'advanced',
                'Parcel_ID': selectedKey,
                'GenCount': document.getElementById("input1").value,
                'PopCount': document.getElementById("input2").value,
                'BKeySelection': selectedFootprints,
                'ParameterBounds': {
                    'BKeyXScale': [document.getElementById("BKeyXScale1").value/100,document.getElementById("BKeyXScale2").value/100],
                    'BKeyYScale': [document.getElementById("BKeyYScale1").value/100,document.getElementById("BKeyYScale2").value/100],
                    'GridAngle': [Math.round(document.getElementById("GridAngle1").value*1.8),Math.round(document.getElementById("GridAngle2").value*1.8)],
                    'GridSpacing':[document.getElementById("GridSpacing1").value/5+10,document.getElementById("GridSpacing2").value/5+10],
                    'ParcelStoreyScale': [document.getElementById("ParcelStoreyScale1").value/100,document.getElementById("ParcelStoreyScale2").value/100]
                },
                'MutationRate': Math.round(document.getElementById("input5").value)/100,
                'CrossOverRate': Math.round(document.getElementById("input6").value)/100
            };
        }
        
        const options = {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            credentials:'include',
            body: JSON.stringify(input)
        };

        fetch('/api_python', options)
        .then(function (response) {
            console.log(response)
            return response.json();
        })
        .then(function(text){
            lastResult = text
            console.log(lastResult)
            document.getElementById('loader').style.display = 'none'
            if (simplePhase){
                FUNCT.togglePhase(2) 
            } else {
                FUNCT.togglePhase(4)
                FUNCT.updateDeets();
            }
            if (lastResult.data == 0){
                optFailed = true;
                failCode = 0
            } else if (lastResult.data == 1){
                optFailed = true;
                failCode = 1
            } else {
                // Clear result selection for the submit popup
                let ans = document.getElementById('qn11_0');
                while(ans.firstChild){
                    ans.removeChild(ans.firstChild);
                }
                // Clear buttons
                let divS = document.getElementById('buttonListSimple');
                while(divS.firstChild){
                    divS.removeChild(divS.firstChild);
                }
                let div = document.getElementById('buttonListAdv');
                while(div.firstChild){
                    div.removeChild(div.firstChild);
                }

                let resultKeys = Object.keys(lastResult)
                if (simplePhase){
                    let buttonContainer = document.getElementById("buttonListSimple");
                    let buttonTags = []
                    let obj1 = []
                    let obj2 = []
                    let paretoResKeys = []

                    for (let i=0; i<resultKeys.length; i++){
                        if (lastResult[resultKeys[i]]["nD_set"] == 0){
                            buttonTags.push([])
                            paretoResKeys.push(resultKeys[i])
                            obj1.push(Math.trunc(lastResult[resultKeys[i]]["f0"] * 1000) / 1000)
                            obj2.push(lastResult[resultKeys[i]]["f1"])
                        }
                    }
                    let max1 = obj1.indexOf(Math.max(...obj1))
                    let max2 = obj2.indexOf(Math.max(...obj2))
                    let min1 = obj1.indexOf(Math.min(...obj1))
                    let min2 = obj2.indexOf(Math.min(...obj2))

                    // They are minimisation problems
                    buttonTags[min1].push("Best in " + objective1)
                    buttonTags[min2].push("Best in " + objective2)
                    if (paretoResKeys.length > 1){
                        buttonTags[max1].push("Worst in " + objective1)
                        buttonTags[max2].push("Worst in " + objective2)
                    }

                    for (let i=0; i<paretoResKeys.length; i++){                        
                        if (buttonTags[i].length > 0){
                            let singleRow = document.createElement("div");
                            singleRow.setAttribute("class", "row");
                            singleRow.setAttribute("id", "row" + i);

                            let button = document.createElement("button");
                            button.setAttribute("class", "pareto col-lg-12 rounding bottomSpace");
                            button.innerHTML= 'RESULT ' + paretoResKeys[i] + ' : ' + buttonTags[i].join(', ');
                            singleRow.appendChild(button);
                            button.addEventListener("click", function(){
                                FUNCT.visualizeFunction(paretoResKeys[i])
                                FUNCT.recordInteraction('RESULT'+ paretoResKeys[i])
                                FUNCT.buttonPress("row" + i)
                            });
                            buttonContainer.appendChild(singleRow);

                            // This is for the result dropdown
                            let option = document.createElement("option");
                            option.value = paretoResKeys[i];
                            option.innerHTML = 'RESULT ' + paretoResKeys[i]
                            document.getElementById("qn11_0").appendChild(option);
                        }
                    }
                } else {
                    if (weighted){
                        document.getElementById("advHeader").style.display = "none"
                        document.getElementById("weightedHeader").style.display = "flex"
                    } else {
                        document.getElementById("advHeader").style.display = "flex"
                        document.getElementById("weightedHeader").style.display = "none"
                    }
                    let buttonContainer = document.getElementById("buttonListAdv");
                    for (let i=0; i<resultKeys.length; i++){
                        let singleRow = document.createElement("div");
                        singleRow.setAttribute("class", "row");
                        singleRow.setAttribute("id", "row" + i);

                        let button = document.createElement("button");
                        if (lastResult[resultKeys[i]]["nD_set"] == 0){
                            button.setAttribute("class", "pareto col-lg-4 rounding");
                        } else {
                            button.setAttribute("class", "special col-lg-4 rounding");
                        }
                        button.innerHTML= "RESULT " + resultKeys[i];
                        singleRow.appendChild(button);
                        button.addEventListener("click", function(){
                            FUNCT.visualizeFunction(resultKeys[i])
                            FUNCT.recordInteraction('RESULT'+resultKeys[i])
                            FUNCT.buttonPress("row" + i)
                        });
                        let data1 = document.createElement("div");
                        let processedNum = (Math.trunc(lastResult[resultKeys[i]]["f0"] * 1000) / 1000)
                        if (weighted){
                            data1.setAttribute("class", "cell col-lg-6");
                        } else {    
                            data1.setAttribute("class", "cell col-lg-4");
                        }
                        data1.innerHTML = processedNum;
                        singleRow.appendChild(data1);

                        if (weighted == false){
                            let data2 = document.createElement("div");
                            data2.setAttribute("class", "cell col-lg-4");
                            data2.innerHTML = lastResult[resultKeys[i]]["f1"];
                            singleRow.appendChild(data2);
                        }

                        buttonContainer.appendChild(singleRow);

                        // This is for the result dropdown
                        let option = document.createElement("option");
                        option.value = resultKeys[i];
                        option.innerHTML = 'RESULT ' + resultKeys[i]
                        document.getElementById("qn11_0").appendChild(option);
                    }
                }
            }
        })
        .then(() => {
            if (optFailed){
                FUNCT.recordInteraction("optFailed")
                if (failCode == 0){
                    outputText.innerHTML = "No result generated. Try widening your search!";
                } else if (failCode == 1){
                    outputText.innerHTML = "No result generated. Choose a different parcel!";
                }
                optFailed = false
                if (document.getElementById("submitButton").classList.contains("special")){
                    document.getElementById("submitButton").classList.remove("special");
                    document.getElementById("submitButton").classList.add("disabled");
                    document.getElementById("submitButton").disabled = true;
                }
            } else {
                FUNCT.recordInteraction("optDone")
                if (document.getElementById("submitButton").classList.contains("disabled")){
                    document.getElementById("submitButton").classList.remove("disabled");
                    document.getElementById("submitButton").classList.add("special");
                    document.getElementById("submitButton").disabled = false;
                }
            }

            if (firstReset && simplePhase){
                if (formAnswered){
                    FUNCT.togglePopUps(2)  
                }
                instructionReady = true
            } else if (firstReset && simplePhase == false){
                if (formAnswered){
                    FUNCT.togglePopUps(6)  
                }
                instructionReady = true 
            }
        })
        .catch(() => {
            outputText.innerHTML = "Error";
            console.error()
        });
    }
}

document.getElementById("optButton").addEventListener('click',optimizeFunction);
document.getElementById('reset').addEventListener('click', function(){
    FUNCT.recordInteraction("reset")
    firstReset = false;
    FUNCT.resetState();
    FUNCT.togglePhase(0);
    if (simplePhase){
        FUNCT.togglePopUps(3)    
    } else {
        FUNCT.togglePopUps(7)
    }
})

document.getElementById("helpButton").addEventListener("click", FUNCT.toggleHelp);
document.getElementById("closeButton").addEventListener("click", () => {
    document.getElementById("popup").style.display = "none"
})
document.getElementById("parcelButton").addEventListener("click", FUNCT.finalizeParcel);
document.getElementById("weightButton").addEventListener("click", FUNCT.toggleWeight);
document.getElementById("hyperButton").addEventListener("click", FUNCT.toggleHyper);
document.getElementById("submitButton").addEventListener("click", () => FUNCT.togglePopUps(11));
document.getElementById("ok").addEventListener("click", () => {FUNCT.turnOffPopUp("ok")});

document.getElementById("slider1Help").addEventListener("click", () => {FUNCT.toggleDescription(1, "BKeyXScale controls the length of the block keys sampled for optimization")})
document.getElementById("slider2Help").addEventListener("click", () => {FUNCT.toggleDescription(2, "BKeyYScale controls the width of the block keys sampled for optimization")})
document.getElementById("slider3Help").addEventListener("click", () => {FUNCT.toggleDescription(3, "Grid Angle controls the orientation of the grid used in the building algorithm")})
document.getElementById("slider4Help").addEventListener("click", () => {FUNCT.toggleDescription(4, "Grid Spacing controls the size of the grid used in the building algorithm")})
document.getElementById("slider5Help").addEventListener("click", () => {FUNCT.toggleDescription(5, "Parcel Storey Height controls the height of the output building geometry")})

document.getElementById("submit1").addEventListener("click", () => {
    if (FUNCT.checkAnswers(1,2) == true){
        FUNCT.recordInteraction("submitSurveyFirstSimpleRun")
        if (instructionReady == false){
            FUNCT.turnOffPopUp("submit1")
            FUNCT.recordAnswers(1,3)
        } else {
            FUNCT.togglePopUps(2)
            FUNCT.recordAnswers(1,3)
        }
        formAnswered = true
    }
})
document.getElementById("submit3").addEventListener("click", () => {
    if (FUNCT.checkAnswers(3,3) == true){
        FUNCT.turnOffPopUp("submit3")
        FUNCT.recordInteraction("submitSurveySimpleReset")
        FUNCT.recordAnswers(3,3)
    }
})
document.getElementById("submit5").addEventListener("click", () => {
    if (FUNCT.checkAnswers(5,2) == true){
        FUNCT.recordInteraction("submitSurveyFirstAdvancedRun")
        if (instructionReady == false){
            FUNCT.turnOffPopUp("submit5")
            FUNCT.recordAnswers(5,2)
        } else {
            FUNCT.togglePopUps(6)
            FUNCT.recordAnswers(5,2)
        }
        formAnswered = true
    }
})
document.getElementById("submit7").addEventListener("click", () => {
    if (FUNCT.checkAnswers(7,3) == true){
        FUNCT.recordInteraction("submitSurveyAdvancedReset")
        FUNCT.turnOffPopUp("submit7")
        FUNCT.recordAnswers(7,3)
    }
})
document.getElementById("submit8").addEventListener("click", () => {
    if (FUNCT.checkAnswers(8,11) == true){
        FUNCT.recordInteraction("submitSurveySimple")
        FUNCT.recordAnswers(8,11)
        FUNCT.turnOffPopUp("pop8")
        FUNCT.downloadData()
        FUNCT.overlayBlock()
        FUNCT.togglePopUps(12)
    }
})
document.getElementById("submit9").addEventListener("click", () => {
    if (FUNCT.checkAnswers(9,12) == true){
        FUNCT.recordInteraction("submitSurveyAdvanced")
        FUNCT.recordAnswers(9,12)
        simplePhase = true
        FUNCT.togglePopUps(0)
    }
})
document.getElementById("submit11").addEventListener("click", () => {
    FUNCT.submit()
    FUNCT.recordInteraction("submitResultID")
    FUNCT.recordAnswers(11,1)
    FUNCT.recordSelectedParams(document.getElementById("qn11_0").value)
    if (simplePhase){
        FUNCT.togglePopUps(8)
    } else {
        FUNCT.togglePopUps(9)
    }
})

document.getElementById("BKeyXScale1").addEventListener("change", FUNCT.toggleFootPrint)
document.getElementById("BKeyXScale2").addEventListener("change", FUNCT.toggleFootPrint)
document.getElementById("BKeyYScale1").addEventListener("change", FUNCT.toggleFootPrint)
document.getElementById("BKeyYScale2").addEventListener("change", FUNCT.toggleFootPrint)

document.getElementById("simple1").addEventListener("input", () => {FUNCT.singleSlider(0, "simple1")})
document.getElementById("BKeyXScale1").addEventListener("input", () => {FUNCT.leftSlider(1, "BKeyXScale")})
document.getElementById("BKeyXScale2").addEventListener("input", () => {FUNCT.rightSlider(1, "BKeyXScale")})
document.getElementById("BKeyYScale1").addEventListener("input", () => {FUNCT.leftSlider(2, "BKeyYScale")})
document.getElementById("BKeyYScale2").addEventListener("input", () => {FUNCT.rightSlider(2, "BKeyYScale")})
document.getElementById("GridAngle1").addEventListener("input", () => {FUNCT.leftSlider(3, "GridAngle")})
document.getElementById("GridAngle2").addEventListener("input", () => {FUNCT.rightSlider(3, "GridAngle")})
document.getElementById("GridSpacing1").addEventListener("input", () => {FUNCT.leftSlider(4, "GridSpacing")})
document.getElementById("GridSpacing2").addEventListener("input", () => {FUNCT.rightSlider(4, "GridSpacing")})
document.getElementById("ParcelStoreyScale1").addEventListener("input", () => {FUNCT.leftSlider(5, "ParcelStoreyScale")})
document.getElementById("ParcelStoreyScale2").addEventListener("input", () => {FUNCT.rightSlider(5, "ParcelStoreyScale")})

document.getElementById("simple1").addEventListener("change", () => {FUNCT.recordToggle("simple1", Math.round(document.getElementById("simple1").value * 0.08) + 2)})
document.getElementById("BKeyXScale1").addEventListener("change", () => {FUNCT.recordToggle("BKeyXScale1", document.getElementById("BKeyXScale1").value)})
document.getElementById("BKeyXScale2").addEventListener("change", () => {FUNCT.recordToggle("BKeyXScale2", document.getElementById("BKeyXScale2").value)})
document.getElementById("BKeyYScale1").addEventListener("change", () => {FUNCT.recordToggle("BKeyYScale1", document.getElementById("BKeyYScale1").value)})
document.getElementById("BKeyYScale2").addEventListener("change", () => {FUNCT.recordToggle("BKeyYScale2", document.getElementById("BKeyYScale2").value)})
document.getElementById("GridAngle1").addEventListener("change", () => {FUNCT.recordToggle("GridAngle1", document.getElementById("GridAngle1").value)})
document.getElementById("GridAngle2").addEventListener("change", () => {FUNCT.recordToggle("GridAngle2", document.getElementById("GridAngle2").value)})
document.getElementById("GridSpacing1").addEventListener("change", () => {FUNCT.recordToggle("GridSpacing1", document.getElementById("GridSpacing1").value)})
document.getElementById("GridSpacing2").addEventListener("change", () => {FUNCT.recordToggle("GridSpacing2", document.getElementById("GridSpacing2").value)})
document.getElementById("ParcelStoreyScale1").addEventListener("change", () => {FUNCT.recordToggle("ParcelStoreyScale1", document.getElementById("ParcelStoreyScale1").value)})
document.getElementById("ParcelStoreyScale2").addEventListener("change", () => {FUNCT.recordToggle("ParcelStoreyScale2", document.getElementById("ParcelStoreyScale2").value)})