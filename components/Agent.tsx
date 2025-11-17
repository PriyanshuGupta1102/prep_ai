"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { createVapiWorkflow } from "@/lib/vapi.sdk";
import { createFeedback } from "@/lib/actions/general.action";

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

const Agent = ({
  userName,
  userId,
  interviewId,
  feedbackId,
  type,
  questions,
}: AgentProps) => {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>("");
  const workflowRef = useRef<any>(null);

  // Initialize Vapi workflow on mount
  useEffect(() => {
    // Create workflow instance using hardcoded credentials from SDK
    // No need to pass API key or workflow ID as they're built into the SDK
    workflowRef.current = createVapiWorkflow();

    // Setup event listeners
    workflowRef.current.onCallStart(() => {
      setCallStatus(CallStatus.ACTIVE);
      console.log("Interview call started");
    });

    workflowRef.current.onCallEnd(() => {
      setCallStatus(CallStatus.FINISHED);
      console.log("Interview call ended");
    });

    workflowRef.current.onMessage((message: any) => {
      if (message.type === "transcript" && message.transcriptType === "final") {
        const newMessage = { role: message.role, content: message.transcript };
        setMessages((prev) => [...prev, newMessage]);
      } else if (message.type === "workflow-step") {
        console.log("Workflow step:", message.step);
      } else if (message.type === "function-call") {
        console.log("Function called:", message.functionCall?.name);
      }
    });

    workflowRef.current.onSpeechStart(() => {
      setIsSpeaking(true);
    });

    workflowRef.current.onSpeechEnd(() => {
      setIsSpeaking(false);
    });

    workflowRef.current.onError((error: Error) => {
      console.error("Workflow error:", error);
    });

    // Cleanup on unmount
    return () => {
      if (workflowRef.current) {
        workflowRef.current.destroy();
      }
    };
  }, [type]);

  // Handle feedback generation and navigation
  useEffect(() => {
    if (messages.length > 0) {
      setLastMessage(messages[messages.length - 1].content);
    }

    const handleGenerateFeedback = async (messages: SavedMessage[]) => {
      console.log("Generating feedback from transcript");

      const { success, feedbackId: id } = await createFeedback({
        interviewId: interviewId!,
        userId: userId!,
        transcript: messages,
        feedbackId,
      });

      if (success && id) {
        router.push(`/interview/${interviewId}/feedback`);
      } else {
        console.log("Error saving feedback");
        router.push("/");
      }
    };

    if (callStatus === CallStatus.FINISHED) {
      if (type === "generate") {
        router.push("/");
      } else {
        handleGenerateFeedback(messages);
      }
    }
  }, [messages, callStatus, feedbackId, interviewId, router, type, userId]);

  const handleCall = async () => {
    if (!workflowRef.current) {
      console.error("Workflow not initialized");
      return;
    }

    setCallStatus(CallStatus.CONNECTING);

    try {
      const variableValues: Record<string, any> = {
        username: userName,
        userid: userId,
      };

      // Add questions if this is an interview-type call
      if (type !== "generate" && questions) {
        const formattedQuestions = questions
          .map((question) => `- ${question}`)
          .join("\n");
        variableValues.questions = formattedQuestions;
      }

      workflowRef.current.start(variableValues);
    } catch (error) {
      console.error("Error starting workflow:", error);
      setCallStatus(CallStatus.INACTIVE);
    }
  };

  const handleDisconnect = () => {
    if (workflowRef.current) {
      workflowRef.current.stop();
    }
    setCallStatus(CallStatus.FINISHED);
  };

  return (
    <>
      <div className="call-view">
        {/* AI Interviewer Card */}
        <div className="card-interviewer">
          <div className="avatar">
            <Image
              src="/ai-avatar.png"
              alt="profile-image"
              width={65}
              height={54}
              className="object-cover"
            />
            {isSpeaking && <span className="animate-speak" />}
          </div>
          <h3>AI Interviewer</h3>
        </div>

        {/* User Profile Card */}
        <div className="card-border">
          <div className="card-content">
            <Image
              src="/user-avatar.png"
              alt="profile-image"
              width={539}
              height={539}
              className="rounded-full object-cover size-[120px]"
            />
            <h3>{userName}</h3>
          </div>
        </div>
      </div>

      {messages.length > 0 && (
        <div className="transcript-border">
          <div className="transcript">
            <p
              key={lastMessage}
              className={cn(
                "transition-opacity duration-500 opacity-0",
                "animate-fadeIn opacity-100"
              )}
            >
              {lastMessage}
            </p>
          </div>
        </div>
      )}

      <div className="w-full flex justify-center">
        {callStatus !== "ACTIVE" ? (
          <button className="relative btn-call" onClick={() => handleCall()}>
            <span
              className={cn(
                "absolute animate-ping rounded-full opacity-75",
                callStatus !== "CONNECTING" && "hidden"
              )}
            />

            <span className="relative">
              {callStatus === "INACTIVE" || callStatus === "FINISHED"
                ? "Call"
                : ". . ."}
            </span>
          </button>
        ) : (
          <button className="btn-disconnect" onClick={() => handleDisconnect()}>
            End
          </button>
        )}
      </div>
    </>
  );
};

export default Agent;
