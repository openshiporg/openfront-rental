import crypto from 'node:crypto';

import { checkAbuseControlReadiness, resolveRequiredRemoteAbuseControlConfig } from './index';

function secureEqual(actual: string | null, expected: string) {
  if (!actual) return false;
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function abuseControlReadinessRoute(request: Request) {
  try {
    const config = resolveRequiredRemoteAbuseControlConfig();
    if (!secureEqual(request.headers.get('x-openfront-readiness-probe'), config.readinessProbeSecret!)) {
      return Response.json({ ready: false }, { status: 404 });
    }
    await checkAbuseControlReadiness(config);
    return Response.json({ ready: true, contractVersion: 1 }, { status: 200 });
  } catch {
    return Response.json({ ready: false }, { status: 503 });
  }
}
