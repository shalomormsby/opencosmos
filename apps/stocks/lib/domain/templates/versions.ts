/**
 * Template Version Management
 *
 * Defines current version, upgrade changelogs, and version comparison utilities.
 */

export const CURRENT_VERSION = '1.0.0';

export interface UpgradeChange {
  type: 'added' | 'improved' | 'fixed';
  item: string;
  impact: string;
}

export interface UpgradeChangelog {
  date: string;
  title: string;
  changes: UpgradeChange[];
  breaking: boolean;
  estimatedTime: string;
}

export const UPGRADE_CHANGELOGS: Record<string, UpgradeChangelog> = {
  '1.0.0': {
    date: '2025-11-09',
    title: 'Initial Release',
    changes: [],
    breaking: false,
    estimatedTime: 'N/A',
  },
  // Future versions will be added here
  // Example:
  // '1.1.0': {
  //   date: '2025-11-15',
  //   title: 'Sector Analysis Database',
  //   changes: [
  //     {
  //       type: 'added',
  //       item: 'Sector Analysis database',
  //       impact: 'New database will be created in your workspace'
  //     },
  //     {
  //       type: 'improved',
  //       item: 'Updated analysis prompts with sector context',
  //       impact: 'Content only, no data changes'
  //     },
  //     {
  //       type: 'fixed',
  //       item: 'Composite Score calculation for edge cases',
  //       impact: 'More accurate scoring for low-liquidity stocks'
  //     }
  //   ],
  //   breaking: false,
  //   estimatedTime: '30 seconds'
  // }
};

/**
 * Compare two semantic version strings
 * @returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    if (parts1[i] > parts2[i]) return 1;
    if (parts1[i] < parts2[i]) return -1;
  }

  return 0; // Equal
}

/**
 * Check if upgrade is needed
 */
export function needsUpgrade(currentVersion: string, targetVersion: string): boolean {
  return compareVersions(targetVersion, currentVersion) > 0;
}

/**
 * Get all versions between current and target (for incremental upgrades)
 */
export function getUpgradePath(currentVersion: string, targetVersion: string): string[] {
  const allVersions = Object.keys(UPGRADE_CHANGELOGS).sort(compareVersions);
  const startIndex = allVersions.indexOf(currentVersion);
  const endIndex = allVersions.indexOf(targetVersion);

  if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
    return [];
  }

  // Return versions between current and target (inclusive of target, exclusive of current)
  return allVersions.slice(startIndex + 1, endIndex + 1);
}

/**
 * Validate version format
 */
export function isValidVersion(version: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(version);
}
