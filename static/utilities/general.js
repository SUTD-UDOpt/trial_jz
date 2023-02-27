let camera, controls, scene, renderer, raycaster, mouse, mouse_down, ground;
let rhino, definition_parcel, definition_building, parcelData, boundaryData
let parcels = {}
let boundary = {}
let selectedKey
let pointedKey
let siteCenter = [11572184, 151402, 500]
let uniScale = 1
let lastResult
let optFailed = false
let failCode

let objective1 = "NS Orientation"
let objective2 = "Blocked views"

// UI SETUP

let phases = [document.getElementById("phase0"), document.getElementById("phase1"), document.getElementById("phase2"), document.getElementById("phase3"), document.getElementById("phase4")]
let popup = []
for (let i=0; i<14; i++){
    popup.push(document.getElementById("popup"+i));
}
let sliderImg = []
for (let i=1; i<6; i++){
    sliderImg.push(document.getElementById("sliderImg" + i));
}

let inheritTime
let resultArr = {}
resultArr["Timestamp"]=[]
resultArr["Tag"]=[]
resultArr["ID"]=[]
resultArr["Content"]=[]

let firstReset = true;
let weighted = false;
let hyperParamOn = false;
let simplePhase = false;
let instructionReady = false;
let formAnswered = false;
let pressedResult 

let selectedFootprints = []
let bKeyX = [0.135307, 0.167476, 0.617837, 0.263982, 0.663529, 1, 0.540632, 0.277814, 0.646788, 0.116619, 0.539917, 0.212513, 0.62576, 0, 0.345269]
let bKeyY = [0.111111, 0.422222, 0.466667, 1, 0.512135, 0.484, 0.393333, 0.505778, 0, 0.71012, 0.886453, 0.55211, 0.624171, 0.655203, 0.784973]