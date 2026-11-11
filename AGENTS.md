
## Notifications
NEVER build outbox/texting/email notification machinery or cron/worker services. External events = Openfront Commerce webhooks (features/webhooks) only.
NEVER add `setInterval`/`setTimeout` loops, `instrumentation.ts` jobs or background pollers. Time-based state is computed on read, advanced idempotently on the request that touches it, or advanced by a staff button. Calendar subscription links are re-read on the Channels page load (a few stale ones per load) and by the staff "Refresh calendar links" button.
