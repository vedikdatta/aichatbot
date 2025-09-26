"use client";

import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SendHorizonal, Mic, MicOff, File } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

interface Message {
  id: string;
  role: "user" | "ai" | "system";
  content: string;
  typing?: boolean;
}

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

const ChatBotUI: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [micOn, setMicOn] = useState<boolean>(false);
  const [pdfContent, setPdfContent] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const GEMINI_API_KEY = "AIzaSyACYQSMx4BR0RO-zSP9mCmUOpqba6ow0-c";

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
    };
    document.body.appendChild(script);
  }, []);

  const toggleMic = () => setMicOn((prev) => !prev);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: uuidv4(),
      role: "user",
      content: input,
    };

    const typingMessage: Message = {
      id: uuidv4(),
      role: "ai",
      content: "",
      typing: true,
    };

    const updatedMessages = [...messages, userMessage, typingMessage];
    setMessages(updatedMessages);
    setInput("");

    const fullUserMessage = pdfContent
      ? `${input}\n\n---\n[Attached PDF Content]\n${pdfContent}`
      : input;

    const contents = [
      ...updatedMessages
        .filter((msg) => !msg.typing)
        .map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        })),
      {
        role: "user",
        parts: [{ text: fullUserMessage }],
      },
    ];

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents,
            generationConfig: {},
          }),
        }
      );

      const data = await response.json();
      const aiText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
        "Sorry, I couldn't understand that.";

      setMessages((prev) =>
        prev.map((msg) =>
          msg.typing ? { ...msg, typing: false, content: aiText } : msg
        )
      );
    } catch (error) {
      console.error("API Error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.typing
            ? {
                ...msg,
                typing: false,
                content: "Failed to fetch response. Please try again.",
              }
            : msg
        )
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") sendMessage();
  };

  const handlePdfUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") return;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const pageTexts = await Promise.all(
      Array.from({ length: pdf.numPages }, async (_, i) => {
        const page = await pdf.getPage(i + 1);
        const content = await page.getTextContent();
        return content.items.map((item: any) => item.str).join(" ");
      })
    );

    const fullText = pageTexts.join("\n");
    setPdfContent(fullText);

    setMessages((prev) => [
      ...prev,
      {
        id: uuidv4(),
        role: "system",
        content: `✅ 1 PDF uploaded successfully: "${file.name}"`,
      },
    ]);
  };

  useEffect(() => {
    if (containerRef.current) {
      gsap.from(containerRef.current, {
        y: 50,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
      });
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

    const msgEl = document.querySelector(".message:last-child");
    if (msgEl) {
      gsap.fromTo(
        msgEl,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
      );
    }
  }, [messages]);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black text-white flex items-center justify-center p-4">
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-black animate-pulse opacity-60 blur-2xl" />

      <div
        ref={containerRef}
        className="z-10 w-full max-w-md mx-auto flex flex-col h-full"
      >
        <h1 className="text-3xl font-extrabold text-center mb-1 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
          Techxy Talks
        </h1>
        <h2 className="text-lg font-semibold text-center mb-4 text-zinc-300">
          Chat with Gemini AI
        </h2>

        <Card className="flex flex-col flex-1 overflow-hidden bg-zinc-900/80 border border-zinc-700 shadow-lg backdrop-blur-md">
          <CardContent className="p-0 flex-1 overflow-y-auto">
            <ScrollArea className="h-full px-4 py-2 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message max-w-[80%] px-4 py-2 rounded-xl text-sm whitespace-pre-wrap shadow-md transition-all duration-300 ${
                    msg.role === "user"
                      ? "ml-auto bg-blue-600 text-white"
                      : msg.role === "ai"
                      ? "mr-auto bg-zinc-700 text-zinc-200"
                      : "mx-auto bg-green-800 text-white"
                  }`}
                >
                  {msg.typing ? (
                    <span className="animate-pulse text-zinc-400">
                      Typing...
                    </span>
                  ) : (
                    msg.content
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </ScrollArea>
          </CardContent>

          <div className="p-4 border-t border-zinc-700 flex gap-2 items-center bg-zinc-800/60">
            <Input
              placeholder="Type your message..."
              className="flex-1 bg-zinc-700/60 text-white placeholder-zinc-400 border border-zinc-600"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button
              onClick={sendMessage}
              size="icon"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <SendHorizonal size={18} />
            </Button>
            <Button asChild variant="outline" size="icon">
              <label>
                <File className="text-zinc-400 cursor-pointer" />
                <input
                  type="file"
                  accept="application/pdf"
                  hidden
                  onChange={handlePdfUpload}
                />
              </label>
            </Button>
            <Button onClick={toggleMic} variant="outline" size="icon">
              {micOn ? (
                <Mic className="text-red-500" />
              ) : (
                <MicOff className="text-zinc-400" />
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ChatBotUI