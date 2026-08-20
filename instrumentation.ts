import { assertAbuseControlRuntimeReady } from './features/integrations/abuse-control/config';

export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') assertAbuseControlRuntimeReady();
}
