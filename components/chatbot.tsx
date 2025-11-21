"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ai-elements/message";
import {
  IconArrowUp,
  IconCloud,
  IconPhotoScan,
  IconCamera,
  IconMessageCircle,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useParams } from "next/navigation";

const MODELS = [
  {
    value: "claude-code",
    name: "Claude Code",
    description: "Most advanced model",
    max: true,
  },
];

interface ChatbotProps {
  onCapture?: () => void;
  showMessages?: boolean;
  onToggleMessages?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  projectId?: string;
}

export default function Chat({ onCapture, showMessages: showMessagesProp, onToggleMessages, isFullscreen, onToggleFullscreen, projectId }: ChatbotProps) {
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [input, setInput] = useState("");
  const [showMessages, setShowMessages] = useState(showMessagesProp ?? true);
  const isControlled = showMessagesProp !== undefined;

  // Sync internal state with prop
  useEffect(() => {
    if (showMessagesProp !== undefined) {
      setShowMessages(showMessagesProp);
    }
  }, [showMessagesProp]);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [lastSandboxUrl, setLastSandboxUrl] = useState<string | null>(null);

  const [chatId, setChatId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "streaming" | "submitted">("idle");
  const [messages, setMessages] = useState<any[]>([]);

  const startCodeGen = useMutation(api.generate.startCodeGen);
  const continueChat = useAction(api.generate.continueChat);
  const projectData = useQuery(api.generate.getProjectById,
    projectId ? { project_id: projectId } : "skip"
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update messages from project data

  console.log("projectId", projectId)

  useEffect(() => {
    if (projectData?.chat) {
      const chat = projectData.chat;
      // Extract chat_id if available
      if (chat.id && !chatId) {
        setChatId(chat.id);
      }

      // Convert chat messages to our format
      if (chat.messages) {
        const formattedMessages = chat.messages.map((msg: any, idx: number) => {
          if (msg.role === "user" || msg.role === "assistant") {
            return {
              id: msg.id || `msg-${idx}`,
              role: msg.role,
              content: msg.content || msg.text || "",
              parts: msg.parts || []
            };
          }
          return null;
        }).filter(Boolean);

        setMessages(formattedMessages);
        setStatus("idle");
      }
    }
  }, [projectData, chatId]);

  const sendMessage = async ({ text, files }: { text: string; files?: any[] }) => {
    if (!text.trim()) return;

    // Add user message immediately
    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user" as const,
      content: text,
      parts: []
    };
    setMessages(prev => [...prev, userMessage]);
    setStatus("submitted");

    try {
      if (!chatId) {
        // First message - start new chat
        await startCodeGen({
          prompt: text,
          project_id: projectId || ""
        });
        setStatus("streaming");
      } else {
        // Continue existing chat
        setStatus("streaming");
        const result = await continueChat({
          chat_id: chatId,
          prompt: text,
          project_id: projectId || ""
        });

        // Update messages with response
        if (result?.chat?.messages) {
          const formattedMessages = result.chat.messages.map((msg: any, idx: number) => {
            if (msg.role === "user" || msg.role === "assistant") {
              return {
                id: msg.id || `msg-${idx}`,
                role: msg.role,
                content: msg.content || msg.text || "",
                parts: msg.parts || []
              };
            }
            return null;
          }).filter(Boolean);
          setMessages(formattedMessages);
        }
        setStatus("idle");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
      setStatus("idle");
      // Remove the user message on error
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
    }
  };

  // Listen for canvas image captures
  useEffect(() => {
    const handleImageCapture = (event: CustomEvent<string>) => {
      setAttachedImage(event.detail);
    };

    window.addEventListener('canvas-image-captured', handleImageCapture as EventListener);
    return () => {
      window.removeEventListener('canvas-image-captured', handleImageCapture as EventListener);
    };
  }, []);

  // Handle file selection for image uploads
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      toast.error('Please select an image file');
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, status]);

  // Detect sandbox URL from message content and tool outputs
  useEffect(() => {
    if (messages.length === 0) return;

    // Check the last few messages for sandbox URLs
    const messagesToCheck = messages.slice(-3); // Check last 3 messages

    for (const message of messagesToCheck) {
      // Check message text content
      const content = extractMessageText(message);
      const urlMatch = content.match(/https:\/\/[^\s]+\.vercel\.run/);

      if (urlMatch && urlMatch[0] !== lastSandboxUrl) {
        const sandboxUrl = urlMatch[0];
        console.log('Detected sandbox URL from message:', sandboxUrl);
        setLastSandboxUrl(sandboxUrl);

        // Dispatch event to create iframe on canvas
        window.dispatchEvent(new CustomEvent('create-sandbox-iframe', {
          detail: { url: sandboxUrl }
        }));
        toast.success('Creating sandbox iframe on canvas!');
        return;
      }

      // Also check tool call outputs
      const toolCalls = extractToolCalls(message);
      for (const call of toolCalls) {
        const output = call.output || call.result;
        if (output?.url) {
          const url = output.url;
          if (url.includes('.vercel.run') && url !== lastSandboxUrl) {
            console.log('Detected sandbox URL from tool output:', url);
            setLastSandboxUrl(url);

            window.dispatchEvent(new CustomEvent('create-sandbox-iframe', {
              detail: { url }
            }));
            toast.success('Creating sandbox iframe on canvas!');
            return;
          }
        }
      }
    }
  }, [messages, lastSandboxUrl]);

  type RenderMessage = {
    key: string;
    from: "user" | "assistant";
    content: string;
    avatar: string;
    name: string;
  };

  const extractMessageText = (message: any): string => {
    if (Array.isArray(message?.parts) && message.parts.length > 0) {
      return message.parts
        .map((part: any) => (part && part.type === "text" ? part.text ?? "" : ""))
        .join("")
        .trim();
    }

    if (typeof message?.content === "string") {
      return message.content.trim();
    }

    if (Array.isArray(message?.content)) {
      return message.content.join("").trim();
    }

    return "";
  };

  const extractToolCalls = (message: any): any[] => {
    // Check for toolInvocations (old format)
    if (message?.toolInvocations) {
      return message.toolInvocations;
    }

    // Check for parts array (new format)
    if (Array.isArray(message?.parts)) {
      const toolParts = message.parts.filter((part: any) =>
        part.type && part.type.startsWith('tool-') && part.state === 'output-available'
      );
      console.log('Tool parts found:', toolParts.length, toolParts);
      return toolParts;
    }

    return [];
  };

  const formattedMessages = useMemo<RenderMessage[]>(() => {
    const fallbackAvatar: Record<"user" | "assistant", string> = {
      user: "https://avatar.vercel.sh/user",
      assistant: "https://avatar.vercel.sh/assistant",
    };

    const fallbackName: Record<"user" | "assistant", string> = {
      user: "You",
      assistant: "Canvas AI",
    };

    return messages.reduce<RenderMessage[]>((accumulator, message, index) => {
      const content = extractMessageText(message);
      if (!content) {
        return accumulator;
      }

      const role: "user" | "assistant" = message.role === "user" ? "user" : "assistant";

      accumulator.push({
        key: message.id ?? `message-${index}`,
        from: role,
        content,
        avatar: fallbackAvatar[role],
        name: fallbackName[role],
      });

      return accumulator;
    }, []);
  }, [messages]);


  const handleModelChange = (value: string) => {
    const model = MODELS.find((m) => m.value === value);
    if (model) {
      setSelectedModel(model);
    }
  };

  const renderMaxBadge = () => (
    <div className="flex h-[14px] items-center gap-1.5 rounded border border-border px-1 py-0">
      <span
        className="text-[9px] font-bold uppercase"
        style={{
          background:
            "linear-gradient(to right, rgb(129, 161, 193), rgb(125, 124, 155))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        MAX
      </span>
    </div>
  );

  const handleToggleMessages = () => {
    if (!isControlled) {
      setShowMessages((prev) => !prev);
    }
    onToggleMessages?.();
  };

  if (isFullscreen) {
    return (
      <div className="fixed right-0 top-0 bottom-0 z-[1199] w-[20vw] border-l border-white/8 bg-[#141419]/95 text-sm text-white shadow-2xl backdrop-blur-xl flex flex-col">
        {showMessages && (
          <>
            <div className="p-4 border-b border-white/8">
              <h2 className="mb-0 text-sm font-medium tracking-tight text-white/90">
                Conversation
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {formattedMessages.length === 0 && status !== "streaming" && status !== "submitted" ? (
                <p className="text-xs text-slate-500">No messages yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {messages.map((message, idx) => {
                    const items = [];

                    const content = extractMessageText(message);
                    if (content) {
                      const role: "user" | "assistant" = message.role === "user" ? "user" : "assistant";
                      const fallbackAvatar = {
                        user: "https://avatar.vercel.sh/user",
                        assistant: "https://avatar.vercel.sh/assistant",
                      };
                      const fallbackName = {
                        user: "You",
                        assistant: "Canvas AI",
                      };

                      items.push(
                        <Message from={role} key={`msg-${message.id || idx}`}>
                          <MessageContent>{content}</MessageContent>
                          <MessageAvatar name={fallbackName[role]} src={fallbackAvatar[role]} />
                        </Message>
                      );
                    }

                    const toolCalls = extractToolCalls(message);
                    if (toolCalls.length > 0) {
                      items.push(
                        <div key={`tools-${message.id || idx}`} className="flex flex-col gap-1.5 text-xs mb-2">
                          {toolCalls.map((call: any, callIdx: number) => {
                            const output = call.output || call.result;
                            if (!output?.message) return null;

                            return (
                              <div
                                key={`${message.id}-${callIdx}`}
                                className="rounded-lg bg-slate-800/50 border border-slate-700/50 px-3 py-2 text-slate-300 font-mono text-[11px]"
                              >
                                {output.message}
                              </div>
                            );
                          })}
                        </div>
                      );
                    }

                    return items;
                  })}

                  {(status === "streaming" || status === "submitted") && (
                    <Message from="assistant" key="typing-indicator">
                      <MessageContent>
                        <div className="flex items-center gap-1.5 p-0 text-slate-400">
                          <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                          <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                          <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
                        </div>
                      </MessageContent>
                      <MessageAvatar name="Canvas AI" src="https://avatar.vercel.sh/assistant" />
                    </Message>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </>
        )}

        {/* Input area at bottom */}
        <div className="p-4 border-t border-slate-700/50">
          <div className="flex flex-col gap-4">
            <div className="flex min-h-[120px] flex-col rounded-2xl cursor-text bg-card border border-border shadow-lg">
              {attachedImage && (
                <div className="relative p-2 border-b border-border">
                  <img
                    src={attachedImage}
                    alt="Canvas capture"
                    className="h-20 rounded border border-border object-contain bg-muted"
                  />
                  <button
                    onClick={() => setAttachedImage(null)}
                    className="absolute top-3 right-3 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              )}
              <div className="flex-1 relative overflow-y-auto max-h-[258px]">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage({
                        text: input,
                        files: attachedImage ? [{
                          type: 'file',
                          url: attachedImage,
                          mediaType: 'image/png',
                        }] : undefined,
                      });
                      setInput('');
                      setAttachedImage(null);
                    }
                  }}
                  placeholder="Ask anything"
                  className="w-full border-0 p-3 transition-[padding] duration-200 ease-in-out min-h-[48.4px] outline-none text-[16px] text-foreground resize-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent! whitespace-pre-wrap break-words"
                />
              </div>

              <div className="flex min-h-[40px] items-center gap-2 p-2 pb-1">
                <div className="flex aspect-1 items-center gap-1 rounded-full bg-muted p-1.5 text-xs">
                  <IconCloud className="h-4 w-4 text-muted-foreground" />
                </div>

                <div className="relative flex items-center">
                  <Select
                    value={selectedModel.value}
                    onValueChange={handleModelChange}
                  >
                    <SelectTrigger className="w-fit border-none bg-transparent! p-0 text-sm text-muted-foreground hover:text-foreground focus:ring-0 shadow-none">
                      <SelectValue>
                        {selectedModel.max ? (
                          <div className="flex items-center gap-1">
                            <span>{selectedModel.name}</span>
                            {renderMaxBadge()}
                          </div>
                        ) : (
                          <span>{selectedModel.name}</span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {MODELS.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          {model.max ? (
                            <div className="flex items-center gap-1">
                              <span>{model.name}</span>
                              {renderMaxBadge()}
                            </div>
                          ) : (
                            <span>{model.name}</span>
                          )}
                          <span className="text-muted-foreground block text-xs">
                            {model.description}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="ml-auto flex items-center gap-3">
                  {onCapture && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onCapture}
                      className="h-6 w-6 text-muted-foreground hover:text-foreground transition-all duration-100"
                      title="Capture canvas selection"
                    >
                      <IconCamera className="h-5 w-5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-6 w-6 text-muted-foreground hover:text-foreground transition-all duration-100"
                    title="Attach images"
                  >
                    <IconPhotoScan className="h-5 w-5" />
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      sendMessage({
                        text: input,
                        files: attachedImage ? [{
                          type: 'file',
                          url: attachedImage,
                          mediaType: 'image/png',
                        }] : undefined,
                      });
                      setInput('');
                      setAttachedImage(null);
                    }}
                    className={cn(
                      "h-6 w-6 rounded-full transition-all duration-100 cursor-pointer bg-primary",
                      input && "bg-primary hover:bg-primary/90!"
                    )}
                    disabled={!input}
                  >
                    <IconArrowUp className="h-4 w-4 text-primary-foreground" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[1199] flex flex-col items-end gap-3">
      {showMessages && (
        <div className="w-[360px] max-w-[calc(100vw-3rem)] max-h-[65vh] overflow-hidden rounded-2xl border border-white/8 bg-[#141419]/92 text-sm text-white shadow-2xl backdrop-blur-xl">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
              <h2 className="text-sm font-medium tracking-tight text-white/90">Conversation</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleMessages}
                className="h-7 w-7 text-white/70 transition-colors duration-150 hover:text-white"
                aria-label="Close chat"
              >
                <IconX className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {formattedMessages.length === 0 && status !== "streaming" && status !== "submitted" ? (
                <p className="text-xs text-slate-500">No messages yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {messages.map((message, idx) => {
                    const items = [];

                    const content = extractMessageText(message);
                    if (content) {
                      const role: "user" | "assistant" = message.role === "user" ? "user" : "assistant";
                      const fallbackAvatar = {
                        user: "https://avatar.vercel.sh/user",
                        assistant: "https://avatar.vercel.sh/assistant",
                      };
                      const fallbackName = {
                        user: "You",
                        assistant: "Canvas AI",
                      };

                      items.push(
                        <Message from={role} key={`msg-${message.id || idx}`}>
                          <MessageContent>{content}</MessageContent>
                          <MessageAvatar name={fallbackName[role]} src={fallbackAvatar[role]} />
                        </Message>
                      );
                    }

                    const toolCalls = extractToolCalls(message);
                    if (toolCalls.length > 0) {
                      items.push(
                        <div key={`tools-${message.id || idx}`} className="mb-2 flex flex-col gap-1.5 text-xs">
                          {toolCalls.map((call: any, callIdx: number) => {
                            const output = call.output || call.result;
                            if (!output?.message) return null;

                            return (
                              <div
                                key={`${message.id}-${callIdx}`}
                                className="rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2 font-mono text-[11px] text-slate-300"
                              >
                                {output.message}
                              </div>
                            );
                          })}
                        </div>
                      );
                    }

                    return items;
                  })}

                  {(status === "streaming" || status === "submitted") && (
                    <Message from="assistant" key="typing-indicator">
                      <MessageContent>
                        <div className="flex items-center gap-1.5 py-1 text-slate-400">
                          <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                          <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                          <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                          <span className="ml-2 text-xs">Processing...</span>
                        </div>
                      </MessageContent>
                      <MessageAvatar name="Canvas AI" src="https://avatar.vercel.sh/assistant" />
                    </Message>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
            <div className="border-t border-white/8 p-4">
              <div className="flex flex-col gap-3">
                <div className="flex min-h-[120px] flex-col cursor-text rounded-2xl border border-border bg-card shadow-lg">
                  {attachedImage && (
                    <div className="relative border-b border-border p-2">
                      <img
                        src={attachedImage}
                        alt="Canvas capture"
                        className="h-20 rounded border border-border bg-muted object-contain"
                      />
                      <button
                        onClick={() => setAttachedImage(null)}
                        className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white hover:bg-red-600"
                        aria-label="Remove attachment"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  <div className="relative flex-1 max-h-[258px] overflow-y-auto">
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage({
                            text: input,
                            files: attachedImage
                              ? [
                                {
                                  type: "file",
                                  url: attachedImage,
                                  mediaType: "image/png",
                                },
                              ]
                              : undefined,
                          });
                          setInput("");
                          setAttachedImage(null);
                        }
                      }}
                      placeholder="Ask anything"
                      className="w-full resize-none border-0 p-3 text-[16px] text-foreground outline-none transition-[padding] duration-200 ease-in-out focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent! whitespace-pre-wrap break-words"
                    />
                  </div>

                  <div className="flex min-h-[40px] items-center gap-2 p-2 pb-1">
                    <div className="flex items-center gap-1 rounded-full bg-muted p-1.5 text-xs">
                      <IconCloud className="h-4 w-4 text-muted-foreground" />
                    </div>

                    <div className="relative flex items-center">
                      <Select value={selectedModel.value} onValueChange={handleModelChange}>
                        <SelectTrigger className="w-fit border-none bg-transparent! p-0 text-sm text-muted-foreground shadow-none focus:ring-0 hover:text-foreground">
                          <SelectValue>
                            {selectedModel.max ? (
                              <div className="flex items-center gap-1">
                                <span>{selectedModel.name}</span>
                                {renderMaxBadge()}
                              </div>
                            ) : (
                              <span>{selectedModel.name}</span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {MODELS.map((model) => (
                            <SelectItem key={model.value} value={model.value}>
                              {model.max ? (
                                <div className="flex items-center gap-1">
                                  <span>{model.name}</span>
                                  {renderMaxBadge()}
                                </div>
                              ) : (
                                <span>{model.name}</span>
                              )}
                              <span className="block text-xs text-muted-foreground">{model.description}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="ml-auto flex items-center gap-3">
                      {onCapture && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={onCapture}
                          className="h-6 w-6 text-muted-foreground transition-all duration-100 hover:text-foreground"
                          title="Capture canvas selection"
                          aria-label="Capture canvas selection"
                        >
                          <IconCamera className="h-5 w-5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-6 w-6 text-muted-foreground transition-all duration-100 hover:text-foreground"
                        title="Attach images"
                        aria-label="Attach images"
                      >
                        <IconPhotoScan className="h-5 w-5" />
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          sendMessage({
                            text: input,
                            files: attachedImage
                              ? [
                                {
                                  type: "file",
                                  url: attachedImage,
                                  mediaType: "image/png",
                                },
                              ]
                              : undefined,
                          });
                          setInput("");
                          setAttachedImage(null);
                        }}
                        className={cn(
                          "h-6 w-6 cursor-pointer rounded-full bg-primary transition-all duration-100",
                          input && "bg-primary hover:bg-primary/90!"
                        )}
                        disabled={!input}
                        aria-label="Send message"
                      >
                        <IconArrowUp className="h-4 w-4 text-primary-foreground" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Button
        variant="default"
        size="icon"
        onClick={handleToggleMessages}
        aria-label={showMessages ? "Hide chat" : "Open chat"}
        className={cn(
          "h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg transition-transform duration-150 hover:bg-primary/90",
          showMessages ? "scale-95" : "scale-100"
        )}
      >
        <IconMessageCircle className="h-5 w-5" />
      </Button>
    </div>
  );
}
