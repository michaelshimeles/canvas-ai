import { createClaudeCode } from 'ai-sdk-provider-claude-code';
import { streamText, UIMessage, convertToModelMessages, tool, stepCountIs } from 'ai';
import { Sandbox } from "@vercel/sandbox"
import z from 'zod';
import { after } from 'next/server';


export async function POST(request: Request) {
    let sandbox: Sandbox | null = null

    sandbox = await Sandbox.create({
        runtime: "node22",
        // stop sandbox after 30 seconds of inactivity
        timeout: 30_000,
    })


    const { messages } = await request.json();

    const claudeCode = createClaudeCode({
        defaultSettings: {
            maxTurns: 5,
            allowedTools: [],
            executable: 'node',
            systemPrompt: 'You are a powerful coding agent that can read and write files. The file should be created in the Vercel sandbox. Do not use any other directories or files than the ones provided by the sandbox.',
        },
    });


    const result = await streamText({
        model: claudeCode("haiku"),
        messages: convertToModelMessages(messages),
        tools: {
            generateAndRunCode: tool({
                description: "Use this tool to run code in the Vercel sandbox",
                inputSchema: z.object({
                    code: z.string().describe("The code to run"),
                    packages: z
                        .array(z.string())
                        .nullable()
                        .default([])
                        .describe("Optional packages to install"),
                }),
                execute: async ({ code, packages }) => {
                    console.log("code", code);
                    // If the LLM output provides packages, install them with npm.
                    if (packages && packages.length > 0) {
                        console.log(`[agent] npm install ${packages.join(" ")}`)
                        const installStep = await sandbox.runCommand({
                            cmd: "npm",
                            args: ["install", ...packages],
                        })
                        const installOut = await installStep.stdout()
                        console.log(`[agent] npm install exit=${installStep.exitCode}`)
                        if (installStep.exitCode !== 0) {
                            return { output: installOut, exitCode: installStep.exitCode }
                        }
                    }
                    console.log(`[agent] generated code:\n${code}`)
                    console.log(`[agent] node -e (code length=${code.length})`)
                    // Execute generated code, e.g. node -e "console.log('Hello, world!')"
                    const runResult = await sandbox.runCommand({
                        cmd: "node",
                        args: ["-e", code],
                    })
                    const output = await runResult.stdout()
                    console.log(`[agent] node exit=${runResult.exitCode}`)
                    return { output, exitCode: runResult.exitCode }
                },
            }),
        },
        stopWhen: stepCountIs(10),
        toolChoice: "required"

    });
    after(async () => {
        // cleanup sandbox after request is done
        await sandbox.stop()
    })

    const allToolCalls = (await result.steps).flatMap(step => step.toolCalls);

    console.log("allToolCalls", allToolCalls);


    return result.toUIMessageStreamResponse();
}