import Vapi from "@vapi-ai/web";

// Vapi Configuration - Public API Key and Workflow ID
const VAPI_PUBLIC_KEY = "f563cad6-1b2c-4d05-b7a6-15537778a4ac";
const VAPI_WORKFLOW_ID = "2757e744-d97e-4d90-b429-ce4232fa5ef3";

interface WorkflowConfig {
  publicApiKey: string;
  workflowId: string;
}

interface WorkflowState {
  isConnected: boolean;
  messages: Array<{ role: string; content: string }>;
  transcript: Array<any>;
}

/**
 * Create an interview workflow using Vapi's workflow-only approach
 * This replaces the deprecated assistant + workflow combination
 * 
 * Key Points from Vapi Workflow Documentation:
 * - Workflows are visual conversation flows with branching logic and variable extraction
 * - Use variableValues to pass data into workflow nodes
 * - Workflow steps are deterministic conversation paths
 * - Events: call-start, call-end, message, speech-start, speech-end, error
 * - Message types: transcript, workflow-step, function-call
 */
export function createInterviewWorkflow(config: WorkflowConfig) {
  const vapi = new Vapi(config.publicApiKey);
  const state: WorkflowState = {
    isConnected: false,
    messages: [],
    transcript: [],
  };

  // Internal callback storage
  let callStartCallback: (() => void) | null = null;
  let callEndCallback: (() => void) | null = null;
  let messageCallback: ((message: any) => void) | null = null;
  let speechStartCallback: (() => void) | null = null;
  let speechEndCallback: (() => void) | null = null;
  let errorCallback: ((error: Error) => void) | null = null;
  let workflowStepCallback: ((step: any) => void) | null = null;
  let functionCallCallback: ((functionCall: any) => void) | null = null;

  // Setup Vapi event listeners following documentation patterns
  vapi.on("call-start", () => {
    state.isConnected = true;
    console.log("[Vapi] Interview workflow call started");
    callStartCallback?.();
  });

  vapi.on("call-end", () => {
    state.isConnected = false;
    console.log("[Vapi] Interview workflow call ended");
    console.log("[Vapi] Final transcript:", state.transcript);
    callEndCallback?.();
  });

  vapi.on("message", (message: any) => {
    // Handle transcript messages (final transcripts only)
    if (message.type === "transcript") {
      if (message.transcriptType === "final") {
        const transcriptMessage = {
          role: message.role || "user",
          content: message.transcript,
          timestamp: new Date().toISOString(),
        };
        state.transcript.push(transcriptMessage);
        state.messages.push(transcriptMessage);
        console.log(`[Vapi] Transcript [${message.role}]:`, message.transcript);
        messageCallback?.(message);
      }
    }
    // Handle workflow step messages - indicates progression through workflow nodes
    else if (message.type === "workflow-step") {
      console.log("[Vapi] Workflow step:", message.step?.name || "unknown");
      workflowStepCallback?.(message.step);
      messageCallback?.(message);
    }
    // Handle function calls within the workflow
    else if (message.type === "function-call") {
      console.log("[Vapi] Function call:", message.functionCall?.name);
      functionCallCallback?.(message.functionCall);
      messageCallback?.(message);
    }
  });

  vapi.on("speech-start", () => {
    console.log("[Vapi] Speech started (user speaking)");
    speechStartCallback?.();
  });

  vapi.on("speech-end", () => {
    console.log("[Vapi] Speech ended");
    speechEndCallback?.();
  });

  vapi.on("error", (error: Error) => {
    console.error("[Vapi] Workflow error:", error);
    state.isConnected = false;
    errorCallback?.(error);
  });

  // Public API following Vapi Web SDK patterns
  return {
    /**
     * Start the workflow with optional variable values
     * Variables are used in workflow nodes via liquid template syntax: {{ variable_name }}
     */
    start: (variableValues?: Record<string, any>) => {
      if (state.isConnected) {
        console.warn("[Vapi] Workflow already connected");
        return;
      }

      try {
        console.log("[Vapi] Starting interview workflow with variables:", variableValues);
        // Pass variables to workflow nodes
        vapi.start(config.workflowId, {
          variableValues: variableValues || {},
        });
      } catch (error) {
        console.error("[Vapi] Error starting workflow:", error);
        throw error;
      }
    },

    /**
     * Stop the active workflow call
     */
    stop: () => {
      if (state.isConnected) {
        console.log("[Vapi] Stopping workflow");
        vapi.stop();
        state.isConnected = false;
      }
    },

    /**
     * Check if workflow is currently connected
     */
    isConnected: () => state.isConnected,

    /**
     * Get all collected messages from the workflow
     */
    getMessages: () => state.messages,

    /**
     * Get the complete transcript from the workflow
     */
    getTranscript: () => state.transcript,

    /**
     * Clear messages (useful for restarting)
     */
    clearMessages: () => {
      state.messages = [];
      state.transcript = [];
    },

    // Register callbacks for different events
    /**
     * Called when the workflow call starts
     */
    onCallStart: (callback: () => void) => {
      callStartCallback = callback;
    },

    /**
     * Called when the workflow call ends
     */
    onCallEnd: (callback: () => void) => {
      callEndCallback = callback;
    },

    /**
     * Called for all message events (transcripts, workflow steps, function calls)
     */
    onMessage: (callback: (message: any) => void) => {
      messageCallback = callback;
    },

    /**
     * Called when workflow progresses to a new step/node
     */
    onWorkflowStep: (callback: (step: any) => void) => {
      workflowStepCallback = callback;
    },

    /**
     * Called when a function is invoked within the workflow
     */
    onFunctionCall: (callback: (functionCall: any) => void) => {
      functionCallCallback = callback;
    },

    /**
     * Called when user starts speaking
     */
    onSpeechStart: (callback: () => void) => {
      speechStartCallback = callback;
    },

    /**
     * Called when user stops speaking
     */
    onSpeechEnd: (callback: () => void) => {
      speechEndCallback = callback;
    },

    /**
     * Called when an error occurs
     */
    onError: (callback: (error: Error) => void) => {
      errorCallback = callback;
    },

    /**
     * Cleanup and destroy the workflow instance
     */
    destroy: () => {
      if (state.isConnected) {
        vapi.stop();
      }
      state.messages = [];
      state.transcript = [];
    },
  };
}

/**
 * Factory function to create a new workflow instance
 * Uses hardcoded public API key and workflow ID from environment/constants
 * 
 * Usage:
 *   const workflow = createVapiWorkflow();
 *   workflow.start({ username: "John", userid: "123" });
 */
export const createVapiWorkflow = (publicApiKey?: string, workflowId?: string) => {
  return createInterviewWorkflow({
    publicApiKey: publicApiKey || VAPI_PUBLIC_KEY,
    workflowId: workflowId || VAPI_WORKFLOW_ID,
  });
};

/**
 * Default workflow instance - can be reused across components
 * WARNING: Using a shared instance can cause issues with state management
 * RECOMMENDED: Create new instances per component using createVapiWorkflow()
 */
export const defaultWorkflow = createVapiWorkflow();

