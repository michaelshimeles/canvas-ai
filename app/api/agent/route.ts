// app/api/agent/route.ts
import { NextRequest } from "next/server";
import { createAgentSandbox } from "@/lib/sandbox";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const { prompt, id, agentUrl, sessionId, previewToken } = await req.json();

    const rt: any = agentUrl
        ? { id, agentUrl, previewToken }
        : await createAgentSandbox();

    let token = rt.previewToken;

    const res = await fetch(`${rt.agentUrl}/agent`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Daytona-Preview-Token": token,
        },
        body: JSON.stringify({ prompt, resumeSessionId: sessionId }),
    });

    if (!res.ok) {
        const text = await res.text();
        console.error("Agent call failed:", res.status, res.statusText, text);
        return Response.json(
            {
                ok: false,
                error: `Agent HTTP ${res.status}: ${text}`,
                ...rt,
            },
            { status: 500 },
        );
    }

    const data = await res.json();

    return Response.json({
        id: rt.id,
        agentUrl: rt.agentUrl,
        previewToken: token,
        ...data,
    });
}
