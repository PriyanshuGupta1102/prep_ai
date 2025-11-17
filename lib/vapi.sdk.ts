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
}

/**
 * Create an interview workflow using Vapi's workflow-only approach
 * This replaces the deprecated assistant + workflow combination
 */
export function createInterviewWorkflow(config: WorkflowConfig) {
  const vapi = new Vapi(config.publicApiKey);
  const state: WorkflowState = {
    isConnected: false,
    messages: [],
  };

  // Event handlers
  const handlers = {
    onCallStart: (() => {}) as (callback: () => void) => void,
    onCallEnd: (() => {}) as (callback: () => void) => void,
    onMessage: (() => {}) as (callback: (message: any) => void) => void,
    onSpeechStart: (() => {}) as (callback: () => void) => void,
    onSpeechEnd: (() => {}) as (callback: () => void) => void,
    onError: (() => {}) as (callback: (error: Error) => void) => void,
  };

  // Internal callback storage
  let callStartCallback: (() => void) | null = null;
  let callEndCallback: (() => void) | null = null;
  let messageCallback: ((message: any) => void) | null = null;
  let speechStartCallback: (() => void) | null = null;
  let speechEndCallback: (() => void) | null = null;
  let errorCallback: ((error: Error) => void) | null = null;

  // Setup Vapi event listeners
  vapi.on("call-start", () => {
    state.isConnected = true;
    console.log("Interview workflow call started");
    callStartCallback?.();
  });

  vapi.on("call-end", () => {
    state.isConnected = false;
    console.log("Interview workflow call ended");
    callEndCallback?.();
  });

  vapi.on("message", (message: any) => {
    // Handle transcript messages
    if (message.type === "transcript" && message.transcriptType === "final") {
      const newMessage = { role: message.role, content: message.transcript };
      state.messages.push(newMessage);
      messageCallback?.(message);
    }
    // Handle workflow step messages
    else if (message.type === "workflow-step") {
      console.log("Workflow step:", message.step);
      messageCallback?.(message);
    }
    // Handle function calls within the workflow
    else if (message.type === "function-call") {
      console.log("Function called:", message.functionCall?.name);
      messageCallback?.(message);
    }
  });

  vapi.on("speech-start", () => {
    console.log("Speech started");
    speechStartCallback?.();
  });

  vapi.on("speech-end", () => {
    console.log("Speech ended");
    speechEndCallback?.();
  });

  vapi.on("error", (error: Error) => {
    console.error("Interview workflow error:", error);
    errorCallback?.(error);
  });

  // Public API
  return {
    start: (variableValues?: Record<string, any>) => {
      if (!state.isConnected) {
        console.log("Starting interview workflow with variables:", variableValues);
        return vapi.start(config.workflowId, {
          variableValues: variableValues || {},
        });
      }
    },

    stop: () => {
      if (state.isConnected) {
        vapi.stop();
      }
    },

    isConnected: () => state.isConnected,

    getMessages: () => state.messages,

    clearMessages: () => {
      state.messages = [];
    },

    // Register callbacks
    onCallStart: (callback: () => void) => {
      callStartCallback = callback;
    },

    onCallEnd: (callback: () => void) => {
      callEndCallback = callback;
    },

    onMessage: (callback: (message: any) => void) => {
      messageCallback = callback;
    },

    onSpeechStart: (callback: () => void) => {
      speechStartCallback = callback;
    },

    onSpeechEnd: (callback: () => void) => {
      speechEndCallback = callback;
    },

    onError: (callback: (error: Error) => void) => {
      errorCallback = callback;
    },

    // Cleanup
    destroy: () => {
      vapi.stop();
    },
  };
}

/**
 * Initialize and export a default instance for use in components
 * Uses hardcoded public API key and workflow ID
 */
export const createVapiWorkflow = (publicApiKey?: string, workflowId?: string) => {
  return createInterviewWorkflow({
    publicApiKey: publicApiKey || VAPI_PUBLIC_KEY,
    workflowId: workflowId || VAPI_WORKFLOW_ID,
  });
};

/**
 * Default workflow instance with hardcoded credentials
 */
export const defaultWorkflow = createVapiWorkflow();
