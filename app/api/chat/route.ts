import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText, UIMessage, convertToModelMessages, tool, stepCountIs } from 'ai';
import { Sandbox } from "@vercel/sandbox"
import z from 'zod';
import { after } from 'next/server';
import ms from 'ms';
import { addLog } from '@/lib/logs';

const anthropic = createAnthropic();

// Store sandbox globally to reuse across requests
let globalSandbox: Sandbox | null = null;
let globalSandboxUrl: string = '';

// Helper function to reset sandbox state
function resetSandbox() {
    console.log('[sandbox] 🔄 Resetting sandbox state...');
    globalSandbox = null;
    globalSandboxUrl = '';
}

// Helper function to check if error is a sandbox-stopped error
function isSandboxStoppedError(error: any): boolean {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return errorMsg.includes('410') || 
           errorMsg.includes('sandbox_stopped') || 
           errorMsg.includes('no longer available');
}

export async function POST(request: Request) {
    const { messages } = await request.json();
    
    let sandbox: Sandbox | null = globalSandbox
    let sandboxUrl = globalSandboxUrl
    let setupSteps: string[] = []
    
    const logMessage = (msg: string) => {
        console.log(msg);
        addLog(msg);
    };

    async function initializeSandbox(force = false) {
        if (force) {
            resetSandbox();
            sandbox = null;
            sandboxUrl = '';
        }

        if (globalSandbox && globalSandboxUrl && !force) {
            sandbox = globalSandbox;
            sandboxUrl = globalSandboxUrl;
            logMessage(`[sandbox] ♻️  Reusing existing sandbox: ${globalSandboxUrl}`);
            setupSteps.push(`♻️  Reusing existing sandbox`);
            setupSteps.push(`✅ App running at: ${globalSandboxUrl}`);
            return sandboxUrl;
        }

        logMessage(`[sandbox] 🚀 Creating NEW sandbox from React template...`);
        setupSteps.push('🚀 Creating sandbox from React template...');

        const newSandbox = await Sandbox.create({
            source: {
                url: 'https://github.com/michaelshimeles/react-template',
                type: 'git',
            },
            resources: { vcpus: 4 },
            timeout: ms('10m'),
            ports: [3000],
            runtime: 'node22',
        });

        sandbox = newSandbox;
        globalSandbox = newSandbox;

        logMessage(`[sandbox] ✅ Sandbox created`);
        setupSteps.push('✅ Sandbox created');

        logMessage(`[sandbox] 📦 Installing dependencies...`);
        setupSteps.push('📦 Installing dependencies...');

        const install = await newSandbox.runCommand({
            cmd: 'npm',
            args: ['install', '--loglevel', 'info'],
        });

        if (install.exitCode != 0) {
            logMessage('[sandbox] ❌ Installing packages failed');
            setupSteps.push('❌ Installing packages failed');
            throw new Error('Installing packages failed');
        }

        logMessage(`[sandbox] ✅ Dependencies installed`);
        setupSteps.push('✅ Dependencies installed');

        logMessage(`[sandbox] 🔥 Starting development server...`);
        setupSteps.push('🔥 Starting development server...');

        await newSandbox.runCommand({
            cmd: 'npm',
            args: ['run', 'dev'],
            detached: true,
        });

        sandboxUrl = newSandbox.domain(3000);
        globalSandboxUrl = sandboxUrl;

        logMessage(`[sandbox] ✅ App running at: ${sandboxUrl}`);
        setupSteps.push(`✅ App running at: ${sandboxUrl}`);

        return sandboxUrl;
    }

    sandboxUrl = await initializeSandbox();

    console.log("sandboxUrl", sandboxUrl);

    const systemPrompt = `You are a powerful coding agent that can read and write files in a React Vite project. 

🚀 SANDBOX SETUP COMPLETED:
${setupSteps.map(step => `- ${step}`).join('\n')}

SANDBOX INFO:
- React app running at: ${sandboxUrl}
- Dev server is ready and will hot-reload changes
- You can write files, install packages, and run commands
- Write files to paths like "src/App.tsx", "src/components/MyComponent.tsx", etc.

🎨 TAILWIND CSS IS PRE-INSTALLED AND CONFIGURED:
- Tailwind CSS, PostCSS, and Autoprefixer are already installed
- Configuration files (tailwind.config.js, postcss.config.js) are set up
- src/index.css already has @tailwind directives
- You can immediately use Tailwind utility classes in your components
- ALWAYS use Tailwind CSS for styling - create beautiful, modern, polished UIs
- Use proper spacing (p-4, m-2, gap-6), colors (bg-blue-500, text-gray-700), typography (text-lg, font-semibold)
- Add rounded corners (rounded-lg), shadows (shadow-md), transitions (transition-all), and hover effects
- Create professional, well-designed components with good color contrast and visual hierarchy

🎯 CRITICAL: You MUST include this exact URL in your first response: ${sandboxUrl}
The UI will automatically create an iframe when it detects this URL pattern.`;

    const result = await streamText({
        model: anthropic("claude-haiku-4-5"),
        system: systemPrompt,
        messages: convertToModelMessages(messages),
        tools: {
            writeFiles: tool({
                description: "Write or update files in the React project sandbox. Use this to create components, modify App.jsx, add new features, etc.",
                inputSchema: z.object({
                    files: z.array(
                        z.object({
                            path: z.string().describe("File path relative to project root (e.g., 'src/App.jsx', 'src/components/Header.jsx')"),
                            contents: z.string().describe("Complete file contents"),
                        })
                    ).describe("Array of files to write"),
                }),
                execute: async ({ files }) => {
                    const logMsg = `[agent] Writing ${files.length} files: ${files.map(f => f.path).join(', ')}`;
                    console.log(logMsg);
                    addLog(logMsg);

                    const performWrite = async (attempt = 1): Promise<{ success: boolean; message: string; step: string; files?: string }> => {
                        let activeSandbox = sandbox;

                        if (!activeSandbox) {
                            try {
                                await initializeSandbox(true);
                                activeSandbox = sandbox;
                            } catch (setupError) {
                                const setupErrorMessage = setupError instanceof Error ? setupError.message : String(setupError);
                                const setupErrMsg = `[agent] ❌ Failed to start sandbox: ${setupErrorMessage}`;
                                addLog(setupErrMsg);
                                return {
                                    success: false,
                                    message: `❌ Sandbox start failed: ${setupErrorMessage}`,
                                    step: 'sandbox_start_failed'
                                };
                            }
                        }

                        if (!activeSandbox) {
                            const errMsg = '[agent] ❌ Sandbox unavailable after initialization attempt.';
                            addLog(errMsg);
                            return {
                                success: false,
                                message: '❌ Sandbox unavailable after initialization attempt.',
                                step: 'error'
                            };
                        }

                        try {
                            await activeSandbox.writeFiles(
                                files.map((file) => ({
                                    path: file.path,
                                    content: Buffer.from(file.contents, "utf8"),
                                }))
                            );

                            const fileList = files.map(f => f.path).join(', ');
                            const successMsg = `[agent] ✅ Successfully wrote: ${fileList}`;
                            addLog(successMsg);

                            return {
                                success: true,
                                message: `✅ Wrote ${files.length} file(s): ${fileList}`,
                                step: 'write_files',
                                files: fileList
                            };
                        } catch (error) {
                            console.error('[agent] Error writing files:', error);
                            const errorMessage = error instanceof Error ? error.message : String(error);
                            const errMsg = `[agent] ❌ Error writing files: ${errorMessage}`;
                            addLog(errMsg);

                            if (isSandboxStoppedError(error) && attempt === 1) {
                                const resetMsg = '[agent] ⚠️ Sandbox has stopped. Attempting to start a new sandbox...';
                                console.log(resetMsg);
                                addLog(resetMsg);

                                try {
                                    await initializeSandbox(true);
                                } catch (setupError) {
                                    const setupErrorMessage = setupError instanceof Error ? setupError.message : String(setupError);
                                    const setupErrMsg = `[agent] ❌ Failed to restart sandbox: ${setupErrorMessage}`;
                                    addLog(setupErrMsg);
                                    return {
                                        success: false,
                                        message: `❌ Sandbox restart failed: ${setupErrorMessage}`,
                                        step: 'sandbox_restart_failed'
                                    };
                                }

                                const retryMsg = '[agent] 🔁 Retrying write operation in new sandbox...';
                                console.log(retryMsg);
                                addLog(retryMsg);
                                return performWrite(attempt + 1);
                            }

                            return {
                                success: false,
                                message: `❌ Error writing files: ${errorMessage}`,
                                step: 'error'
                            };
                        }
                    };

                    return performWrite();
                },
            }),
            installPackages: tool({
                description: "Install npm packages in the React project",
                inputSchema: z.object({
                    packages: z.array(z.string()).describe("Package names to install"),
                }),
                execute: async ({ packages }) => {
                    const performInstall = async (attempt = 1): Promise<{ success: boolean; message: string; step: string; output?: string; exitCode?: number; packages?: string }> => {
                        let activeSandbox = sandbox;

                        if (!activeSandbox) {
                            try {
                                await initializeSandbox(true);
                                activeSandbox = sandbox;
                            } catch (setupError) {
                                const setupErrorMessage = setupError instanceof Error ? setupError.message : String(setupError);
                                const setupErrMsg = `[agent] ❌ Failed to start sandbox: ${setupErrorMessage}`;
                                addLog(setupErrMsg);
                                return {
                                    success: false,
                                    message: `❌ Sandbox start failed: ${setupErrorMessage}`,
                                    step: 'sandbox_start_failed',
                                };
                            }
                        }

                        if (!activeSandbox) {
                            const errMsg = '[agent] ❌ Sandbox unavailable after initialization attempt.';
                            addLog(errMsg);
                            return {
                                success: false,
                                message: '❌ Sandbox unavailable after initialization attempt.',
                                step: 'error',
                            };
                        }

                        const installMsg = `[agent] Installing packages: ${packages.join(", ")}`;
                        console.log(installMsg);
                        addLog(installMsg);

                        try {
                            const installStep = await activeSandbox.runCommand({
                                cmd: "npm",
                                args: ["install", ...packages],
                            });

                            const output = await installStep.stdout();
                            console.log(`[agent] npm install exit=${installStep.exitCode}`);

                            if (installStep.exitCode !== 0) {
                                const errMsg = `[agent] ❌ Failed to install: ${packages.join(', ')}`;
                                addLog(errMsg);

                                return {
                                    success: false,
                                    output,
                                    exitCode: installStep.exitCode,
                                    message: `❌ Failed to install: ${packages.join(', ')}`,
                                    step: 'error',
                                };
                            }

                            const successMsg = `[agent] ✅ Installed: ${packages.join(', ')}`;
                            addLog(successMsg);

                            return {
                                success: true,
                                message: `📦 Installed: ${packages.join(', ')}`,
                                output,
                                exitCode: 0,
                                step: 'install_packages',
                                packages: packages.join(', '),
                            };
                        } catch (error) {
                            console.error('[agent] Error installing packages:', error);
                            const errorMessage = error instanceof Error ? error.message : String(error);

                            if (isSandboxStoppedError(error) && attempt === 1) {
                                const resetMsg = '[agent] ⚠️ Sandbox has stopped. Attempting to start a new sandbox before retrying npm install...';
                                console.log(resetMsg);
                                addLog(resetMsg);

                                try {
                                    await initializeSandbox(true);
                                } catch (setupError) {
                                    const setupErrorMessage = setupError instanceof Error ? setupError.message : String(setupError);
                                    const setupErrMsg = `[agent] ❌ Failed to restart sandbox: ${setupErrorMessage}`;
                                    addLog(setupErrMsg);
                                    return {
                                        success: false,
                                        message: `❌ Sandbox restart failed: ${setupErrorMessage}`,
                                        step: 'sandbox_restart_failed',
                                    };
                                }

                                const retryMsg = '[agent] 🔁 Retrying npm install in new sandbox...';
                                console.log(retryMsg);
                                addLog(retryMsg);
                                return performInstall(attempt + 1);
                            }

                            const errMsg = `[agent] ❌ Error installing packages: ${errorMessage}`;
                            addLog(errMsg);

                            return {
                                success: false,
                                message: `❌ Error installing packages: ${errorMessage}`,
                                step: 'error',
                            };
                        }
                    };

                    return performInstall();
                },
            }),
            runCommand: tool({
                description: "Run a command in the sandbox (e.g., for testing, checking file structure, etc.)",
                inputSchema: z.object({
                    command: z.string().describe("Command to run"),
                    args: z.array(z.string()).optional().describe("Command arguments"),
                }),
                execute: async ({ command, args = [] }) => {
                    const performCommand = async (attempt = 1): Promise<{ output: string; exitCode: number; url: string; message: string; step: string }> => {
                        let activeSandbox = sandbox;

                        if (!activeSandbox) {
                            try {
                                await initializeSandbox(true);
                                activeSandbox = sandbox;
                            } catch (setupError) {
                                const setupErrorMessage = setupError instanceof Error ? setupError.message : String(setupError);
                                const setupErrMsg = `[agent] ❌ Failed to start sandbox: ${setupErrorMessage}`;
                                addLog(setupErrMsg);
                                return {
                                    output: '',
                                    exitCode: 1,
                                    url: '',
                                    message: `❌ Sandbox start failed: ${setupErrorMessage}`,
                                    step: 'sandbox_start_failed',
                                };
                            }
                        }

                        if (!activeSandbox) {
                            const errMsg = '[agent] ❌ Sandbox unavailable after initialization attempt.';
                            addLog(errMsg);
                            return {
                                output: '',
                                exitCode: 1,
                                url: '',
                                message: '❌ Sandbox unavailable after initialization attempt.',
                                step: 'error',
                            };
                        }

                        const commandMsg = `[agent] Running: ${command} ${args.join(' ')}`.trim();
                        console.log(commandMsg);
                        addLog(commandMsg);

                        try {
                            const result = await activeSandbox.runCommand({
                                cmd: command,
                                args,
                            });

                            const output = await result.stdout();
                            console.log(`[agent] Command exit=${result.exitCode}`);

                            return {
                                output,
                                exitCode: result.exitCode,
                                url: sandboxUrl,
                                message: `⚙️ Ran: ${command} ${args.join(' ')}`.trim(),
                                step: 'run_command',
                            };
                        } catch (error) {
                            console.error('[agent] Error running command:', error);
                            const errorMessage = error instanceof Error ? error.message : String(error);

                            if (isSandboxStoppedError(error) && attempt === 1) {
                                const resetMsg = '[agent] ⚠️ Sandbox has stopped. Attempting to start a new sandbox before retrying command...';
                                console.log(resetMsg);
                                addLog(resetMsg);

                                try {
                                    await initializeSandbox(true);
                                } catch (setupError) {
                                    const setupErrorMessage = setupError instanceof Error ? setupError.message : String(setupError);
                                    const setupErrMsg = `[agent] ❌ Failed to restart sandbox: ${setupErrorMessage}`;
                                    addLog(setupErrMsg);
                                    return {
                                        output: '',
                                        exitCode: 1,
                                        url: '',
                                        message: `❌ Sandbox restart failed: ${setupErrorMessage}`,
                                        step: 'sandbox_restart_failed',
                                    };
                                }

                                const retryMsg = '[agent] 🔁 Retrying command in new sandbox...';
                                console.log(retryMsg);
                                addLog(retryMsg);
                                return performCommand(attempt + 1);
                            }

                            const errMsg = `[agent] ❌ Error running command: ${errorMessage}`;
                            addLog(errMsg);

                            return {
                                output: '',
                                exitCode: 1,
                                url: '',
                                message: `❌ Error running command: ${errorMessage}`,
                                step: 'error',
                            };
                        }
                    };

                    return performCommand();
                },
            }),
            getSandboxUrl: tool({
                description: "Get the URL where the React app is running",
                inputSchema: z.object({}),
                execute: async () => {
                    return { 
                        url: sandboxUrl,
                        message: `🚀 Sandbox URL: ${sandboxUrl}`,
                        step: 'get_url'
                    }
                },
            }),
        },
        stopWhen: stepCountIs(10),
        toolChoice: "required",
        onStepFinish: async ({ toolCalls, text }) => {
            if (toolCalls && toolCalls.length > 0) {
                toolCalls.forEach(call => {
                    console.log(`[step] Tool: ${call.toolName}`);
                });
            }
            if (text) {
                console.log(`[step] Text: ${text.substring(0, 100)}...`);
            }
        }
    });
    // after(async () => {
    //     // cleanup sandbox after request is done
    //     await sandbox.stop()
    // })

    console.log("result", result);

    const allToolCalls = (await result.steps).flatMap(step => step.toolCalls);

    console.log("allToolCalls", allToolCalls);

    // Add sandbox URL to response headers so frontend can detect it
    const response = result.toUIMessageStreamResponse();
    response.headers.set('X-Sandbox-URL', sandboxUrl);
    
    return response;
}