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

export async function POST(request: Request) {
    const { messages } = await request.json();
    
    let sandbox: Sandbox | null = globalSandbox
    let sandboxUrl = globalSandboxUrl
    let setupComplete = false
    let setupSteps: string[] = []
    
    // Only create sandbox if it doesn't exist
    const setupPromise = (async () => {
        if (globalSandbox && globalSandboxUrl) {
            console.log(`[sandbox] ♻️  Reusing existing sandbox: ${globalSandboxUrl}`);
            setupSteps.push(`♻️  Reusing existing sandbox`)
            setupSteps.push(`✅ App running at: ${globalSandboxUrl}`)
            return globalSandboxUrl;
        }
        
        const logMessage = (msg: string) => {
            console.log(msg);
            addLog(msg);
        };

        logMessage(`[sandbox] 🚀 Creating NEW sandbox from React template...`);
        setupSteps.push('🚀 Creating sandbox from React template...')
        
        sandbox = await Sandbox.create({
            source: {
                url: 'https://github.com/michaelshimeles/react-template',
                type: 'git',
            },
            resources: { vcpus: 4 },
            timeout: ms('10m'),
            ports: [4444],
            runtime: 'node22',
        })
        
        logMessage(`[sandbox] ✅ Sandbox created`);
        setupSteps.push('✅ Sandbox created')
        
        logMessage(`[sandbox] 📦 Installing dependencies...`);
        setupSteps.push('📦 Installing dependencies...')
        
        const install = await sandbox.runCommand({
            cmd: 'npm',
            args: ['install'],
        })

        if (install.exitCode != 0) {
            logMessage('[sandbox] ❌ Installing packages failed');
            setupSteps.push('❌ Installing packages failed')
        } else {
            logMessage(`[sandbox] ✅ Dependencies installed`);
            setupSteps.push('✅ Dependencies installed')
        }

        // Configure Vite to allow all hosts (needed for Vercel sandbox domains)
        logMessage(`[sandbox] 📝 Configuring Vite...`);
        setupSteps.push('📝 Configuring Vite...')
        const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 4444,
    strictPort: true,
    allowedHosts: ['.vercel.run'],
  },
})
`;
        
        await sandbox.writeFiles([{
            path: 'vite.config.js',
            content: Buffer.from(viteConfig, 'utf8')
        }]);

        logMessage(`[sandbox] 🔥 Starting development server...`);
        setupSteps.push('🔥 Starting development server...')
        
        await sandbox.runCommand({
            cmd: 'npm',
            args: ['run', 'dev'],
            detached: true,
        })

        sandboxUrl = sandbox.domain(4444)
        logMessage(`[sandbox] ✅ App running at: ${sandboxUrl}`)
        setupSteps.push(`✅ App running at: ${sandboxUrl}`)
        setupComplete = true
        
        // Store globally for reuse
        globalSandbox = sandbox
        globalSandboxUrl = sandboxUrl
        
        return sandboxUrl
    })();
    
    // Wait for sandbox to be ready
    sandboxUrl = await setupPromise;

    const systemPrompt = `You are a powerful coding agent that can read and write files in a React Vite project. 

🚀 SANDBOX SETUP COMPLETED:
${setupSteps.map(step => `- ${step}`).join('\n')}

SANDBOX INFO:
- React app running at: ${sandboxUrl}
- Dev server is ready and will hot-reload changes
- You can write files, install packages, and run commands

Write files to paths like "src/App.jsx", "src/components/MyComponent.jsx", etc.

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
                    if (!sandbox) {
                        return { success: false, message: 'Sandbox not initialized', step: 'error' }
                    }
                    
                    const logMsg = `[agent] Writing ${files.length} files: ${files.map(f => f.path).join(', ')}`;
                    console.log(logMsg);
                    addLog(logMsg);
                    
                    try {
                        await sandbox.writeFiles(
                            files.map((file) => ({
                                path: file.path,
                                content: Buffer.from(file.contents, "utf8"),
                            }))
                        )
                        
                        const fileList = files.map(f => f.path).join(', ')
                        const successMsg = `[agent] ✅ Successfully wrote: ${fileList}`;
                        addLog(successMsg);
                        
                        return { 
                            success: true, 
                            message: `✅ Wrote ${files.length} file(s): ${fileList}`,
                            step: 'write_files',
                            files: fileList
                        }
                    } catch (error) {
                        console.error('[agent] Error writing files:', error)
                        const errorMessage = error instanceof Error ? error.message : String(error)
                        const errMsg = `[agent] ❌ Error writing files: ${errorMessage}`;
                        addLog(errMsg);
                        
                        return { 
                            success: false, 
                            message: `❌ Error writing files: ${errorMessage}`,
                            step: 'error'
                        }
                    }
                },
            }),
            installPackages: tool({
                description: "Install npm packages in the React project",
                inputSchema: z.object({
                    packages: z.array(z.string()).describe("Package names to install"),
                }),
                execute: async ({ packages }) => {
                    if (!sandbox) {
                        return { success: false, message: 'Sandbox not initialized', step: 'error' }
                    }
                    
                    const installMsg = `[agent] Installing packages: ${packages.join(", ")}`;
                    console.log(installMsg);
                    addLog(installMsg);
                    
                    const installStep = await sandbox.runCommand({
                        cmd: "npm",
                        args: ["install", ...packages],
                    })
                    
                    const output = await installStep.stdout()
                    console.log(`[agent] npm install exit=${installStep.exitCode}`)
                    
                    if (installStep.exitCode !== 0) {
                        const errMsg = `[agent] ❌ Failed to install: ${packages.join(', ')}`;
                        addLog(errMsg);
                        
                        return { 
                            success: false, 
                            output, 
                            exitCode: installStep.exitCode,
                            message: `❌ Failed to install: ${packages.join(', ')}`,
                            step: 'error'
                        }
                    }
                    
                    const successMsg = `[agent] ✅ Installed: ${packages.join(', ')}`;
                    addLog(successMsg);
                    
                    return { 
                        success: true, 
                        message: `📦 Installed: ${packages.join(', ')}`,
                        output,
                        exitCode: 0,
                        step: 'install_packages',
                        packages: packages.join(', ')
                    }
                },
            }),
            runCommand: tool({
                description: "Run a command in the sandbox (e.g., for testing, checking file structure, etc.)",
                inputSchema: z.object({
                    command: z.string().describe("Command to run"),
                    args: z.array(z.string()).optional().describe("Command arguments"),
                }),
                execute: async ({ command, args = [] }) => {
                    if (!sandbox) {
                        return { output: '', exitCode: 1, url: '', message: 'Sandbox not initialized', step: 'error' }
                    }
                    
                    console.log(`[agent] Running: ${command} ${args.join(' ')}`)
                    
                    const result = await sandbox.runCommand({
                        cmd: command,
                        args,
                    })
                    
                    const output = await result.stdout()
                    console.log(`[agent] Command exit=${result.exitCode}`)
                    
                    return { 
                        output, 
                        exitCode: result.exitCode,
                        url: sandboxUrl,
                        message: `⚙️ Ran: ${command} ${args.join(' ')}`,
                        step: 'run_command'
                    }
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