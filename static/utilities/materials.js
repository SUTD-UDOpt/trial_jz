import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.134.0/build/three.module.js'

export const parcelMat = new THREE.MeshLambertMaterial( { 
    color: 0xE4D0B7,
    transparent: false,
    emissive: 0x45597a
} );

export const selParcelMat = new THREE.MeshLambertMaterial( { 
    color: 0xc78e48,
    transparent: false,
    emissive: 0x45597a
} );

export const boundaryMat = new THREE.MeshLambertMaterial( { 
    color: 0x1b1b3a,
    transparent: false,
    emissive: 0x45597a
} );

export const baseMat = new THREE.MeshLambertMaterial( { 
    color: 0x45597a,
    transparent: false,
    emissive: 0x1b1b3a
} );

export const normalMat = new THREE.MeshNormalMaterial( {
    transparent: false,
} )