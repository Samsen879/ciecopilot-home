import { buildPreflightBaselineReport } from '../../scripts/phase2/preflight_backend_baseline.js';

describe('phase2 preflight baseline report', () => {
  it('reports gateway-centered security posture instead of module-local auth heuristics', () => {
    const report = buildPreflightBaselineReport();

    expect(report.route_baseline.uses_route_registry).toBe(true);
    expect(report.route_baseline.uses_gateway_diagnostics).toBe(true);
    expect(report.route_baseline.route_count).toBe(report.route_baseline.available_modules.length);
    expect(report.security_baseline_snapshot.architecture.mode).toBe('gateway_centralized');
    expect(report.security_baseline_snapshot.gateway_summary.consistency_status).toBe('pass');
    expect(report.security_baseline_snapshot.route_policies[0]).toHaveProperty('coverage_actors');
    expect(report.security_baseline_snapshot.route_policies[0]).toHaveProperty('verification_strategies');
    expect(report.security_baseline_snapshot.risks).toEqual([]);
  });
});
