// Shared runtime configuration for the Earth tracker.
// Keeping these values separate makes feature modules easier to test and evolve.

export const UI_STORAGE_KEY = 'earth-ui-v2';
export const SATELLITE_CACHE_KEY = 'earth-satellite-cache-v1';
export const LAUNCH_FEED_DATA_URL = 'data/launch-feed.json';
export const LAUNCH_DB_DATA_URL = 'data/launch-db.json';
export const LAUNCH_STATS_DATA_URL = 'data/launch-stats.json';
export const SATELLITE_LIVE_HISTORY_DATA_URL = 'data/satellite-live-history.json';
export const SATELLITE_PROFILE_DATA_URL = 'data/satellite-profiles.json';
export const LAUNCH_VERIFY_WINDOW_MS = 15 * 60 * 1000;
export const LAUNCH_SUCCESS_CHECK_DELAY_MS = 30 * 60 * 1000;
export const LAUNCH_DATA_REFRESH_MS = 15 * 60 * 1000;
export const SATELLITE_TLE_URL = 'data/active-satellites.tle';
export const ISS_OEM_URL = 'data/iss-oem-j2k.txt';
export const ISS_NORAD_ID = '25544';
export const SATELLITE_LIB_CANDIDATES = [
    'vendor/satellite/satellite.min.js',
    'https://unpkg.com/satellite.js/dist/satellite.min.js',
    'https://cdn.jsdelivr.net/npm/satellite.js@6.0.2/dist/satellite.min.js',
    'https://unpkg.com/satellite.js@6.0.2/dist/satellite.min.js'
];
export const SATELLITE_FETCH_INTERVAL_MS = 2 * 60 * 60 * 1000;
export const SATELLITE_PROPAGATION_INTERVAL_MS = 1000;
export const HUD_UPDATE_INTERVAL_MS = 220;
export const OBLIQUITY_RAD = 23.4393 * Math.PI / 180;
export const EARTH_SIDEREAL_REFERENCE_OFFSET_RAD = Math.PI / 2;
export const ORBITS_ALL_DISTANCE = 100000;
export const ZOOM_DIST_MIN = 2.6;
export const ZOOM_DIST_MAX = 10000000;
export const EARTH_TEX_URLS = [
    'assets/textures/earth-blue-marble.jpg',
    'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
    'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg',
    'https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-blue-marble.jpg'
];
export const EARTH_BUMP_TEX_URLS = [
    'assets/textures/earth-topology.png',
    'https://unpkg.com/three-globe/example/img/earth-topology.png',
    'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png',
    'https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-topology.png'
];
export const EARTH_NIGHT_TEX_URLS = [
    'assets/textures/earth-night.jpg',
    'https://unpkg.com/three-globe/example/img/earth-night.jpg',
    'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg',
    'https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-night.jpg'
];
export const EARTH_CLOUD_TEX_URLS = [
    'assets/textures/fair_clouds_4k.png',
    'https://raw.githubusercontent.com/turban/webgl-earth/master/images/fair_clouds_4k.png',
    'https://cdn.jsdelivr.net/gh/turban/webgl-earth/images/fair_clouds_4k.png'
];
export const EARTH_OBSERVATION_DATA_URL = 'data/earth-observation.json';
export const EARTH_OBSERVATION_TEXTURE_WIDTH = 2048;
export const EARTH_OBSERVATION_TEXTURE_HEIGHT = 1024;
export const EARTH_OBSERVATION_REFRESH_MS = 6 * 60 * 60 * 1000;
export const EARTH_OBSERVATION_TARGET_COVERAGE = 0.86;
export const EARTH_OBSERVATION_MIN_COVERAGE = 0.66;
export const AUTO_OBSERVER_IDLE_MS = 2 * 60 * 1000;
export const AUTO_OBSERVER_DISTANCE = 270;
export const AUTO_OBSERVER_DISTANCE_SWING = 145;
export const AUTO_OBSERVER_HEIGHT = 92;
export const AUTO_OBSERVER_ORBIT_SPEED = 0.018;
export const EARTH_ORBIT_VISIBLE_DISTANCE = 700;
export const EARTH_LABEL_VISIBLE_DISTANCE = 520;
export const MOON_TEX_URL = 'assets/textures/moon.jpg';
export const SATELLITE_RESULT_LIMIT = 40;
export const SATELLITES_IN_ORBIT_ESTIMATE = 16910;
export const ORBIT_REGIMES = ['LEO', 'MEO', 'GEO', 'HEO'];
export const SATELLITE_GROUP_FILTERS = [
    { id: 'all', labelKey: 'sat.group.all' },
    { id: 'starlink', labelKey: 'sat.group.starlink' },
    { id: 'qianfan', labelKey: 'sat.group.qianfan' },
    { id: 'oneweb', labelKey: 'sat.group.oneweb' },
    { id: 'kuiper', labelKey: 'sat.group.kuiper' },
    { id: 'communications', labelKey: 'sat.group.communications' },
    { id: 'navigation', labelKey: 'sat.group.navigation' },
    { id: 'earth-observation', labelKey: 'sat.group.earthObservation' },
    { id: 'weather', labelKey: 'sat.group.weather' },
    { id: 'military', labelKey: 'sat.group.military' },
    { id: 'science', labelKey: 'sat.group.science' },
    { id: 'ambiguous', labelKey: 'sat.group.ambiguous' }
];
export const WGS84_EARTH_RADIUS_KM = 6378.137;
export const EARTH_MU_KM3_S2 = 398600.4418;
export const GEOSTATIONARY_ALTITUDE_KM = 35786;
export const SIDEREAL_DAY_MINUTES = 1436.068;
export const SATELLITE_LAYER_OPACITY = 0.88;
export const SATELLITE_LAYER_DIMMED_OPACITY = 0.22;
export const SATELLITE_PICK_THRESHOLD = 0.18;
export const SATELLITE_POINT_BASE_SIZE = 0.11;
export const SATELLITE_POINT_REDUCED_MIN_SIZE = 0.012;
export const SATELLITE_POINT_REALISTIC_MIN_SIZE = 0.000012;
export const SATELLITE_POINT_REALISTIC_FAR_DISTANCE = 180;
export const SATELLITE_SIZE_SCALE_DEFAULT = 110;
export const SATELLITE_SIZE_SCALE_MIN = 5;
export const SATELLITE_SIZE_SCALE_MAX = 250;
export const RECENT_SATELLITE_WINDOW_DAYS = 30;
export const RECENT_SATELLITE_LIST_LIMIT = 60;
export const RECENT_MISSION_GROUP_LIMIT = 30;
export const REENTRY_WATCH_PERIGEE_KM = 260;
export const REENTRY_RISK_LIMIT = 60;
export const REENTRY_WATCH_LIMIT = 40;
export const LAUNCH_FOCUS_VIEW_DISTANCE = 10.5;
export const LAUNCH_ASCENT_SAMPLE_COUNT = 144;
export const LAUNCH_ORBIT_PREVIEW_SAMPLE_COUNT = 220;
export const LAUNCH_GROUND_TRACK_DEFAULT_REVOLUTIONS = 2;
export const LAUNCH_GROUND_TRACK_MIN_REVOLUTIONS = 1;
export const LAUNCH_GROUND_TRACK_MAX_REVOLUTIONS = 5;
export const SATELLITE_ORBIT_SAMPLE_COUNT = 360;
export const SATELLITE_ORBIT_DEFAULT_REVOLUTIONS = 2;
export const SATELLITE_ORBIT_MIN_REVOLUTIONS = 1;
export const SATELLITE_ORBIT_MAX_REVOLUTIONS = 5;
export const SATELLITE_ORBIT_PERIOD_MIN_MINUTES = 80;
export const SATELLITE_ORBIT_PERIOD_MAX_MINUTES = 8 * SIDEREAL_DAY_MINUTES;
export const SATELLITE_ORBIT_REFRESH_MS = 30 * 1000;
export const EARTH_TRANSPARENT_RENDER_ORDER = 5;
export const SATELLITE_OVERLAY_RENDER_ORDER = 40;
export const SCENE_CLICK_DRAG_TOLERANCE_PX = 7;
export const PROVIDER_STATS_WINDOW_DAYS = 100;

export const SUPPORTED_LANGUAGES = ['en', 'de'];
export const DACH_REGIONS = new Set(['DE', 'AT', 'CH', 'LI']);
export const DACH_TIME_ZONES = new Set(['Europe/Berlin', 'Europe/Vienna', 'Europe/Zurich', 'Europe/Busingen']);
