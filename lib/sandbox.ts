// lib/sandbox.ts
import { Daytona } from "@daytonaio/sdk";

const DEFAULT_TEMPLATE_URL = "https://github.com/michaelshimeles/react-template";

// Call Convex function via HTTP API
export async function callConvexFunction(functionPath: string, args: any) {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  }
  
  const url = `${process.env.NEXT_PUBLIC_CONVEX_URL}/api/query`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: functionPath,
      args,
      format: "json",
    }),
  });

  if (!response.ok) {
    throw new Error(`Convex function call failed: ${response.statusText}`);
  }

  return response.json();
}

export async function callConvexMutation(functionPath: string, args: any) {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  }
  
  const url = `${process.env.NEXT_PUBLIC_CONVEX_URL}/api/mutation`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: functionPath,
      args,
      format: "json",
    }),
  });

  if (!response.ok) {
    throw new Error(`Convex mutation call failed: ${response.statusText}`);
  }

  return response.json();
}

export const daytona = new Daytona({
  apiKey: process.env.DAYTONA_API_KEY!,
  organizationId: process.env.DAYTONA_ORGANIZATION_ID!,
});

export async function createAgentSandbox(userId?: string, templateUrl?: string) {
  // 1) Create sandbox from your custom image
  const sandbox = await daytona.create(
    {
      image: "ghcr.io/michaelshimeles/sandbox-server:node-20251123-v3",
      resources: {
        cpu: 2,
        memory: 4,
        disk: 10,
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

export async function getOrCreateUserSandbox(
  userId: string,
  templateUrl: string = DEFAULT_TEMPLATE_URL
) {
  try {
    // Check if user already has a sandbox
    let existingSandbox = null;
    try {
      const convexResponse = await callConvexFunction("sandboxes:getSandboxByUserId", {
        user_id: userId,
      });
      console.log("[getOrCreateUserSandbox] Convex lookup result:", convexResponse);
      
      // Extract value from Convex HTTP API response format
      // Convex HTTP API returns { status: 'success', value: {...} }
      existingSandbox = convexResponse?.value || convexResponse;
    } catch (err) {
      console.warn("[getOrCreateUserSandbox] Convex lookup failed (will create new):", err);
    }

    if (existingSandbox && existingSandbox.agent_url) {
      // Update last used timestamp
      try {
        await callConvexMutation("sandboxes:updateSandboxLastUsed", {
          sandbox_id: existingSandbox.sandbox_id,
        });
      } catch (err) {
        console.warn("[getOrCreateUserSandbox] Failed to update last used:", err);
      }

      return {
        id: existingSandbox.sandbox_id,
        agentUrl: existingSandbox.agent_url,
        previewToken: existingSandbox.preview_token,
        sessionId: existingSandbox.session_id,
        templateUrl: existingSandbox.template_url,
        tunnelUrl: existingSandbox.tunnel_url,
      };
    }

    // Create new sandbox
    console.log("[getOrCreateUserSandbox] Creating new sandbox...");
    let sandboxResult;
    try {
      sandboxResult = await createAgentSandbox(userId, templateUrl);
      console.log("[getOrCreateUserSandbox] Sandbox created:", {
        id: sandboxResult?.id,
        hasAgentUrl: !!sandboxResult?.agentUrl,
        hasPreviewToken: !!sandboxResult?.previewToken,
      });
    } catch (err) {
      console.error("[getOrCreateUserSandbox] Failed to create sandbox:", err);
      throw new Error(`Failed to create sandbox: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!sandboxResult || !sandboxResult.agentUrl || !sandboxResult.previewToken) {
      throw new Error(`Invalid sandbox result: ${JSON.stringify(sandboxResult)}`);
    }

    // Initialize template if provided
    let tunnelUrl: string | undefined;
    if (templateUrl) {
      try {
        const initResult = await initializeTemplate(
          sandboxResult.id,
          templateUrl,
          sandboxResult.agentUrl,
          sandboxResult.previewToken
        );
        tunnelUrl = initResult?.tunnelUrl || undefined;
        console.log("[getOrCreateUserSandbox] Got tunnelUrl:", tunnelUrl);
        if (tunnelUrl) {
          try {
            await callConvexMutation("sandboxes:updateSandboxTunnel", {
              sandbox_id: sandboxResult.id,
              tunnel_url: tunnelUrl,
            });
          } catch (err) {
            console.warn("[getOrCreateUserSandbox] Failed to store tunnel url:", err);
          }
        }
        console.log("[getOrCreateUserSandbox] Template initialized");
      } catch (err) {
        console.error("[getOrCreateUserSandbox] Template initialization failed:", err);
        // Continue anyway - sandbox is created
      }
    }

    // Store in Convex (don't fail if this errors)
    try {
      await callConvexMutation("sandboxes:createSandbox", {
        user_id: userId,
        sandbox_id: sandboxResult.id,
        agent_url: sandboxResult.agentUrl,
        preview_token: sandboxResult.previewToken,
        tunnel_url: tunnelUrl || undefined,
        template_url: templateUrl,
      });
      console.log("[getOrCreateUserSandbox] Stored in Convex");
    } catch (err) {
      console.warn("[getOrCreateUserSandbox] Failed to store in Convex:", err);
      // Continue anyway - sandbox is created and working
    }

    return {
      id: sandboxResult.id,
      agentUrl: sandboxResult.agentUrl,
      previewToken: sandboxResult.previewToken,
      tunnelUrl,
      sessionId: undefined,
      templateUrl,
    };
  } catch (error: any) {
    console.error("[getOrCreateUserSandbox] Error:", error);
    console.error("[getOrCreateUserSandbox] Error stack:", error?.stack);
    throw error; // Re-throw so the route can handle it
  }
}

export async function refreshUserSandbox(
  userId: string,
  sandboxId: string,
  templateUrl: string = DEFAULT_TEMPLATE_URL
) {
  try {
    console.log("[refreshUserSandbox] Deleting invalid sandbox:", sandboxId);
    await callConvexMutation("sandboxes:deleteSandbox", {
      sandbox_id: sandboxId,
    });
    
    // Create a new one
    console.log("[refreshUserSandbox] Creating fresh sandbox...");
    return await getOrCreateUserSandbox(userId, templateUrl);
  } catch (error) {
    console.error("[refreshUserSandbox] Error refreshing sandbox:", error);
    throw error;
  }
}

export async function initializeTemplate(
  sandboxId: string,
  templateUrl: string,
  agentUrl: string,
  previewToken: string
) {
  try {
    const res = await fetch(`${agentUrl}/init-template`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Daytona-Preview-Token": previewToken,
      },
      body: JSON.stringify({ templateUrl }),
    });

    if (!res.ok) {
      const text = await res.text();
      // Don't throw - template initialization is optional (endpoint may not be accessible via proxy)
      console.warn(`[initializeTemplate] Template initialization failed (non-blocking): ${res.status} ${text.substring(0, 100)}`);
      return { ok: false, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("[initializeTemplate] Error:", err);
    // Don't throw - template initialization is optional
    return { ok: false, error: err?.message };
  }
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
