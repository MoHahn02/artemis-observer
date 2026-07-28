import assert from 'node:assert/strict';
import test from 'node:test';

import {
    SATELLITE_SIZE_SCALE_DEFAULT,
    SATELLITE_SIZE_SCALE_MIN,
    SATELLITE_SIZE_SCALE_MAX
} from '../js/config.js';
import { createI18n } from '../js/i18n.js';
import { createLaunchUtils } from '../js/launch-utils.js';
import {
    SATCAT_OWNER_LABELS,
    SATELLITE_NAME_OPERATOR_PROFILES
} from '../js/satellite-profile-data.js';

test('configuration keeps the default satellite scale inside its supported range', () => {
    assert.ok(SATELLITE_SIZE_SCALE_DEFAULT >= SATELLITE_SIZE_SCALE_MIN);
    assert.ok(SATELLITE_SIZE_SCALE_DEFAULT <= SATELLITE_SIZE_SCALE_MAX);
});

test('i18n switches languages and interpolates placeholders', () => {
    let language = 'de';
    const i18n = createI18n(() => language);

    assert.equal(i18n.t('common.unknown'), 'Unbekannt');
    assert.equal(i18n.t('age.minutes', { count: 3 }), '3 min alt');

    language = 'en';
    assert.equal(i18n.t('common.unknown'), 'Unknown');
    assert.equal(i18n.translateDataLabel('Deutschland'), 'Germany');
});

test('satellite profile lookup data exposes key catalog mappings', () => {
    assert.equal(SATCAT_OWNER_LABELS.US, 'USA');
    const starlink = SATELLITE_NAME_OPERATOR_PROFILES.find(([pattern]) => pattern.test('STARLINK-1234'));
    assert.deepEqual(starlink?.slice(1), ['SpaceX', 'USA']);
});

test('launch helpers normalize status, coordinates, and YouTube URLs', () => {
    const launch = createLaunchUtils((key) => key);
    const successful = {
        id: 'demo-1',
        status: 'Launch successful',
        latitude: '28.5721',
        longitude: '-80.6480'
    };

    assert.equal(launch.launchKey(successful), 'demo-1');
    assert.equal(launch.classifyLaunchStatus(successful), 'success');
    assert.equal(launch.isEarthLaunch(successful), true);
    assert.match(launch.formatCoordinates(successful), /28\.57.*N.*80\.65.*W/);
    assert.equal(
        launch.youtubeEmbedUrl('https://www.youtube.com/watch?v=abc123'),
        'https://www.youtube.com/embed/abc123?rel=0'
    );
});
