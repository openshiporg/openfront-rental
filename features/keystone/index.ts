import { createAuth } from "@keystone-6/auth";
import { config } from "@keystone-6/core";
import "dotenv/config";
import { models } from "./models";
import { statelessSessions } from "@keystone-6/core/session";
import { extendGraphqlSchema } from "./mutations";
import { sendPasswordResetEmail } from "./lib/mail";
import { resolvePostgresDatabaseUrl, resolveSessionSecret } from "./lib/runtimeSecrets";
import { createKeystoneSessionConfig } from "./sessionPolicy";
import { withGraphqlListMaxTake } from "./security/graphql-limits";
import { parseStorageEndpoint } from "./lib/storage-endpoint";

const databaseURL = resolvePostgresDatabaseUrl();

const boundedModels = withGraphqlListMaxTake(models);

const sessionConfig = createKeystoneSessionConfig(resolveSessionSecret());

// As in E-commerce: development keeps local defaults; production must configure real storage
// instead of silently uploading with placeholder credentials.
function productionEnv(name: string, developmentFallback: string): string {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${name} is required in production`);
  }
  return developmentFallback;
}

const bucketName = productionEnv("S3_BUCKET_NAME", "keystone-test");
const region = productionEnv("S3_REGION", "ap-southeast-2");
const accessKeyId = productionEnv("S3_ACCESS_KEY_ID", "keystone");
const secretAccessKey = productionEnv("S3_SECRET_ACCESS_KEY", "keystone");
const endpoint = parseStorageEndpoint(productionEnv("S3_ENDPOINT", "https://sfo3.digitaloceanspaces.com")).origin;

const { withAuth } = createAuth({
  listKey: "User",
  identityField: "email",
  secretField: "password",
  initFirstItem: {
    fields: ["name", "email", "password"],
    itemData: {
      role: {
        create: {
          name: "Admin",
          canAccessDashboard: true,
          canReadProperties: true,
          canManageProperties: true,
          canReadListings: true,
          canManageListings: true,
          canReadCalendar: true,
          canManageCalendar: true,
          canReadPricing: true,
          canManagePricing: true,
          canReadReservations: true,
          canManageReservations: true,
          canReadGuests: true,
          canManageGuests: true,
          canReadMessages: true,
          canManageMessages: true,
          canReadChannels: true,
          canManageChannels: true,
          canReadPayouts: true,
          canManagePayouts: true,
          canReadReviews: true,
          canManageReviews: true,
          canReadPayments: true,
          canManagePayments: true,
          canReadReports: true,
          canManageReports: true,
          canSeeOtherPeople: true,
          canEditOtherPeople: true,
          canManagePeople: true,
          canManageRoles: true,
          canManageOnboarding: true,
          canManageSettings: true,
        },
      },
    },
  },
  passwordResetLink: {
    async sendToken(args) {
      const user = await args.context.sudo().query.User.findOne({ where: { id: String(args.itemId) }, query: 'role { canAccessDashboard }' });
      const audience = user?.role?.canAccessDashboard ? 'dashboard' : 'guest';
      try {
        await sendPasswordResetEmail(args.token, args.identity, undefined, audience);
      } catch {
        // Keep the response identical for known and unknown emails; delivery failures are operational.
        console.error('Password reset email could not be sent.');
      }
    },
  },
  sessionData: `
    name
    email
    isActive
    role {
      id
      name
      canAccessDashboard
      canReadProperties
      canManageProperties
      canReadListings
      canManageListings
      canReadCalendar
      canManageCalendar
      canReadPricing
      canManagePricing
      canReadReservations
      canManageReservations
      canReadGuests
      canManageGuests
      canReadMessages
      canManageMessages
      canReadChannels
      canManageChannels
      canReadPayouts
      canManagePayouts
      canReadReviews
      canManageReviews
      canReadPayments
      canManagePayments
      canReadReports
      canManageReports
      canSeeOtherPeople
      canEditOtherPeople
      canManagePeople
      canManageRoles
      canManageOnboarding
      canManageSettings
    }
  `,
});

export default withAuth(
  config({
    db: {
      provider: "postgresql",
      url: databaseURL,
    },
    lists: boundedModels,
    storage: {
      my_images: {
        kind: "s3",
        type: "image",
        bucketName,
        region,
        accessKeyId,
        secretAccessKey,
        endpoint,
        signed: { expiry: 5000 },
        forcePathStyle: true,
      },
    },
    ui: {
      isAccessAllowed: ({ session }) => session?.data.role?.canAccessDashboard ?? false,
    },
    session: statelessSessions(sessionConfig),
    graphql: {
      extendGraphqlSchema,
      bodyParser: { limit: '64kb' },
    },
    server: {
      maxFileSize: 5 * 1024 * 1024,
      extendHttpServer(server) {
        server.headersTimeout = 10_000;
        server.requestTimeout = 15_000;
      },
    },
  })
);