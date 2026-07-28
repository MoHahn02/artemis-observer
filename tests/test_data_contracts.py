from __future__ import annotations

import json
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = REPO_ROOT / "data"


def load_json(path: Path) -> object:
    return json.loads(path.read_text(encoding="utf-8"))


def tle_catalog_ids(path: Path) -> set[str]:
    catalog_ids: set[str] = set()
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        if not line.startswith("1 "):
            continue
        raw_id = line[2:7].strip()
        if raw_id:
            catalog_ids.add(str(int(raw_id)) if raw_id.isdigit() else raw_id)
    return catalog_ids


class DataContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.payloads = {
            path.name: load_json(path)
            for path in DATA_DIR.glob("*.json")
        }

    def test_all_expected_json_artifacts_exist_and_parse(self) -> None:
        expected = {
            "earth-observation.json",
            "launch-db.json",
            "launch-feed.json",
            "launch-stats.json",
            "satellite-live-history.json",
            "satellite-profiles.json",
            "worker-state.json",
        }

        self.assertTrue(expected.issubset(self.payloads))

    def test_launch_artifacts_have_stable_shapes_and_unique_ids(self) -> None:
        feed = self.payloads["launch-feed.json"]
        database = self.payloads["launch-db.json"]
        stats = self.payloads["launch-stats.json"]

        self.assertIsInstance(feed, dict)
        self.assertIsInstance(feed.get("launches"), list)
        self.assertIsInstance(database, dict)
        launches = database.get("launches")
        self.assertIsInstance(launches, list)
        self.assertLessEqual(len(launches), 1000)
        launch_ids = [item.get("id") for item in launches]
        self.assertTrue(all(isinstance(item, str) and item for item in launch_ids))
        self.assertEqual(len(launch_ids), len(set(launch_ids)))

        for period in ("week", "month", "year"):
            values = stats.get(period)
            self.assertIsInstance(values, dict)
            self.assertTrue({"current", "previous", "delta"}.issubset(values))
            self.assertTrue(all(isinstance(values[key], int) for key in ("current", "previous", "delta")))

    def test_satellite_profiles_match_the_active_tle_snapshot(self) -> None:
        active_ids = tle_catalog_ids(DATA_DIR / "active-satellites.tle")
        profile_payload = self.payloads["satellite-profiles.json"]
        profiles = profile_payload.get("profiles")

        self.assertGreater(len(active_ids), 1000)
        self.assertIsInstance(profiles, dict)
        profile_ids = set(profiles)
        overlap = len(profile_ids & active_ids) / max(1, len(active_ids))
        self.assertGreater(overlap, 0.98)
        for catalog_id, entry in list(profiles.items())[:100]:
            self.assertTrue(catalog_id)
            self.assertIsInstance(entry, dict)
            self.assertIsInstance(entry.get("satcat"), dict)
            self.assertIsInstance(entry.get("profile"), dict)

    def test_earth_observation_manifest_only_references_local_assets(self) -> None:
        payload = self.payloads["earth-observation.json"]
        candidates = payload.get("candidates")

        self.assertIsInstance(candidates, list)
        self.assertGreater(len(candidates), 0)
        for candidate in candidates:
            relative_path = candidate.get("imageUrl")
            self.assertIsInstance(relative_path, str)
            self.assertFalse(relative_path.startswith(("http://", "https://")))
            asset_path = (REPO_ROOT / relative_path).resolve()
            self.assertTrue(asset_path.is_relative_to(REPO_ROOT.resolve()))
            self.assertTrue(asset_path.is_file(), relative_path)
            self.assertGreater(asset_path.stat().st_size, 1024, relative_path)

    def test_worker_state_has_persistent_scheduler_fields(self) -> None:
        state = self.payloads["worker-state.json"]

        for field in (
            "lastFeedRefreshAt",
            "lastSatelliteRefreshAt",
            "lastSatelliteProfileRefreshAt",
            "lastIssOemRefreshAt",
            "lastEarthObservationRefreshAt",
        ):
            self.assertIsInstance(state.get(field), str)
        self.assertIsInstance(state.get("pendingChecks"), list)
        self.assertIsInstance(state.get("lastErrors"), list)

    def test_artemis_trajectory_is_ordered_and_numeric(self) -> None:
        trajectory = load_json(REPO_ROOT / "nasa_trajectory.json")

        self.assertIsInstance(trajectory, list)
        self.assertGreater(len(trajectory), 100)
        previous_time = float("-inf")
        for point in trajectory:
            self.assertTrue({"t", "x", "y", "z", "v"}.issubset(point))
            self.assertTrue(all(isinstance(point[key], (int, float)) for key in ("t", "x", "y", "z", "v")))
            self.assertGreaterEqual(point["t"], previous_time)
            previous_time = point["t"]


if __name__ == "__main__":
    unittest.main()
