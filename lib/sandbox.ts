// lib/sandbox.ts
import { Daytona } from "@daytonaio/sdk";

export const daytona = new Daytona({
  apiKey: process.env.DAYTONA_API_KEY!,
  organizationId: process.env.DAYTONA_ORGANIZATION_ID!,
});

export async function createAgentSandbox() {
  // 1) Create sandbox from your custom image
  const sandbox = await daytona.create(
    {
      image: "ghcr.io/michaelshimeles/sandbox-server:node",
      resources: {
        cpu: 1,
        memory: 2,
        disk: 1,
      },
      envVars: {
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY!,
        PORT: "3000",
      },
      autoStopInterval: 60 * 30,
    },
    {
      onSnapshotCreateLogs: (chunk: string) => {
        console.log(chunk);
      },
    },
  );

  // 2) Start the Express agent server inside the sandbox
  const sessionId = `agent-${sandbox.id}`;

  await sandbox.process.createSession(sessionId);

  // Start the agent server - use sh -c to properly handle backgrounding
  // The async flag should keep it running, but we also background it with &
  await sandbox.process.executeSessionCommand(sessionId, {
    command: "sh -c 'cd /sandbox-server && node dist/agent.js > /tmp/agent.log 2>&1 &'",
    async: true,
  });

  // Give the process a moment to start up before checking health
  await new Promise((r) => setTimeout(r, 3000));

  // 3) Get preview URL for port 3000
  const preview = await sandbox.getPreviewLink(3000);

  // 4) Wait for agent to be ready (using root endpoint as health check)
  await waitForAgent(preview.url, preview.token);

  return {
    id: sandbox.id,
    agentUrl: preview.url,
    previewToken: preview.token,
    sandbox,
  };
}

export async function deleteAgentSandbox(sandbox: any) {
  await sandbox.delete();
}

export async function archiveAgentSandbox(sandbox: any) {
  await sandbox.archive();
}

// Simple health-check loop against the preview URL
async function waitForAgent(url: string, token: string) {
  const maxMs = 60_000; // 60s
  const start = Date.now();
  let attempt = 0;

  console.log(`[sandbox] Waiting for agent at ${url}...`);

  while (Date.now() - start < maxMs) {
    attempt++;
    try {
      // Use root endpoint as health check since /health returns 404 from proxy
      // The root endpoint works and confirms the server is running
      const res = await fetch(url, {
        headers: { "X-Daytona-Preview-Token": token },
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const responseText = await res.text();
        // Verify it's the expected response from our Express server
        if (responseText.includes('"ok":true') || responseText.includes('"message":"Hello World"')) {
          console.log(
            `[sandbox] Agent is ready (attempt ${attempt}, status ${res.status})`,
          );
          return;
        } else {
          console.log(
            `[sandbox] Unexpected response (attempt ${attempt}): ${responseText.substring(0, 100)}`,
          );
        }
      } else {
        console.log(
          `[sandbox] Root endpoint not ready yet (attempt ${attempt}, status ${res.status})`,
        );
      }
    } catch (err) {
      if (attempt % 5 === 0) {
        console.log(
          `[sandbox] Still waiting... (attempt ${attempt}, ${
            Math.round((Date.now() - start) / 1000)
          }s, error: ${(err as any)?.message || err})`,
        );
      }
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  const elapsed = Math.round((Date.now() - start) / 1000);
  throw new Error(`Agent did not start within ${elapsed}s timeout`);
}
