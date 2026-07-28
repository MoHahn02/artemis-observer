import {
    alignPoseToHeading,
    calibrationDeltaFromPixels,
    cameraProjectionForViewport,
    directionFromAzimuthElevation,
    normalizeDegrees,
    projectWorldDirection,
    quaternionFromDeviceOrientation,
    viewAnglesFromPose
} from './sky-projection.js';

export { normalizeDegrees } from './sky-projection.js';

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const EARTH_RADIUS_KM = 6378.137;

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}


function geodeticToEcef({ lat, lon, altitudeKm = 0 }) {
    const latitude = Number(lat) * DEG_TO_RAD;
    const longitude = Number(lon) * DEG_TO_RAD;
    const radius = EARTH_RADIUS_KM + (Number(altitudeKm) || 0);
    const cosLatitude = Math.cos(latitude);
    return {
        x: radius * cosLatitude * Math.cos(longitude),
        y: radius * cosLatitude * Math.sin(longitude),
        z: radius * Math.sin(latitude)
    };
}

export function lookAnglesFromGeodetic(observer, target) {
    if (![observer?.lat, observer?.lon, target?.lat, target?.lon].every(Number.isFinite)) return null;
    const observerEcef = geodeticToEcef(observer);
    const targetEcef = geodeticToEcef(target);
    const dx = targetEcef.x - observerEcef.x;
    const dy = targetEcef.y - observerEcef.y;
    const dz = targetEcef.z - observerEcef.z;
    const latitude = observer.lat * DEG_TO_RAD;
    const longitude = observer.lon * DEG_TO_RAD;
    const east = -Math.sin(longitude) * dx + Math.cos(longitude) * dy;
    const north = -Math.sin(latitude) * Math.cos(longitude) * dx
        - Math.sin(latitude) * Math.sin(longitude) * dy
        + Math.cos(latitude) * dz;
    const up = Math.cos(latitude) * Math.cos(longitude) * dx
        + Math.cos(latitude) * Math.sin(longitude) * dy
        + Math.sin(latitude) * dz;
    const horizontal = Math.hypot(east, north);
    return {
        azimuth: normalizeDegrees(Math.atan2(east, north) * RAD_TO_DEG),
        elevation: Math.atan2(up, horizontal) * RAD_TO_DEG,
        rangeKm: Math.hypot(horizontal, up)
    };
}

function greenwichSiderealDegrees(dateMs) {
    const julianDate = Number(dateMs) / 86400000 + 2440587.5;
    const daysSinceJ2000 = julianDate - 2451545.0;
    const centuries = daysSinceJ2000 / 36525;
    return normalizeDegrees(
        280.46061837
        + 360.98564736629 * daysSinceJ2000
        + 0.000387933 * centuries * centuries
        - (centuries * centuries * centuries) / 38710000
    );
}

export function horizontalCoordinatesFromDisplayVector(vector, observer, dateMs) {
    if (!vector || !Number.isFinite(observer?.lat) || !Number.isFinite(observer?.lon)) return null;
    const eclipticX = -Number(vector.z);
    const eclipticY = -Number(vector.x);
    const eclipticZ = Number(vector.y);
    if (![eclipticX, eclipticY, eclipticZ].every(Number.isFinite)) return null;
    const obliquity = 23.4393 * DEG_TO_RAD;
    const equatorialX = eclipticX;
    const equatorialY = eclipticY * Math.cos(obliquity) - eclipticZ * Math.sin(obliquity);
    const equatorialZ = eclipticY * Math.sin(obliquity) + eclipticZ * Math.cos(obliquity);
    const radius = Math.hypot(equatorialX, equatorialY, equatorialZ);
    if (radius <= 0) return null;
    const rightAscension = Math.atan2(equatorialY, equatorialX);
    const declination = Math.asin(equatorialZ / radius);
    const latitude = observer.lat * DEG_TO_RAD;
    const localSidereal = (greenwichSiderealDegrees(dateMs) + observer.lon) * DEG_TO_RAD;
    const hourAngle = localSidereal - rightAscension;
    const east = -Math.cos(declination) * Math.sin(hourAngle);
    const north = Math.sin(declination) * Math.cos(latitude)
        - Math.cos(declination) * Math.cos(hourAngle) * Math.sin(latitude);
    const up = Math.sin(declination) * Math.sin(latitude)
        + Math.cos(declination) * Math.cos(hourAngle) * Math.cos(latitude);
    return {
        azimuth: normalizeDegrees(Math.atan2(east, north) * RAD_TO_DEG),
        elevation: Math.asin(clamp(up, -1, 1)) * RAD_TO_DEG
    };
}

