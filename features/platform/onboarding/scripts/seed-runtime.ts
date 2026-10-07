import {
  disconnectAccommodationSeedClient,
  resolveRuntimeOnboardingUserId,
  seedAccommodationPlatform,
} from '../lib/seedAccommodationPlatform';
import { assertCliRuntimeDatabase } from './runtimeDatabaseGuard';

assertCliRuntimeDatabase();

resolveRuntimeOnboardingUserId()
  .then((userId) => seedAccommodationPlatform(undefined, userId))
  .then((summary) => console.log(JSON.stringify(summary, null, 2)))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectAccommodationSeedClient();
  });
