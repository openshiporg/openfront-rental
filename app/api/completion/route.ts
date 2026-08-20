export async function POST() {
  return Response.json(
    {
      error: 'AI completion is disabled',
      details: 'This route is fail-closed until the MCP transport can use an instance-scoped same-origin fetch without forwarding dashboard cookies to external providers.',
    },
    { status: 501 },
  );
}
