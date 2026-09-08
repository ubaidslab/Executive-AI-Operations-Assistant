"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AgentStep {
  type: "tool_call" | "tool_result" | "final";
  tool?: string;
  args?: Record<string, unknown>;
  result?: unknown;
  text?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  steps?: AgentStep[];
}

interface ScheduleEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location: string | null;
}

interface Task {
  id: string;
  title: string;
  dueDate: string | null;
  assignee: string | null;
  status: string;
}

const SUGGESTIONS = [
  "What's on my plate today?",
  "What tasks are overdue?",
  "Add a task: prep slides for the investor call, due Friday",
  "Draft a reply declining tomorrow's 9am and proposing next week instead",
];

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi, I'm **Atlas**. I can check your schedule, manage tasks, draft email replies, and summarize documents — ask me something, or try a suggestion below.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleEvent[] | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadSidebar = async () => {
    const [scheduleRes, tasksRes] = await Promise.all([fetch("/api/schedule"), fetch("/api/tasks")]);
    const scheduleData = await scheduleRes.json();
    const tasksData = await tasksRes.json();
    setSchedule(scheduleData.events ?? []);
    setTasks(tasksData.tasks ?? []);
  };

  useEffect(() => {
    loadSidebar();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    const history = [...messages, { id: newId(), role: "user" as const, content: trimmed }];
    setMessages(history);
    setInput("");

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(history.map(({ role, content }) => ({ role, content }))),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Something went wrong.");

      setMessages((prev) => [...prev, { id: newId(), role: "assistant", content: data.reply, steps: data.steps }]);
      loadSidebar();
    } catch (error) {
      const message = error instanceof Error ? error.message : "I ran into an unexpected error.";
      setMessages((prev) => [...prev, { id: newId(), role: "assistant", content: message }]);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const toolSteps = (steps?: AgentStep[]) => (steps ?? []).filter((s) => s.type === "tool_call");

  return (
    <div className="flex min-h-screen">
      <div className="flex flex-1 flex-col">
        <header className="border-b border-border bg-white px-6 py-3">
          <h1 className="text-sm font-semibold">Atlas — Executive Operations Assistant</h1>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] ${m.role === "user" ? "text-right" : "text-left"}`}>
                <div
                  className={`inline-block rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-white border border-border"
                  }`}
                >
                  <div className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>
                </div>
                {toolSteps(m.steps).length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {toolSteps(m.steps).map((step, idx) => (
                      <Badge key={idx} variant="muted" className="gap-1">
                        <Wrench className="h-3 w-3" />
                        {step.tool}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && <p className="text-xs text-muted-foreground">Atlas is working…</p>}
        </div>

        <div className="border-t border-border bg-white px-6 py-4">
          {messages.length <= 1 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={onSubmit} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              placeholder="Ask Atlas anything about your day…"
              className="h-10 flex-1 rounded-lg border border-border bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
            />
            <Button type="submit" disabled={isLoading || !input.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      <aside className="hidden w-72 shrink-0 space-y-4 border-l border-border bg-muted/30 p-4 lg:block">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {schedule === null && <p className="text-xs text-muted-foreground">Loading…</p>}
            {schedule !== null && schedule.length === 0 && (
              <p className="text-xs text-muted-foreground">Nothing on the calendar today.</p>
            )}
            {schedule?.map((event) => (
              <div key={event.id} className="text-xs">
                <p className="font-medium">{event.title}</p>
                <p className="text-muted-foreground">
                  {formatTime(event.start)}–{formatTime(event.end)}
                  {event.location ? ` · ${event.location}` : ""}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tasks === null && <p className="text-xs text-muted-foreground">Loading…</p>}
            {tasks !== null && tasks.length === 0 && <p className="text-xs text-muted-foreground">All caught up.</p>}
            {tasks?.map((task) => (
              <div key={task.id} className="text-xs">
                <p className="font-medium">{task.title}</p>
                <p className="text-muted-foreground">
                  {task.dueDate ? `Due ${task.dueDate}` : "No due date"}
                  {task.assignee ? ` · ${task.assignee}` : ""}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
