const TOKEN_KEY = 'nso_kryptonite_range_token';
const ROLE_KEY = 'nso_kryptonite_range_role';
export type RangeOperatorRole = 'RED' | 'BLUE' | 'FACILITATOR';
export function rangeAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = window.sessionStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}
export function getSelectedRangeRole(): RangeOperatorRole {
  if (typeof window === 'undefined') return 'FACILITATOR';
  const role = window.sessionStorage.getItem(ROLE_KEY);
  return role === 'RED' || role === 'BLUE' || role === 'FACILITATOR' ? role : 'FACILITATOR';
}
export function saveRangeAccess(role: RangeOperatorRole, token: string): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(ROLE_KEY, role);
  if (token.trim()) window.sessionStorage.setItem(TOKEN_KEY, token.trim());
  window.dispatchEvent(new Event('range-access-changed'));
}
export function clearRangeAccess(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(ROLE_KEY);
  window.dispatchEvent(new Event('range-access-changed'));
}
