"use client";

import Chat from "./chat";


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

export default function ChatSystem({ onCapture, showMessages: showMessagesProp, onToggleMessages, isFullscreen, onToggleFullscreen, projectId }: ChatbotProps) {


    if (isFullscreen) {
        return (
            <div className="fixed right-0 top-0 bottom-0 z-[1199] w-[20vw] border-l border-white/8 bg-[#141419]/95 text-sm text-white shadow-2xl backdrop-blur-xl flex flex-col justify-end">
                <div className="relative overflow-y-auto max-h-[258px] p-2">
                    <Chat isFullscreen={isFullscreen} />
                </div>
            </div>
        );
    }

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1199] flex flex-col items-center gap-3">
            <Chat isFullscreen={null} />
        </div>
    );
}