export function findSatelliteHit(hitTargets, x, y) {
    let nearest = null;
    let nearestDistance = Infinity;
    for (const hit of hitTargets || []) {
        const distance = Math.hypot(Number(x) - hit.x, Number(y) - hit.y);
        if (distance <= hit.radius && distance < nearestDistance) {
            nearest = hit.target;
            nearestDistance = distance;
        }
    }
    return nearest;
}

function drawMarker(context, target, point, edge = false) {
    const isSatellite = target.kind === 'satellite';
    const radius = isSatellite ? 3.5 : target.kind === 'sun' ? 10 : target.kind === 'moon' ? 8 : 6;
    context.save();
    context.globalAlpha = target.elevation < 0 ? 0.48 : 1;
    context.strokeStyle = target.color;
    context.fillStyle = target.color;
    context.lineWidth = isSatellite ? 1.4 : 2;
    context.shadowColor = target.color;
    context.shadowBlur = isSatellite ? 8 : 16;
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    if (isSatellite) context.fill();
    else context.stroke();
    if (edge) {
        context.beginPath();
        context.moveTo(point.x - 5, point.y + 7);
        context.lineTo(point.x, point.y + 13);
        context.lineTo(point.x + 5, point.y + 7);
        context.stroke();
    }
    context.shadowBlur = 0;
    context.font = isSatellite ? '700 11px system-ui, sans-serif' : '800 13px system-ui, sans-serif';
    const rightSide = point.x > context.canvas.clientWidth / 2;
    context.textAlign = rightSide ? 'right' : 'left';
    context.textBaseline = 'middle';
    const labelX = point.x + (rightSide ? -radius - 7 : radius + 7);
    const elevation = `${Math.round(target.elevation)}°`;
    const label = isSatellite ? target.name : `${target.name} · ${elevation}`;
    context.strokeStyle = 'rgba(3, 8, 18, 0.92)';
    context.lineWidth = 4;
    context.strokeText(label, labelX, point.y);
    context.fillStyle = '#f6fbff';
    context.fillText(label, labelX, point.y);
    context.restore();
}

