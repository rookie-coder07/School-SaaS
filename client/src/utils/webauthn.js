const toBase64Url = (input) => {
  if (typeof input === "string") {
    return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const fromBase64Url = (value = "") => {
  // If it's already ArrayBuffer/TypedArray, just return the underlying buffer
  if (value instanceof ArrayBuffer) return value;
  if (ArrayBuffer.isView(value)) return value.buffer;

  const base64 = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4 || 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

export const isWebAuthnSupported = () =>
  Boolean(window?.PublicKeyCredential && navigator?.credentials);

/**
 * Get configured WebAuthn origins from environment variable
 * Supports comma-separated list of origins for development/production flexibility
 */
export const getConfiguredWebAuthnOrigins = () => {
  const originStr = import.meta.env.VITE_WEBAUTHN_ORIGIN || "";
  if (!originStr) return [];
  return originStr
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

/**
 * Validate if current window origin is allowed for WebAuthn
 * Returns true if origin is configured or if no origins are configured (unsafe fallback)
 */
export const isWebAuthnOriginValid = () => {
  if (typeof window === "undefined") return false;
  
  const configuredOrigins = getConfiguredWebAuthnOrigins();
  
  // If no origins configured in environment, allow (development mode)
  if (configuredOrigins.length === 0) {
    console.warn("[WebAuthn] No VITE_WEBAUTHN_ORIGIN configured - allowing all origins");
    return true;
  }

  const currentOrigin = window.location.origin;
  const isValid = configuredOrigins.includes(currentOrigin);
  
  if (!isValid) {
    console.error(
      `[WebAuthn] Origin mismatch: current="${currentOrigin}" configured="${configuredOrigins.join(", ")}"`
    );
  }

  return isValid;
};

/**
 * Get error message when WebAuthn origin is invalid
 */
export const getWebAuthnOriginErrorMessage = () => {
  const currentOrigin = window.location.origin;
  const configuredOrigins = getConfiguredWebAuthnOrigins();
  
  if (configuredOrigins.length === 0) {
    return null; // No origins configured, allow
  }

  if (!configuredOrigins.includes(currentOrigin)) {
    return `Fingerprint login is unavailable on this domain. Expected: ${configuredOrigins.join(" or ")}, Got: ${currentOrigin}`;
  }

  return null;
};

export const prepareRegistrationOptions = (options = {}) => ({
  ...options,
  challenge: fromBase64Url(options.challenge),
  user: {
    ...options.user,
    id: fromBase64Url(options.user?.id),
  },
  excludeCredentials: (options.excludeCredentials || []).map((credential) => ({
    ...credential,
    id: fromBase64Url(credential.id),
  })),
});

export const prepareAuthenticationOptions = (options = {}) => ({
  ...options,
  challenge: fromBase64Url(options.challenge),
  allowCredentials: (options.allowCredentials || []).map((credential) => ({
    ...credential,
    id: fromBase64Url(credential.id),
  })),
});

export const serializeRegistrationCredential = (credential) => {
  if (!credential) return null;
  return {
    id: credential.id,
    rawId: toBase64Url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: toBase64Url(credential.response.clientDataJSON),
      attestationObject: toBase64Url(credential.response.attestationObject),
      transports: typeof credential.response.getTransports === "function"
        ? credential.response.getTransports()
        : [],
    },
    clientExtensionResults: credential.getClientExtensionResults?.() || {},
  };
};

export const serializeAuthenticationCredential = (credential) => {
  if (!credential) return null;
  return {
    id: credential.id,
    rawId: toBase64Url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: toBase64Url(credential.response.clientDataJSON),
      authenticatorData: toBase64Url(credential.response.authenticatorData),
      signature: toBase64Url(credential.response.signature),
      userHandle: credential.response.userHandle
        ? toBase64Url(credential.response.userHandle)
        : null,
    },
    clientExtensionResults: credential.getClientExtensionResults?.() || {},
  };
};
