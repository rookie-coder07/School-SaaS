import axios from "axios";

const REQUIRED_ENV = [
  "EXOTEL_SID",
  "EXOTEL_API_KEY",
  "EXOTEL_API_TOKEN",
  "EXOTEL_CALLER_ID",
  "BASE_URL",
];
const EXOTEL_BASE_URL = "https://api.exotel.com";
const EXOTEL_TIMEOUT_MS = 15000;
const EXOTEL_MOCK_MODE = String(process.env.EXOTEL_MOCK_MODE || "false").trim().toLowerCase() === "true";

export class CallProviderError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "CallProviderError";
    this.status = options.status ?? 500;
    this.provider = options.provider ?? "exotel";
    this.providerCode = options.providerCode ?? null;
    this.providerMessage = options.providerMessage ?? null;
    this.details = options.details ?? null;
  }
}

function getConfig() {
  const missing = REQUIRED_ENV.filter((key) => !String(process.env[key] || "").trim());
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  const baseUrl = String(process.env.BASE_URL).trim().replace(/\/+$/, "");
  let host = "";
  try {
    host = new URL(baseUrl).hostname.toLowerCase();
  } catch {
    host = "";
  }
  const localBaseUrl = host === "localhost" || host === "127.0.0.1" || host === "::1";
  const effectiveMockMode = EXOTEL_MOCK_MODE || localBaseUrl;
  if (localBaseUrl && !EXOTEL_MOCK_MODE) {
    console.warn("EXOTEL mock mode auto-enabled because BASE_URL is local.");
  }
  return {
    sid: String(process.env.EXOTEL_SID).trim(),
    apiKey: String(process.env.EXOTEL_API_KEY).trim(),
    apiToken: String(process.env.EXOTEL_API_TOKEN).trim(),
    callerId: String(process.env.EXOTEL_CALLER_ID).trim(),
    baseUrl,
    mockMode: effectiveMockMode,
  };
}

function buildVoiceUrl(baseUrl, { mockMode = false } = {}) {
  const voiceUrl = `${baseUrl}/exotel-voice.xml`;
  let parsed;
  try {
    parsed = new URL(voiceUrl);
  } catch (error) {
    throw new Error("BASE_URL is invalid. Unable to build Exotel voice URL");
  }
  const host = parsed.hostname.toLowerCase();
  if (!mockMode && parsed.protocol !== "https:") {
    throw new Error("BASE_URL must use https:// for Exotel callbacks");
  }
  if (!mockMode && (host === "localhost" || host === "127.0.0.1" || host === "::1")) {
    throw new Error("BASE_URL must be publicly accessible. localhost URLs are not allowed");
  }
  return voiceUrl;
}

function formatPhone(parentPhone) {
  if (typeof parentPhone !== "string") {
    throw new Error("parentPhone must be a string");
  }
  const trimmed = parentPhone.trim();
  if (!trimmed) {
    throw new Error("Parent phone number is required");
  }
  const normalized = trimmed.startsWith("+") ? trimmed.slice(1) : trimmed;
  if (!/^\d+$/.test(normalized)) {
    throw new Error("parentPhone must contain digits only");
  }
  if (normalized.length < 10 || normalized.length > 15) {
    throw new Error("parentPhone must be 10 to 15 digits");
  }
  return normalized;
}

function extractProviderCode(details = {}) {
  return details?.RestException?.Code ?? details?.Code ?? null;
}

function extractProviderMessage(details = {}) {
  return details?.RestException?.Message ?? details?.Message ?? null;
}

export async function triggerAbsentCall(parentPhone) {
  const { sid, apiKey, apiToken, callerId, baseUrl, mockMode } = getConfig();
  const toPhone = formatPhone(parentPhone);
  const voiceUrl = buildVoiceUrl(baseUrl, { mockMode });
  const endpointPath = `/v1/Accounts/${sid}/Calls/connect.json`;
  const requestUrl = `${EXOTEL_BASE_URL}${endpointPath}`;
  const payload = new URLSearchParams({
    From: callerId,
    To: toPhone,
    CallerId: callerId,
    Url: voiceUrl,
  });

  const axiosConfig = {
    baseURL: EXOTEL_BASE_URL,
    auth: {
      username: apiKey,
      password: apiToken,
    },
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    timeout: EXOTEL_TIMEOUT_MS,
  };

  console.log(
    JSON.stringify(
      {
        tag: "EXOTEL_CALL_REQUEST",
        requestUrl,
        endpointPath,
        axiosBaseURL: axiosConfig.baseURL,
        timeoutMs: axiosConfig.timeout,
        payload: {
          From: callerId,
          To: toPhone,
          CallerId: callerId,
          Url: voiceUrl,
        },
      },
      null,
      2
    )
  );

  if (mockMode) {
    const mockSid = `MOCK-${Date.now()}-${toPhone.slice(-4)}`;
    const mockData = {
      Call: {
        Sid: mockSid,
        Status: "queued",
        To: toPhone,
        From: callerId,
        Url: voiceUrl,
      },
      mock: true,
    };
    console.log(
      JSON.stringify(
        {
          tag: "EXOTEL_CALL_MOCK_RESPONSE",
          data: mockData,
        },
        null,
        2
      )
    );
    return mockData;
  }

  try {
    const response = await axios.post(
      endpointPath,
      payload.toString(),
      axiosConfig
    );

    console.log(
      JSON.stringify(
        {
          tag: "EXOTEL_CALL_RESPONSE",
          status: response.status,
          data: response.data,
        },
        null,
        2
      )
    );
    return response.data;
  } catch (error) {
    const status = Number(error.response?.status) || 500;
    const details = error.response?.data ?? { message: error.message };
    const providerCode = extractProviderCode(details);
    const providerMessage = extractProviderMessage(details);
    const isTimeout = error.code === "ECONNABORTED";
    const isTrialRestriction = status === 403 && String(providerCode) === "34009";
    const isNetworkError = !error.response;

    if (isNetworkError) {
      console.error(
        JSON.stringify(
          {
            tag: "EXOTEL_CALL_NETWORK_ERROR",
            requestUrl,
            endpointPath,
            axiosBaseURL: axiosConfig.baseURL,
            errorCode: error.code ?? null,
            errorMessage: error.message,
            timeout: isTimeout,
          },
          null,
          2
        )
      );
    } else {
      console.error(
        JSON.stringify(
          {
            tag: "EXOTEL_CALL_ERROR",
            requestUrl,
            endpointPath,
            axiosBaseURL: axiosConfig.baseURL,
            responseStatus: error.response?.status ?? null,
            responseData: error.response?.data ?? null,
            errorCode: error.code ?? null,
            errorMessage: error.message,
            timeout: isTimeout,
          },
          null,
          2
        )
      );
    }
    if (isTimeout) {
      console.error("Exotel call timed out after 15000ms");
    }
    if (isTrialRestriction) {
      console.error("Likely trial restriction or number not whitelisted");
    }

    throw new CallProviderError("Failed to initiate absent call", {
      status: status >= 400 && status <= 599 ? status : 500,
      provider: "exotel",
      providerCode,
      providerMessage,
      details,
    });
  }
}
