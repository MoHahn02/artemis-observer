import { LAUNCH_VERIFY_WINDOW_MS } from './config.js';

export function createLaunchUtils(t) {
    function formatLaunchCountdown(target) {
        if (!target) return '--';
        const diff = target.getTime() - Date.now();
        if (diff <= 0) return t('countdown.reached');
        const sec = Math.floor(diff / 1000);
        const days = Math.floor(sec / 86400);
        const hours = Math.floor(sec / 3600) % 24;
        const minutes = Math.floor(sec / 60) % 60;
        const seconds = sec % 60;
        const pad2 = (value) => String(value).padStart(2, '0');
        if (days > 0) return `${days}d ${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
        return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
    }

    function launchInstant(launch) {
        const raw = launch?.net || launch?.window_start || launch?.windowStart;
        if (!raw) return null;
        const date = new Date(raw);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function launchLatitude(launch) {
        const value = launch?.latitude ?? launch?.pad?.latitude;
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : NaN;
    }

    function launchLongitude(launch) {
        const value = launch?.longitude ?? launch?.pad?.longitude;
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : NaN;
    }

    function isEarthLaunch(launch) {
        const lat = launchLatitude(launch);
        const lon = launchLongitude(launch);
        return Number.isFinite(lat) && Number.isFinite(lon);
    }

    function launchOrganization(launch) {
        if (typeof launch?.provider === 'string' && launch.provider.trim()) return launch.provider.trim();
        const lsp = launch?.launch_service_provider;
        if (lsp?.name) return String(lsp.name).trim();
        const manufacturer = launch?.rocket?.configuration?.manufacturer;
        if (manufacturer?.name) return String(manufacturer.name).trim();
        return t('launch.unknownOrg');
    }

    function launchKey(launch) {
        return String(launch?.id || `${launch?.name || 'launch'}-${launch?.net || launch?.window_start || ''}`);
    }

    function launchPadLabel(launch) {
        if (typeof launch?.pad === 'string' && launch.pad.trim()) {
            return [launch.pad.trim(), launch.padLocation].filter(Boolean).join(' · ');
        }
        const pad = launch?.pad?.name || t('launch.unknownPad');
        const location = launch?.pad?.location?.name || '';
        return [pad, location].filter(Boolean).join(' · ');
    }

    function launchPadName(launch) {
        if (typeof launch?.pad === 'string' && launch.pad.trim()) return launch.pad.trim();
        return launch?.pad?.name || t('launch.unknownPad');
    }

    function launchPadLocationName(launch) {
        return launch?.padLocation || launch?.pad?.location?.name || '';
    }

    function launchRocketName(launch) {
        if (typeof launch?.rocket === 'string' && launch.rocket.trim()) return launch.rocket.trim();
        return launch?.rocket?.configuration?.full_name ||
            launch?.rocket?.configuration?.name ||
            t('launch.unknownRocket');
    }

    function launchStatusLabel(launch) {
        if (launch?.statusName) return launch.statusName;
        if (typeof launch?.status === 'string' && launch.status.trim()) return launch.status.trim();
        return launch?.status?.name || t('launch.unknownStatus');
    }

    function launchStatusText(launch) {
        return [
            launch?.outcome,
            typeof launch?.status === 'string' ? launch.status : '',
            launch?.statusName,
            launch?.statusAbbrev,
            launch?.statusDescription,
            launch?.status?.abbrev,
            launch?.status?.name,
            launch?.status?.description
        ].filter(Boolean).join(' ').toLowerCase();
    }

    function classifyLaunchStatus(launch) {
        const text = launchStatusText(launch);
        if (!text) return 'scheduled';
        if (/(success|successful)/.test(text)) return 'success';
        if (/(partial failure|failure|failed|lost)/.test(text)) return 'failure';
        if (/(cancel|cancelled|canceled|scrub|scrubbed)/.test(text)) return 'cancelled';
        if (/(hold|delay|delayed|postponed|slip|tbc|tbd|to be confirmed|to be determined|unconfirmed)/.test(text)) return 'delayed';
        if (/(in flight|flight|liftoff|lift-off|launch in progress)/.test(text)) return 'live';
        if (/(go|confirmed|ready|on schedule)/.test(text)) return 'go';
        return 'scheduled';
    }

    function launchCountdownStatusClass(launch) {
        if (!launch) return '';
        const status = classifyLaunchStatus(launch);
        if (status === 'success') return 'status-success';
        if (status === 'failure') return 'status-failure';
        if (status === 'cancelled') return 'status-cancelled';
        if (status === 'delayed') return 'status-delayed';
        if (status === 'live') return 'status-go';

        const when = launchInstant(launch);
        if (when && when.getTime() - Date.now() <= LAUNCH_VERIFY_WINDOW_MS && launch?.preflightStatus === 'go') {
            return 'status-go';
        }
        if (status === 'go' && when && when.getTime() - Date.now() <= LAUNCH_VERIFY_WINDOW_MS) {
            return 'status-go';
        }
        return '';
    }

    function applyLaunchStatusClass(element, launch) {
        if (!element) return;
        ['status-go', 'status-delayed', 'status-cancelled', 'status-success', 'status-failure'].forEach((name) => {
            element.classList.remove(name);
        });
        const statusClass = launchCountdownStatusClass(launch);
        if (statusClass) element.classList.add(statusClass);
    }

    function launchStatusBadge(launch) {
        if (launch?.outcome) {
            if (launch.outcome === 'success') return { text: t('launch.status.success'), className: 'status-success' };
            if (launch.outcome === 'failure') return { text: t('launch.status.failure'), className: 'status-failure' };
            if (launch.outcome === 'cancelled') return { text: t('launch.status.cancelled'), className: 'status-cancelled' };
            if (launch.outcome === 'delayed') return { text: t('launch.status.delayed'), className: 'status-delayed' };
            if (launch.outcome === 'go') return { text: t('launch.status.goT15'), className: 'status-go' };
        }
        const status = classifyLaunchStatus(launch);
        if (status === 'success') return { text: t('launch.status.success'), className: 'status-success' };
        if (status === 'failure') return { text: t('launch.status.failure'), className: 'status-failure' };
        if (status === 'cancelled') return { text: t('launch.status.cancelled'), className: 'status-cancelled' };
        if (status === 'delayed') return { text: t('launch.status.delayed'), className: 'status-delayed' };
        if (status === 'live') return { text: 'Live', className: 'status-go' };
        if (status === 'go') return { text: 'Go', className: 'status-go' };
        return { text: launchStatusLabel(launch), className: '' };
    }

    function belongsInLaunchHistory(launch, now = Date.now()) {
        const when = launchInstant(launch);
        if (!when) return Boolean(launch?.outcome);
        const isFuture = when.getTime() > now;
        if (isFuture && classifyLaunchStatus(launch) === 'delayed') return false;
        return Boolean(launch?.outcome) || when.getTime() <= now;
    }

    function isTerminalLaunch(launch) {
        const terminalStates = new Set(['success', 'failure', 'cancelled']);
        const outcome = String(launch?.outcome || '').toLowerCase();
        const postflightStatus = String(launch?.postflightStatus || '').toLowerCase();
        return terminalStates.has(outcome) ||
            terminalStates.has(postflightStatus) ||
            terminalStates.has(classifyLaunchStatus(launch));
    }

    function belongsInUpcomingLaunch(launch) {
        return !isTerminalLaunch(launch);
    }

    function launchStory(launch) {
        if (launch?.missionDescription) return launch.missionDescription;
        if (typeof launch?.mission === 'string' && launch.mission.trim()) return launch.mission.trim();
        return launch?.mission?.description ||
            launch?.mission?.name ||
            t('launch.noStory');
    }

    function launchVideoCandidates(launch) {
        const candidates = [];
        const addUrl = (entry) => {
            if (!entry) return;
            if (typeof entry === 'string') {
                candidates.push({ url: entry, title: 'Livestream' });
                return;
            }
            if (entry.url) {
                candidates.push({
                    url: entry.url,
                    title: entry.title || entry.description || entry.source || 'Livestream',
                    featured: Boolean(entry.featured),
                    priority: Number.isFinite(Number(entry.priority)) ? Number(entry.priority) : 999
                });
            }
        };

        addUrl(launch?.livestreamUrl);
        if (Array.isArray(launch?.vidURLs)) launch.vidURLs.forEach(addUrl);
        if (Array.isArray(launch?.vid_urls)) launch.vid_urls.forEach(addUrl);
        if (Array.isArray(launch?.videos)) launch.videos.forEach(addUrl);

        return candidates
            .filter((entry) => /^https?:\/\//i.test(entry.url))
            .sort((a, b) => {
                const aYoutube = /youtu\.?be|youtube\.com/i.test(a.url) ? 0 : 1;
                const bYoutube = /youtu\.?be|youtube\.com/i.test(b.url) ? 0 : 1;
                if (aYoutube !== bYoutube) return aYoutube - bYoutube;
                if (a.featured !== b.featured) return a.featured ? -1 : 1;
                return a.priority - b.priority;
            });
    }

    function launchLivestream(launch) {
        return launchVideoCandidates(launch)[0] || null;
    }

    function youtubeEmbedUrl(url) {
        try {
            const parsed = new URL(url);
            let id = '';
            if (parsed.hostname.includes('youtu.be')) {
                id = parsed.pathname.split('/').filter(Boolean)[0] || '';
            } else if (parsed.pathname.startsWith('/watch')) {
                id = parsed.searchParams.get('v') || '';
            } else if (parsed.pathname.startsWith('/live/') || parsed.pathname.startsWith('/embed/')) {
                id = parsed.pathname.split('/').filter(Boolean)[1] || '';
            }
            return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}?rel=0` : '';
        } catch (error) {
            return '';
        }
    }

    function launchStreamSearchUrl(launch) {
        const query = [
            launch?.name,
            launchRocketName(launch),
            launchOrganization(launch),
            'launch livestream'
        ].filter(Boolean).join(' ');
        return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    }

    function launchExternalUrl(launch) {
        if (launch?.sourceUrl) return launch.sourceUrl;
        if (launch?.livestreamUrl) return launch.livestreamUrl;
        const firstVideo = Array.isArray(launch?.vidURLs) && launch.vidURLs.length > 0 ? launch.vidURLs[0]?.url : '';
        const firstInfo = Array.isArray(launch?.infoURLs) && launch.infoURLs.length > 0 ? launch.infoURLs[0]?.url : '';
        return firstVideo || firstInfo || launch?.url || '';
    }

    function formatCoordinates(launch) {
        const lat = launchLatitude(launch);
        const lon = launchLongitude(launch);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return '--';
        const latHemisphere = lat >= 0 ? 'N' : 'S';
        const lonHemisphere = lon >= 0 ? 'E' : 'W';
        return `${Math.abs(lat).toFixed(2)}° ${latHemisphere}, ${Math.abs(lon).toFixed(2)}° ${lonHemisphere}`;
    }

    return {
        formatLaunchCountdown,
        launchInstant,
        launchLatitude,
        launchLongitude,
        isEarthLaunch,
        launchOrganization,
        launchKey,
        launchPadLabel,
        launchPadName,
        launchPadLocationName,
        launchRocketName,
        launchStatusLabel,
        launchStatusText,
        classifyLaunchStatus,
        launchCountdownStatusClass,
        applyLaunchStatusClass,
        launchStatusBadge,
        belongsInLaunchHistory,
        isTerminalLaunch,
        belongsInUpcomingLaunch,
        launchStory,
        launchVideoCandidates,
        launchLivestream,
        youtubeEmbedUrl,
        launchStreamSearchUrl,
        launchExternalUrl,
        formatCoordinates
    };
}
