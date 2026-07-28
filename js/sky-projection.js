const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export const DEFAULT_CAMERA_HORIZONTAL_FOV = 68;

export function normalizeDegrees(value) {
    return ((Number(value) % 360) + 360) % 360;
}

export function shortestAngleDegrees(value) {
    const normalized = normalizeDegrees(value);
    return normalized > 180 ? normalized - 360 : normalized;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

export function normalizeQuaternion(quaternion) {
    if (!quaternion) return null;
    const { x, y, z, w } = quaternion;
    if (![x, y, z, w].every(Number.isFinite)) return null;
    const length = Math.hypot(x, y, z, w);
    if (length <= 1e-9) return null;
    return { x: x / length, y: y / length, z: z / length, w: w / length };
}

export function multiplyQuaternions(a, b) {
    return {
        x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
        y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
        z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
        w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z
    };
}

function axisQuaternion(x, y, z, angleRadians) {
    const half = angleRadians / 2;
    const scale = Math.sin(half);
    return { x: x * scale, y: y * scale, z: z * scale, w: Math.cos(half) };
}

export function rotateVectorByQuaternion(vector, quaternion) {
    const q = normalizeQuaternion(quaternion);
    if (!q) return null;
    const qVector = { x: vector.x, y: vector.y, z: vector.z, w: 0 };
    const inverse = { x: -q.x, y: -q.y, z: -q.z, w: q.w };
    const rotated = multiplyQuaternions(multiplyQuaternions(q, qVector), inverse);
    return { x: rotated.x, y: rotated.y, z: rotated.z };
}

// W3C Device Orientation: intrinsic Z-X'-Y'' rotations. The resulting
// quaternion maps the device frame into the local Earth frame (east, north, up).
export function quaternionFromDeviceOrientation({ alpha, beta, gamma, screenAngle = 0 }) {
    if (![alpha, beta, gamma].every(Number.isFinite)) return null;

    const halfAlpha = alpha * DEG_TO_RAD / 2;
    const halfBeta = beta * DEG_TO_RAD / 2;
    const halfGamma = gamma * DEG_TO_RAD / 2;
    const cosZ = Math.cos(halfAlpha);
    const sinZ = Math.sin(halfAlpha);
    const cosX = Math.cos(halfBeta);
    const sinX = Math.sin(halfBeta);
    const cosY = Math.cos(halfGamma);
    const sinY = Math.sin(halfGamma);

    const deviceToEarth = {
        x: sinX * cosY * cosZ - cosX * sinY * sinZ,
        y: cosX * sinY * cosZ + sinX * cosY * sinZ,
        z: cosX * cosY * sinZ + sinX * sinY * cosZ,
        w: cosX * cosY * cosZ - sinX * sinY * sinZ
    };

    // DeviceOrientationEvent stays in the device's natural orientation.
    // Rotate the current screen frame back into that frame before using it.
    const screenToDevice = axisQuaternion(0, 0, 1, -screenAngle * DEG_TO_RAD);
    return normalizeQuaternion(multiplyQuaternions(deviceToEarth, screenToDevice));
}

export function directionFromAzimuthElevation(azimuth, elevation) {
    if (![azimuth, elevation].every(Number.isFinite)) return null;
    const azimuthRadians = azimuth * DEG_TO_RAD;
    const elevationRadians = elevation * DEG_TO_RAD;
    const horizontal = Math.cos(elevationRadians);
    return {
        x: horizontal * Math.sin(azimuthRadians),
        y: horizontal * Math.cos(azimuthRadians),
        z: Math.sin(elevationRadians)
    };
}

function cameraCorrectionQuaternion({ yaw = 0, pitch = 0 } = {}) {
    const yawRotation = axisQuaternion(0, 1, 0, Number(yaw) * DEG_TO_RAD);
    const pitchRotation = axisQuaternion(1, 0, 0, Number(pitch) * DEG_TO_RAD);
    return normalizeQuaternion(multiplyQuaternions(yawRotation, pitchRotation));
}

function worldDirectionToCamera(direction, poseQuaternion, correction) {
    const pose = normalizeQuaternion(poseQuaternion);
    if (!direction || !pose) return null;
    const earthToScreen = { x: -pose.x, y: -pose.y, z: -pose.z, w: pose.w };
    const screenDirection = rotateVectorByQuaternion(direction, earthToScreen);
    if (!screenDirection) return null;

    // The environment camera looks through the back of the phone, i.e. -screen-z.
    const cameraDirection = {
        x: screenDirection.x,
        y: screenDirection.y,
        z: -screenDirection.z
    };
    return rotateVectorByQuaternion(cameraDirection, cameraCorrectionQuaternion(correction));
}

export function viewAnglesFromPose(poseQuaternion, correction = {}) {
    const pose = normalizeQuaternion(poseQuaternion);
    if (!pose) return null;
    const cameraCorrection = cameraCorrectionQuaternion(correction);
    const correctionInverse = {
        x: -cameraCorrection.x,
        y: -cameraCorrection.y,
        z: -cameraCorrection.z,
        w: cameraCorrection.w
    };
    const cameraAim = rotateVectorByQuaternion({ x: 0, y: 0, z: 1 }, correctionInverse);
    const screenAim = { x: cameraAim.x, y: cameraAim.y, z: -cameraAim.z };
    const earthAim = rotateVectorByQuaternion(screenAim, pose);
    if (!earthAim) return null;
    return {
        heading: normalizeDegrees(Math.atan2(earthAim.x, earthAim.y) * RAD_TO_DEG),
        elevation: Math.asin(clamp(earthAim.z, -1, 1)) * RAD_TO_DEG
    };
}

export function alignPoseToHeading(poseQuaternion, heading) {
    const pose = normalizeQuaternion(poseQuaternion);
    const view = viewAnglesFromPose(pose);
    if (!pose || !view || !Number.isFinite(heading) || Math.abs(view.elevation) > 80) return pose;
    const correction = shortestAngleDegrees(view.heading - heading) * DEG_TO_RAD;
    return normalizeQuaternion(multiplyQuaternions(axisQuaternion(0, 0, 1, correction), pose));
}

export function cameraProjectionForViewport({
    width,
    height,
    videoWidth,
    videoHeight,
    horizontalFov = DEFAULT_CAMERA_HORIZONTAL_FOV
}) {
    const viewportWidth = Math.max(1, Number(width) || 1);
    const viewportHeight = Math.max(1, Number(height) || 1);
    const sourceWidth = Math.max(1, Number(videoWidth) || viewportWidth);
    const sourceHeight = Math.max(1, Number(videoHeight) || viewportHeight);
    const fieldOfView = clamp(Number(horizontalFov) || DEFAULT_CAMERA_HORIZONTAL_FOV, 25, 110);
    const sourceFocalLength = sourceWidth / (2 * Math.tan(fieldOfView * DEG_TO_RAD / 2));
    const coverScale = Math.max(viewportWidth / sourceWidth, viewportHeight / sourceHeight);
    const focalLength = sourceFocalLength * coverScale;
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;
    return {
        width: viewportWidth,
        height: viewportHeight,
        focalLengthX: focalLength,
        focalLengthY: focalLength,
        centerX,
        centerY,
        // 3x3 pinhole-camera intrinsic matrix, stored row-major.
        matrix: [focalLength, 0, centerX, 0, focalLength, centerY, 0, 0, 1]
    };
}

export function projectWorldDirection(direction, poseQuaternion, projection, correction = {}) {
    const camera = worldDirectionToCamera(direction, poseQuaternion, correction);
    if (!camera || !projection) return null;
    const forward = camera.z;
    const safeForward = Math.max(0.08, forward);
    const horizontalAngle = Math.atan2(camera.x, forward);
    const verticalAngle = Math.atan2(camera.y, Math.hypot(camera.x, forward));
    const limitedHorizontal = clamp(horizontalAngle, -80 * DEG_TO_RAD, 80 * DEG_TO_RAD);
    const limitedVertical = clamp(verticalAngle, -80 * DEG_TO_RAD, 80 * DEG_TO_RAD);

    let x = projection.centerX + projection.focalLengthX * camera.x / safeForward;
    let y = projection.centerY - projection.focalLengthY * camera.y / safeForward;
    if (forward <= 0) {
        x = projection.centerX + projection.focalLengthX * Math.tan(limitedHorizontal);
        y = projection.centerY - projection.focalLengthY * Math.tan(limitedVertical);
    }

    return {
        x,
        y,
        forward,
        visible: forward > 0
            && x >= 0
            && x <= projection.width
            && y >= 0
            && y <= projection.height
    };
}

export function calibrationDeltaFromPixels(dx, dy, projection) {
    if (!projection) return { yaw: 0, pitch: 0 };
    return {
        yaw: Math.atan2(Number(dx) || 0, projection.focalLengthX) * RAD_TO_DEG,
        pitch: Math.atan2(Number(dy) || 0, projection.focalLengthY) * RAD_TO_DEG
    };
}
