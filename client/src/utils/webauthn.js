const toBase64Url = (input) => {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const fromBase64Url = (value = "") => {
  const base64 = String(value).replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4 || 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

export const isWebAuthnSupported = () =>
  Boolean(window?.PublicKeyCredential && navigator?.credentials);

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
