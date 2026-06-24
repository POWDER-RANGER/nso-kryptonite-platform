/**
 * MITRE ATT&CK Technique Mapping — Active Directory Fusion
 * 
 * All techniques in this module mapped to ATT&CK with
 * detection twin references and safety constraints.
 */

export interface AttckTechnique {
  id: string; // e.g., "T1558.003"
  name: string;
  tactic: string;
  platform: string[];
  detectionRule: string; // Path to Sigma rule
  eventIds: number[];
  description: string;
}

export const AD_FUSION_TECHNIQUES: Record<string, AttckTechnique> = {
  'T1558.003': {
    id: 'T1558.003',
    name: 'Kerberoasting',
    tactic: 'Credential Access',
    platform: ['Windows'],
    detectionRule: 'modules/ad-fusion/src/blue/sigma-rules/kerberoasting.yml',
    eventIds: [4769],
    description: 'Requesting service tickets for offline cracking',
  },
  'T1558.004': {
    id: 'T1558.004',
    name: 'AS-REP Roasting',
    tactic: 'Credential Access',
    platform: ['Windows'],
    detectionRule: 'modules/ad-fusion/src/blue/sigma-rules/asrep-roasting.yml',
    eventIds: [4768],
    description: 'Capturing AS-REP responses for accounts with no pre-auth',
  },
  'T1003.006': {
    id: 'T1003.006',
    name: 'DCSync',
    tactic: 'Credential Access',
    platform: ['Windows'],
    detectionRule: 'modules/ad-fusion/src/blue/sigma-rules/dcsync-replication.yml',
    eventIds: [4662],
    description: 'Simulating DC replication to extract credential hashes',
  },
  'T1550.002': {
    id: 'T1550.002',
    name: 'Use Alternate Authentication Material (Pass the Ticket)',
    tactic: 'Lateral Movement',
    platform: ['Windows'],
    detectionRule: 'modules/ad-fusion/src/blue/sigma-rules/pass-the-ticket.yml',
    eventIds: [4624, 4769],
    description: 'Using stolen Kerberos tickets for lateral movement',
  },
};

/**
 * Verify a technique is in the authorized set
 * Used by scope enforcer to validate token permissions
 */
export function isAuthorizedTechnique(techniqueId: string): boolean {
  return techniqueId in AD_FUSION_TECHNIQUES;
}

/**
 * Get detection twin info for a technique
 */
export function getDetectionTwin(techniqueId: string): AttckTechnique | undefined {
  return AD_FUSION_TECHNIQUES[techniqueId];
}
