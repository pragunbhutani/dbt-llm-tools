"use client";

import { useRef, useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User, Search, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TOOL_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  searchModels: { label: "Searching knowledge base", icon: Search },
  fetchModelDetails: { label: "Fetching model details", icon: FileText },
};

const SUGGESTIONS = [
  "What are our top 10 customers by revenue?",
  "How many orders did we get last month?",
  "Show me daily active users for the past 30 days",
];

function getMessageText(message: UIMessage): string {
  return (message.parts ?? [])
    .filter((p) => p.type === "text")
    .map((p) => (p as { type: "text"; text: string }).text)
    .join("");
}

function MarkdownContent({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
        h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-semibold mt-4 mb-2 first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-semibold mt-3 mb-1 first:mt-0">{children}</h3>,
        h4: ({ children }) => <h4 className="text-sm font-semibold mt-3 mb-1 first:mt-0">{children}</h4>,
        ul: ({ children }) => <ul className="list-disc list-outside pl-5 mb-3 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-outside pl-5 mb-3 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        a: ({ href, children }) => (
          <a href={href} className="text-primary underline underline-offset-2 hover:opacity-80" target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-border pl-4 my-3 text-muted-foreground italic">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="my-4 border-border" />,
        code: ({ className, children, ...props }) => {
          const isBlock = className?.includes("language-");
          if (isBlock) {
            return (
              <code className={cn("block text-xs font-mono", className)} {...props}>
                {children}
              </code>
            );
          }
          return (
            <code className="bg-muted-foreground/15 text-foreground rounded px-1 py-0.5 text-xs font-mono" {...props}>
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="bg-zinc-950 text-zinc-100 rounded-lg p-4 overflow-x-auto text-xs font-mono my-3 leading-relaxed">
            {children}
          </pre>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-3">
            <table className="min-w-full text-sm border-collapse">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-border bg-muted px-3 py-2 text-left font-semibold text-xs">{children}</th>
        ),
        td: ({ children }) => (
          <td className="border border-border px-3 py-2 text-xs">{children}</td>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

export function ChatInterface() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendMessage({ text });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const lastMsg = messages[messages.length - 1];
  const showTypingIndicator =
    isLoading &&
    (!lastMsg || lastMsg.role === "user" || !getMessageText(lastMsg));

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
              <Bot className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="font-medium">Ask about your data</p>
                <p className="text-sm text-muted-foreground">
                  Ask questions in plain English. Ragstar will find the relevant dbt
                  models and write SQL for you.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    className="text-xs border rounded-full px-3 py-1.5 hover:bg-muted transition-colors"
                    onClick={() => {
                      setInput(s);
                      textareaRef.current?.focus();
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => {
            const text = getMessageText(message);
            const toolParts = (message.parts ?? []).filter(isToolUIPart);

            return (
              <div key={message.id} className="space-y-2">
                {/* Tool call indicators */}
                {toolParts.map((part, i) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const toolName = (part as any).toolName as string | undefined;
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const state = (part as any).state as string | undefined;
                  const toolInfo = toolName ? TOOL_LABELS[toolName] : null;
                  if (!toolInfo) return null;

                  const Icon = toolInfo.icon;
                  const isDone = state === "output-available";
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const inputQuery = (part as any).input?.query as string | undefined;

                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs text-muted-foreground ml-10"
                    >
                      {isDone ? (
                        <Icon className="h-3.5 w-3.5" />
                      ) : (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      )}
                      <span>
                        {toolInfo.label}
                        {toolName === "searchModels" && inputQuery && (
                          <span className="ml-1 text-foreground/50">
                            &ldquo;{inputQuery}&rdquo;
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}

                {/* Message bubble */}
                {text && (
                  <div
                    className={cn(
                      "flex gap-3",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}

                    <div
                      className={cn(
                        "max-w-[80%] rounded-xl px-4 py-3 text-sm",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {message.role === "assistant" ? (
                        <MarkdownContent text={text} />
                      ) : (
                        <p className="whitespace-pre-wrap">{text}</p>
                      )}
                    </div>

                    {message.role === "user" && (
                      <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {showTypingIndicator && (
            <div className="flex gap-3 justify-start">
              <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="bg-muted rounded-xl px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive text-center">
              Something went wrong. Please try again.
            </p>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t px-4 pt-3 pb-2">
        <div className="flex gap-2 items-center">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your data... (Enter to send, Shift+Enter for newline)"
            className="resize-none min-h-[60px] max-h-[160px]"
            rows={2}
            disabled={isLoading}
          />
          <Button
            type="button"
            size="icon"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="shrink-0 h-10 w-10"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
