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
import { useChat } from "@ai-sdk/react";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ai-elements/message";
import {
  IconArrowUp,
  IconCloud,
  IconPhotoScan,
  IconCamera
} from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

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
}

export default function Ai02({ onCapture, showMessages: showMessagesProp, onToggleMessages, isFullscreen, onToggleFullscreen }: ChatbotProps) {
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [input, setInput] = useState("");
  const [showMessages, setShowMessages] = useState(showMessagesProp ?? true);
  
  // Sync internal state with prop
  useEffect(() => {
    if (showMessagesProp !== undefined) {
      setShowMessages(showMessagesProp);
    }
  }, [showMessagesProp]);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [lastSandboxUrl, setLastSandboxUrl] = useState<string | null>(null);
  const { messages, sendMessage, status, error } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  console.log("messages", messages);

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

  console.log("status", status);
  console.log("error", error);

  type RenderMessage = {
    key: string;
    from: "user" | "assistant";
    content: string;
    avatar: string;
    name: string;
  };

  const extractMessageText = (message: any): string => {
    if (Array.isArray(message?.parts)) {
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
                        <div className="flex items-center gap-1.5 py-1 text-slate-400">
                          <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                          <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                          <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
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
    <>
        {showMessages && (
        <div className="fixed right-4 top-[128px] z-[1199] w-80 max-h-[60vh] overflow-y-auto rounded-[14px] border border-white/8 bg-[#141419]/92 p-4 text-sm text-white shadow-2xl backdrop-blur-xl">
          <h2 className="mb-3 text-sm font-medium tracking-tight text-white/90">
            Conversation
          </h2>

          {formattedMessages.length === 0 && status !== "streaming" && status !== "submitted" ? (
            <p className="text-xs text-slate-500">No messages yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((message, idx) => {
                const items = [];
                
                // Add the main message content if it exists
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
                
                // Add tool calls for this message
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
                    <div className="flex items-center gap-1.5 py-1 text-slate-400">
                      <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
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
      )}

      <div className="flex flex-col gap-4 w-[calc(42rem-5rem)]">
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
    </>
  );
}
