import { useState } from "react";
import {
  isWebAuthnSupported,
  isWebAuthnOriginValid,
  getWebAuthnOriginErrorMessage,
  prepareAuthenticationOptions,
  prepareRegistrationOptions,
  serializeAuthenticationCredential,
  serializeRegistrationCredential,
} from "../utils/webauthn";

const API_URL = import.meta.env.VITE_API_URL;

export default function FingerprintAuthActions({
  email,
  password,
  role,
  onLoginSuccess = () => {},
  setError = () => {},
  setInfo = () => {},
}) {
  const [fingerprintLoading, setFingerprintLoading] = useState(false);
  const [fingerprintEnrollLoading, setFingerprintEnrollLoading] = useState(false);
  const [canFingerprintLogin, setCanFingerprintLogin] = useState(true);

  const resetMessages = () => {
    setError("");
    setInfo("");
  };

  /**
   * Validate WebAuthn prerequisites before attempting to create/get credentials
   */
  const validateWebAuthnPrerequisites = () => {
    if (!isWebAuthnSupported()) {
      const msg = "WebAuthn / fingerprint is not supported on this device or browser.";
      setError(msg);
      alert(msg);
      return false;
    }

    if (!isWebAuthnOriginValid()) {
      const originError = getWebAuthnOriginErrorMessage();
      if (originError) {
        setError(originError);
        return false;
      }
    }

    return true;
  };

  const handleFingerprintRegister = async () => {
    resetMessages();

    // Validate prerequisites before registration
    if (!validateWebAuthnPrerequisites()) {
      return;
    }

    if (!email || !password) {
      setError("Enter email and password first to register fingerprint");
      return;
    }

    setFingerprintEnrollLoading(true);
    try {
      const optionsRes = await fetch(`${API_URL}/api/auth/webauthn/register/options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const optionsPayload = await optionsRes.json();
      if (!optionsRes.ok) throw new Error(optionsPayload?.error || "Failed to start fingerprint setup");

      const credential = await navigator.credentials.create({
        publicKey: prepareRegistrationOptions(optionsPayload),
      });
      if (!credential) throw new Error("Fingerprint setup aborted");
      const registrationResponse = serializeRegistrationCredential(credential);

      const verifyRes = await fetch(`${API_URL}/api/auth/webauthn/register/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, registrationResponse }),
      });
      const verifyPayload = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyPayload?.error || "Fingerprint setup failed");

      setCanFingerprintLogin(true);
      setInfo("Fingerprint registered on this device. Use the same device to login with fingerprint.");
    } catch (err) {
      console.error("Fingerprint register error:", err);
      setError(err?.message || "Fingerprint setup failed");
    } finally {
      setFingerprintEnrollLoading(false);
    }
  };

  const handleFingerprintLogin = async () => {
    resetMessages();

    // Validate prerequisites before login
    if (!validateWebAuthnPrerequisites()) {
      return;
    }

    if (!email) {
      setError("Enter email to continue fingerprint login");
      return;
    }

    setFingerprintLoading(true);
    try {
      const optionsRes = await fetch(`${API_URL}/api/auth/webauthn/login/options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, role }),
      });
      const optionsPayload = await optionsRes.json();
      if (
        (optionsPayload?.message && optionsPayload.message.includes("No fingerprint registered")) ||
        optionsPayload?.code === "NO_CREDENTIALS_REGISTERED"
      ) {
        setCanFingerprintLogin(false);
        setError("Please register fingerprint first.");
        return;
      }
      if (!optionsRes.ok) throw new Error(optionsPayload?.error || "Fingerprint not set up");
      setCanFingerprintLogin(true);

      const assertion = await navigator.credentials.get({
        publicKey: prepareAuthenticationOptions(optionsPayload),
      });
      if (!assertion) throw new Error("Fingerprint login aborted");
      const authenticationResponse = serializeAuthenticationCredential(assertion);

      const verifyRes = await fetch(`${API_URL}/api/auth/webauthn/login/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, role, authenticationResponse }),
      });
      const verifyPayload = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyPayload?.error || "Fingerprint login failed");

      onLoginSuccess(verifyPayload);
    } catch (err) {
      console.error("Fingerprint login error:", err);
      setError(err?.message || "Fingerprint login failed");
    } finally {
      setFingerprintLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleFingerprintLogin}
        disabled={fingerprintLoading || canFingerprintLogin === false}
        className="w-full mt-3 rounded-lg border border-white/20 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/5 disabled:opacity-50 md:text-base"
      >
        {fingerprintLoading ? "Checking fingerprint..." : "Login with Fingerprint"}
      </button>
      <button
        type="button"
        onClick={handleFingerprintRegister}
        disabled={fingerprintEnrollLoading}
        className="w-full mt-3 py-2 text-sm font-semibold text-slate-300 transition hover:text-white disabled:opacity-50"
      >
        {fingerprintEnrollLoading ? "Registering..." : "Register Fingerprint on this device"}
      </button>
      <p className="text-center text-xs text-slate-400">
        Fingerprint works only on the same device where it was registered.
      </p>
    </div>
  );
}
