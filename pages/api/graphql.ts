import { type NextApiRequest, type NextApiResponse } from 'next';
import { createYoga, type Plugin } from 'graphql-yoga';
// @ts-ignore
import processRequest from 'graphql-upload/processRequest.js';

import { keystoneContext } from '../../features/keystone/context';
import { MAX_GRAPHQL_PARSE_TOKENS, rentalQueryLimits } from '../../features/keystone/security/graphql-limits';
import { graphqlListPathMultiplierPlugin } from '../../features/keystone/security/graphql-query-cost';
import {
  GraphqlRequestBodyTooLargeError,
  isGraphqlUploadLimitError,
  MAX_GRAPHQL_MULTIPART_FIELD_BYTES,
  MAX_GRAPHQL_REQUEST_BODY_BYTES,
  MAX_GRAPHQL_UPLOAD_FILE_BYTES,
  MAX_GRAPHQL_UPLOAD_FILES,
  readBoundedGraphqlRequestBody,
} from '../../features/keystone/lib/graphqlRequestBody';

export const config = {
  api: {
    bodyParser: false,
  },
};

export const graphqlRequestLimitsPlugin: Plugin = {
  onParse({ parseFn, setParseFn }) {
    setParseFn((source, options) => parseFn(source, { ...options, maxTokens: MAX_GRAPHQL_PARSE_TOKENS }));
  },
  onValidate({ addValidationRule }) {
    addValidationRule(rentalQueryLimits);
  },
};

function payloadTooLarge(res: NextApiResponse) {
  return res.status(413).json({ error: 'Request is too large' });
}

function invalidMultipartRequest(res: NextApiResponse) {
  return res.status(400).json({ error: 'Invalid multipart GraphQL request' });
}

export function getGraphiQLOptions(environment = process.env.NODE_ENV) {
  if (environment === 'production') return { graphiql: false as const };
  return {
    renderGraphiQL: () => `
          <!DOCTYPE html>
          <html lang="en">
            <body style="margin: 0; overflow-x: hidden; overflow-y: hidden">
            <div id="sandbox" style="height:100vh; width:100vw;"></div>
            <script src="https://embeddable-sandbox.cdn.apollographql.com/_latest/embeddable-sandbox.umd.production.min.js"></script>
            <script>
            new window.EmbeddedSandbox({
              target: "#sandbox",
              initialEndpoint: window.location.href,
              hideCookieToggle: false,
              initialState: { includeCookies: true }
            });
            </script>
            </body>
          </html>`,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Match the reference apps: ordinary GraphQL reads (including the proxy's
  // session check) do not consume a shared ingress-IP request bucket.
  const contentLength = Number(req.headers['content-length']);
  if (Number.isFinite(contentLength) && contentLength > MAX_GRAPHQL_REQUEST_BODY_BYTES) {
    req.resume();
    return payloadTooLarge(res);
  }

  const contentType = req.headers['content-type'];
  if (contentType?.startsWith('multipart/form-data')) {
    try {
      req.body = await processRequest(req, res, {
        maxFieldSize: MAX_GRAPHQL_MULTIPART_FIELD_BYTES,
        maxFileSize: MAX_GRAPHQL_UPLOAD_FILE_BYTES,
        maxFiles: MAX_GRAPHQL_UPLOAD_FILES,
      });
    } catch (error) {
      if (error instanceof GraphqlRequestBodyTooLargeError || isGraphqlUploadLimitError(error)) return payloadTooLarge(res);
      if (typeof error === 'object' && error !== null && 'status' in error && error.status === 400) {
        return invalidMultipartRequest(res);
      }
      throw error;
    }
  } else if (req.method !== 'GET' && req.method !== 'HEAD') {
    try {
      req.body = await readBoundedGraphqlRequestBody(req);
    } catch (error) {
      if (error instanceof GraphqlRequestBodyTooLargeError) return payloadTooLarge(res);
      throw error;
    }
  }

  return createYoga({
    ...getGraphiQLOptions(),
    plugins: [graphqlRequestLimitsPlugin, graphqlListPathMultiplierPlugin],
    graphqlEndpoint: '/api/graphql',
    schema: keystoneContext.graphql.schema,
    context: ({ req: yogaReq, res: yogaRes }: { req: any; res: any }) => keystoneContext.withRequest(yogaReq, yogaRes),
    multipart: false,
  })(req, res);
}
