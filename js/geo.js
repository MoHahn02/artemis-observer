import * as THREE from 'three';

export function latLonToVector3(lat, lon, radius) {
    const phi = THREE.MathUtils.degToRad(90 - lat);
    const theta = THREE.MathUtils.degToRad(lon + 180);
    return new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
    );
}

export function normalizeLongitude(lon) {
    return THREE.MathUtils.euclideanModulo(lon + 540, 360) - 180;
}

export function destinationLatLon(latDeg, lonDeg, bearingDeg, angularDistanceDeg) {
    const lat = THREE.MathUtils.degToRad(latDeg);
    const lon = THREE.MathUtils.degToRad(lonDeg);
    const bearing = THREE.MathUtils.degToRad(bearingDeg);
    const angularDistance = THREE.MathUtils.degToRad(angularDistanceDeg);
    const sinLat = Math.sin(lat);
    const cosLat = Math.cos(lat);
    const sinDistance = Math.sin(angularDistance);
    const cosDistance = Math.cos(angularDistance);
    const lat2 = Math.asin(
        sinLat * cosDistance + cosLat * sinDistance * Math.cos(bearing)
    );
    const lon2 = lon + Math.atan2(
        Math.sin(bearing) * sinDistance * cosLat,
        cosDistance - sinLat * Math.sin(lat2)
    );
    return {
        lat: THREE.MathUtils.radToDeg(lat2),
        lon: normalizeLongitude(THREE.MathUtils.radToDeg(lon2))
    };
}
