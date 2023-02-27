const parcelMat = new THREE.MeshLambertMaterial( { 
    color: 0xE4D0B7,
    transparent: false,
    emissive: 0x45597a
} );
const selParcelMat = new THREE.MeshLambertMaterial( { 
    color: 0xc78e48,
    transparent: false,
    emissive: 0x45597a
} );

export function toggleMaterial(obj, sel){
    if (sel){
        obj.material = selParcelMat
    } else {
        obj.material = parcelMat
    }
}