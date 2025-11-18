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
    // Create a new workflow instance for this component
    // Hardcoded credentials are included in createVapiWorkflow()
    workflowRef.current = createVapiWorkflow();

    if (!workflowRef.current) {
      console.error("[Agent] Failed to create workflow");
      return;
    }

    // Setup call start handler
    workflowRef.current.onCallStart(() => {
      setCallStatus(CallStatus.ACTIVE);
      console.log("[Agent] Interview call started - listening mode active");
    });

    // Setup call end handler - triggers feedback generation
    workflowRef.current.onCallEnd(() => {
      setCallStatus(CallStatus.FINISHED);
      console.log("[Agent] Interview call ended");
      // Get final transcript from workflow
      const transcript = workflowRef.current?.getTranscript?.();
      if (transcript && transcript.length > 0) {
        console.log("[Agent] Transcript collected:", transcript);
      }
    });

    // Setup message handler for transcripts and workflow events
    workflowRef.current.onMessage((message: any) => {
      if (message.type === "transcript" && message.transcriptType === "final") {
        const newMessage = {
          role: message.role || "user",
          content: message.transcript,
        };
        setMessages((prev) => [...prev, newMessage]);
        console.log(`[Agent] Message [${message.role}]:`, message.transcript);
      } else if (message.type === "workflow-step") {
        console.log("[Agent] Workflow step transition:", message.step?.name);
      } else if (message.type === "function-call") {
        console.log("[Agent] Function call in workflow:", message.functionCall?.name);
      }
    });

    // Setup workflow step handler
    workflowRef.current.onWorkflowStep?.((step: any) => {
      console.log("[Agent] Workflow node entered:", step?.name || "unknown");
    });

    // Setup function call handler
    workflowRef.current.onFunctionCall?.((functionCall: any) => {
      console.log("[Agent] Workflow function executed:", functionCall?.name);
    });

    // Setup speech detection
    workflowRef.current.onSpeechStart(() => {
      setIsSpeaking(true);
      console.log("[Agent] User is speaking");
    });

    workflowRef.current.onSpeechEnd(() => {
      setIsSpeaking(false);
      console.log("[Agent] User stopped speaking");
    });

    // Setup error handler
    workflowRef.current.onError((error: Error) => {
      const errorMessage = error?.message || String(error) || "Unknown workflow error";
      console.error("[Agent] Workflow error occurred:", errorMessage);
      setCallStatus(CallStatus.INACTIVE);
      
      // Show user-friendly error message
      if (errorMessage.includes("API Key") || errorMessage.includes("401")) {
        console.error("[Agent] Authentication error - Check Vapi API credentials");
      } else if (errorMessage.includes("Workflow ID") || errorMessage.includes("404")) {
        console.error("[Agent] Workflow not found - Check VAPI_WORKFLOW_ID configuration");
      } else if (errorMessage.includes("microphone") || errorMessage.includes("permission")) {
        console.error("[Agent] Microphone permission denied - Please enable microphone access");
      } else {
        console.error("[Agent] Workflow failed - Check browser console for details");
      }
    });

    // Cleanup on component unmount
    return () => {
      if (workflowRef.current) {
        console.log("[Agent] Cleaning up workflow on unmount");
        workflowRef.current.destroy?.();
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
      console.error("[Agent] Workflow not initialized");
      alert("Error: Workflow not initialized. Please refresh the page.");
      return;
    }

    if (workflowRef.current.isConnected?.()) {
      console.warn("[Agent] Workflow already connected");
      return;
    }

    setCallStatus(CallStatus.CONNECTING);

    try {
      // Build variable values to pass to workflow nodes
      // These are used in workflow nodes via liquid template syntax: {{ variable_name }}
      const variableValues: Record<string, any> = {
        username: userName || "Candidate",
        userid: userId || "unknown",
      };

      // Add interview questions if this is an interview-type call
      if (type !== "generate" && questions && questions.length > 0) {
        // Format questions for the workflow
        const formattedQuestions = questions
          .map((question, index) => `${index + 1}. ${question}`)
          .join("\n");
        variableValues.questions = formattedQuestions;
        console.log("[Agent] Interview questions passed to workflow:", variableValues.questions);
      }

      console.log("[Agent] Starting workflow with variables:", variableValues);

      // Start the workflow with the prepared variables
      workflowRef.current.start(variableValues);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[Agent] Error starting workflow:", errorMessage);
      console.error("[Agent] Full error details:", error);
      setCallStatus(CallStatus.INACTIVE);
      
      // Show user-friendly error message
      if (errorMessage.includes("API Key")) {
        alert("Configuration Error: Invalid Vapi API Key. Contact support.");
      } else if (errorMessage.includes("Workflow ID")) {
        alert("Configuration Error: Invalid Vapi Workflow ID. Contact support.");
      } else if (errorMessage.includes("microphone")) {
        alert("Permission Error: Please enable microphone access to use this feature.");
      } else {
        alert(`Error: Failed to start interview. ${errorMessage}`);
      }
    }
  };

  const handleDisconnect = () => {
    if (workflowRef.current && workflowRef.current.isConnected?.()) {
      console.log("[Agent] Disconnecting from workflow");
      workflowRef.current.stop();
      setCallStatus(CallStatus.FINISHED);
    }
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