export function createSkyView({ elements, getSnapshot, onLocation, onActiveChange, translate }) {
    const state = {
        active: false,
        sessionId: 0,
        stream: null,
        animationFrame: 0,
        orientationAvailable: false,
        absoluteOrientationAvailable: false,
        cameraAvailable: false,
        poseQuaternion: quaternionFromDeviceOrientation({ alpha: 0, beta: 110, gamma: 0 }),
        calibrationYaw: 0,
        calibrationPitch: 0,
        projection: null,
        showOffscreenObjects: true,
        calibrating: false,
        targets: [],
        hitTargets: [],
        selectedSatelliteId: null,
        overheadCount: 0,
        lastTargetRefresh: 0,
        pointer: null
    };

    const t = (key, values = {}) => translate?.(key, values) || key;

    function currentView() {
        return viewAnglesFromPose(state.poseQuaternion, {
            yaw: state.calibrationYaw,
            pitch: state.calibrationPitch
        }) || { heading: 0, elevation: 20 };
    }

    function setStatus(message) {
        if (elements.status) elements.status.textContent = message;
    }

    function setElementText(element, value) {
        if (element) element.textContent = value;
    }

    function refreshControlLabels() {
        if (elements.calibrate) {
            elements.calibrate.textContent = state.calibrating ? t('sky.calibration.done') : t('sky.calibration.start');
            elements.calibrate.setAttribute('aria-pressed', String(state.calibrating));
        }
        if (elements.toggleOffscreen) {
            elements.toggleOffscreen.textContent = state.showOffscreenObjects
                ? t('sky.offscreen.hide')
                : t('sky.offscreen.show');
            elements.toggleOffscreen.setAttribute('aria-pressed', String(state.showOffscreenObjects));
        }
    }

    function refreshLabels() {
        if (elements.title) elements.title.textContent = t('sky.title');
        if (elements.subtitle) elements.subtitle.textContent = t('sky.subtitle');
        if (elements.close) elements.close.setAttribute('aria-label', t('sky.close'));
        if (elements.retry) elements.retry.textContent = t('sky.retry');
        setElementText(elements.satelliteKicker, t('sky.satellite.title'));
        setElementText(elements.satelliteAltitudeLabel, t('sky.satellite.altitude'));
        setElementText(elements.satelliteElevationLabel, t('sky.satellite.elevation'));
        setElementText(elements.satelliteDirectionLabel, t('sky.satellite.direction'));
        setElementText(elements.satelliteDistanceLabel, t('sky.satellite.distance'));
        elements.satelliteClose?.setAttribute('aria-label', t('sky.satellite.close'));
        refreshControlLabels();
    }

    function updateStatus() {
        const snapshot = getSnapshot?.() || {};
        if (state.calibrating) {
            setStatus(t('sky.calibration.status'));
        } else if (!snapshot.location) {
            setStatus(t('sky.status.location'));
        } else if (!state.cameraAvailable && !state.orientationAvailable) {
            setStatus(t('sky.status.manual'));
        } else if (!state.cameraAvailable) {
            setStatus(t('sky.status.noCamera'));
        } else if (!state.orientationAvailable) {
            setStatus(t('sky.status.noSensor'));
        } else {
            setStatus(t('sky.status.active', { count: state.overheadCount }));
        }
        if (elements.retry) {
            elements.retry.hidden = state.cameraAvailable && state.orientationAvailable && Boolean(snapshot.location);
        }
    }

    function hideSatelliteCard() {
        state.selectedSatelliteId = null;
        if (elements.satelliteCard) elements.satelliteCard.hidden = true;
        elements.root.classList.remove('sky-satellite-selected');
    }

    function cardinalDirection(azimuth) {
        const labels = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        return labels[Math.round(normalizeDegrees(azimuth) / 45) % labels.length];
    }

    function renderSatelliteCard(target) {
        if (!target || !elements.satelliteCard) return;
        state.selectedSatelliteId = String(target.id || target.name);
        elements.satelliteCard.hidden = false;
        elements.root.classList.add('sky-satellite-selected');
        setElementText(elements.satelliteName, target.name || t('sky.satellite.title'));
        setElementText(elements.satelliteAltitude, Number.isFinite(target.altitudeKm)
            ? `${Math.round(target.altitudeKm)} km`
            : '--');
        setElementText(elements.satelliteElevation, `${Math.round(target.elevation)}°`);
        setElementText(
            elements.satelliteDirection,
            `${cardinalDirection(target.azimuth)} · ${Math.round(normalizeDegrees(target.azimuth))}°`
        );
        setElementText(elements.satelliteDistance, Number.isFinite(target.rangeKm)
            ? `${Math.round(target.rangeKm)} km`
            : '--');
        const meta = [
            target.regime,
            target.operator,
            target.country,
            target.id ? `NORAD ${target.id}` : ''
        ].filter(Boolean).join(' · ');
        setElementText(elements.satelliteMeta, meta || t('sky.satellite.noDetails'));
    }

    function toggleCalibration() {
        state.calibrating = !state.calibrating;
        if (state.calibrating) {
            state.calibrationYaw = 0;
            state.calibrationPitch = 0;
            hideSatelliteCard();
        }
        refreshControlLabels();
        updateStatus();
    }

    function toggleOffscreenObjects() {
        state.showOffscreenObjects = !state.showOffscreenObjects;
        refreshControlLabels();
    }

    function handleOrientation(event) {
        const standardAbsolute = event.type === 'deviceorientationabsolute' || event.absolute === true;
        const compassHeading = typeof event.webkitCompassHeading === 'number'
            ? event.webkitCompassHeading
            : NaN;
        const hasCompassHeading = Number.isFinite(compassHeading);
        const isAbsolute = standardAbsolute || hasCompassHeading;
        if (state.absoluteOrientationAvailable && !isAbsolute) return;
        const alpha = typeof event.alpha === 'number' ? event.alpha : NaN;
        const beta = typeof event.beta === 'number' ? event.beta : NaN;
        const gamma = typeof event.gamma === 'number' ? event.gamma : NaN;
        const screenAngle = Number(window.screen?.orientation?.angle ?? window.orientation ?? 0);
        let poseQuaternion = quaternionFromDeviceOrientation({
            alpha,
            beta,
            gamma,
            screenAngle: Number.isFinite(screenAngle) ? screenAngle : 0
        });
        if (!poseQuaternion) return;
        if (!standardAbsolute && hasCompassHeading) {
            poseQuaternion = alignPoseToHeading(poseQuaternion, compassHeading);
        }
        state.poseQuaternion = poseQuaternion;
        state.orientationAvailable = true;
        if (isAbsolute) state.absoluteOrientationAvailable = true;
    }

    function addOrientationListeners() {
        window.addEventListener('deviceorientationabsolute', handleOrientation, true);
        window.addEventListener('deviceorientation', handleOrientation, true);
    }

    function removeOrientationListeners() {
        window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
        window.removeEventListener('deviceorientation', handleOrientation, true);
    }

    async function requestOrientation(sessionId) {
        const DeviceOrientation = window.DeviceOrientationEvent;
        if (!DeviceOrientation) return false;
        if (typeof DeviceOrientation.requestPermission === 'function') {
            let permission;
            try {
                permission = await DeviceOrientation.requestPermission(true);
            } catch (error) {
                if (!(error instanceof TypeError)) throw error;
                permission = await DeviceOrientation.requestPermission();
            }
            if (permission !== 'granted') return false;
        }
        if (!state.active || state.sessionId !== sessionId) return false;
        addOrientationListeners();
        return true;
    }

    async function requestCamera(sessionId) {
        if (!navigator.mediaDevices?.getUserMedia) return false;
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        });
        if (!state.active || state.sessionId !== sessionId) {
            stream.getTracks().forEach((track) => track.stop());
            return false;
        }
        state.stream = stream;
        elements.video.srcObject = stream;
        await elements.video.play();
        if (!state.active || state.sessionId !== sessionId) {
            stream.getTracks().forEach((track) => track.stop());
            elements.video.srcObject = null;
            return false;
        }
        state.cameraAvailable = true;
        return true;
    }

    function requestLocation() {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve(false);
                return;
            }
            navigator.geolocation.getCurrentPosition((position) => {
                onLocation?.({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude,
                    altitudeKm: Number.isFinite(position.coords.altitude) ? position.coords.altitude / 1000 : 0,
                    accuracy: position.coords.accuracy
                });
                resolve(true);
            }, () => resolve(false), {
                enableHighAccuracy: true,
                maximumAge: 15000,
                timeout: 15000
            });
        });
    }

    function refreshTargets(now) {
        if (now - state.lastTargetRefresh < 850) return;
        state.lastTargetRefresh = now;
        const snapshot = getSnapshot?.() || {};
        const observer = snapshot.location;
        if (!observer) {
            state.targets = [];
            state.overheadCount = 0;
            updateStatus();
            return;
        }

        const celestial = (snapshot.celestial || []).map((entry) => {
            const angles = horizontalCoordinatesFromDisplayVector(entry.vector, observer, snapshot.dateMs || Date.now());
            return angles ? { ...entry, ...angles } : null;
        }).filter(Boolean);

        const satellites = [];
        let overheadCount = 0;
        for (const satellite of snapshot.satellites || []) {
            const angles = lookAnglesFromGeodetic(observer, {
                lat: satellite.latitudeDeg,
                lon: satellite.longitudeDeg,
                altitudeKm: satellite.altitudeKm
            });
            if (!angles || angles.elevation <= 0) continue;
            overheadCount += 1;
            satellites.push({
                kind: 'satellite',
                id: satellite.id,
                name: satellite.name,
                color: '#62ddff',
                azimuth: angles.azimuth,
                elevation: angles.elevation,
                rangeKm: angles.rangeKm,
                altitudeKm: satellite.altitudeKm,
                regime: satellite.regime,
                operator: satellite.operator,
                country: satellite.country
            });
        }
        satellites.sort((a, b) => b.elevation - a.elevation);
        state.overheadCount = overheadCount;
        state.targets = [...celestial, ...satellites.slice(0, 80)];
        if (state.selectedSatelliteId) {
            const selected = satellites.find((satellite) => String(satellite.id || satellite.name) === state.selectedSatelliteId);
            if (selected) renderSatelliteCard(selected);
            else hideSatelliteCard();
        }
        updateStatus();
    }

    function resizeCanvas() {
        const rect = elements.root.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(rect.height));
        if (elements.canvas.width !== Math.round(width * dpr) || elements.canvas.height !== Math.round(height * dpr)) {
            elements.canvas.width = Math.round(width * dpr);
            elements.canvas.height = Math.round(height * dpr);
            elements.canvas.style.width = `${width}px`;
            elements.canvas.style.height = `${height}px`;
        }
        return { width, height, dpr };
    }

    function draw(now) {
        if (!state.active) return;
        refreshTargets(now);
        const { width, height, dpr } = resizeCanvas();
        const context = elements.canvas.getContext('2d');
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.clearRect(0, 0, width, height);
        const view = currentView();
        const projection = cameraProjectionForViewport({
            width,
            height,
            videoWidth: elements.video.videoWidth,
            videoHeight: elements.video.videoHeight
        });
        state.projection = projection;
        state.hitTargets = [];

        context.save();
        context.strokeStyle = 'rgba(197, 229, 255, 0.26)';
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(width / 2 - 14, height / 2);
        context.lineTo(width / 2 + 14, height / 2);
        context.moveTo(width / 2, height / 2 - 14);
        context.lineTo(width / 2, height / 2 + 14);
        context.stroke();
        context.restore();

        const celestial = state.targets.filter((target) => target.kind !== 'satellite');
        const satellites = state.targets.filter((target) => target.kind === 'satellite');
        for (const target of satellites) {
            const direction = directionFromAzimuthElevation(target.azimuth, target.elevation);
            const point = projectWorldDirection(direction, state.poseQuaternion, projection, {
                yaw: state.calibrationYaw,
                pitch: state.calibrationPitch
            });
            if (!point) continue;
            if (!point.visible || point.x < 18 || point.x > width - 18 || point.y < 218 || point.y > height - 76) continue;
            drawMarker(context, target, point);
            state.hitTargets.push({ target, x: point.x, y: point.y, radius: 28 });
        }
        for (const target of celestial) {
            const direction = directionFromAzimuthElevation(target.azimuth, target.elevation);
            const point = projectWorldDirection(direction, state.poseQuaternion, projection, {
                yaw: state.calibrationYaw,
                pitch: state.calibrationPitch
            });
            if (!point) continue;
            if (point.visible && point.x >= 26 && point.x <= width - 26 && point.y >= 218 && point.y <= height - 76) {
                drawMarker(context, target, point);
            } else if (state.showOffscreenObjects) {
                drawMarker(context, target, {
                    x: clamp(point.x, 58, width - 58),
                    y: clamp(point.y, 230, height - 104)
                }, true);
            }
        }

        if (elements.heading) {
            elements.heading.textContent = `${Math.round(view.heading).toString().padStart(3, '0')}° · ${Math.round(view.elevation)}°`;
        }
        state.animationFrame = requestAnimationFrame(draw);
    }

    function onPointerDown(event) {
        state.pointer = {
            id: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            x: event.clientX,
            y: event.clientY,
            moved: false
        };
        elements.canvas.setPointerCapture?.(event.pointerId);
    }

    function onPointerMove(event) {
        if (!state.pointer || state.pointer.id !== event.pointerId) return;
        const dx = event.clientX - state.pointer.x;
        const dy = event.clientY - state.pointer.y;
        if (Math.hypot(event.clientX - state.pointer.startX, event.clientY - state.pointer.startY) > 7) {
            state.pointer.moved = true;
        }
        if (state.calibrating) {
            const delta = calibrationDeltaFromPixels(dx, dy, state.projection);
            state.calibrationYaw = clamp(state.calibrationYaw + delta.yaw, -180, 180);
            state.calibrationPitch = clamp(state.calibrationPitch + delta.pitch, -80, 80);
        }
        state.pointer.x = event.clientX;
        state.pointer.y = event.clientY;
    }

    function onPointerEnd(event) {
        if (!state.pointer || state.pointer.id !== event.pointerId) return;
        const pointer = state.pointer;
        elements.canvas.releasePointerCapture?.(event.pointerId);
        state.pointer = null;
        if (pointer.moved || state.calibrating) return;
        const rect = elements.canvas.getBoundingClientRect();
        const target = findSatelliteHit(
            state.hitTargets,
            event.clientX - rect.left,
            event.clientY - rect.top
        );
        if (target) renderSatelliteCard(target);
        else hideSatelliteCard();
    }

    async function enter() {
        if (state.active) return;
        state.active = true;
        state.sessionId += 1;
        const sessionId = state.sessionId;
        state.cameraAvailable = false;
        state.orientationAvailable = false;
        state.absoluteOrientationAvailable = false;
        state.poseQuaternion = quaternionFromDeviceOrientation({ alpha: 0, beta: 110, gamma: 0 });
        state.calibrationYaw = 0;
        state.calibrationPitch = 0;
        state.projection = null;
        state.calibrating = false;
        hideSatelliteCard();
        elements.root.setAttribute('aria-hidden', 'false');
        refreshLabels();
        setStatus(t('sky.status.requesting'));
        onActiveChange?.(true);
        state.animationFrame = requestAnimationFrame(draw);

        const orientationPromise = requestOrientation(sessionId).catch(() => false);
        const cameraPromise = requestCamera(sessionId).catch(() => false);
        const locationPromise = requestLocation();
        await Promise.allSettled([orientationPromise, cameraPromise, locationPromise]);
        if (state.active && state.sessionId === sessionId) updateStatus();
    }

    function exit() {
        if (!state.active) return;
        state.active = false;
        state.sessionId += 1;
        cancelAnimationFrame(state.animationFrame);
        removeOrientationListeners();
        state.stream?.getTracks().forEach((track) => track.stop());
        state.stream = null;
        state.cameraAvailable = false;
        state.calibrating = false;
        hideSatelliteCard();
        elements.video.pause();
        elements.video.srcObject = null;
        elements.root.setAttribute('aria-hidden', 'true');
        onActiveChange?.(false);
    }

    function toggle() {
        return state.active ? exit() : enter();
    }

    elements.close?.addEventListener('click', exit);
    elements.retry?.addEventListener('click', () => {
        exit();
        enter();
    });
    elements.calibrate?.addEventListener('click', toggleCalibration);
    elements.toggleOffscreen?.addEventListener('click', toggleOffscreenObjects);
    elements.satelliteClose?.addEventListener('click', hideSatelliteCard);
    elements.canvas?.addEventListener('pointerdown', onPointerDown);
    elements.canvas?.addEventListener('pointermove', onPointerMove);
    elements.canvas?.addEventListener('pointerup', onPointerEnd);
    elements.canvas?.addEventListener('pointercancel', onPointerEnd);

    return {
        enter,
        exit,
        toggle,
        isActive: () => state.active,
        refreshLabels
    };
}
