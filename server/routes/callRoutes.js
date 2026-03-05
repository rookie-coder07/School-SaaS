import express from "express";
import { CallProviderError, triggerAbsentCall } from "../services/callService.js";

const router = express.Router();
const EXOTEL_TEST_PHONE = "9036994424";

function validateExotelCallConfig(_req, res, next) {
  const required = [
    "EXOTEL_SID",
    "EXOTEL_API_KEY",
    "EXOTEL_API_TOKEN",
    "EXOTEL_CALLER_ID",
  ];
  const missing = required.filter((key) => !String(process.env[key] || "").trim());
  if (missing.length > 0) {
    return res.status(500).json({
      success: false,
      error: `Missing Exotel configuration: ${missing.join(", ")}`,
    });
  }
  return next();
}

router.post("/api/call/absent", validateExotelCallConfig, async (req, res) => {
  try {
    const parentPhone = String(req.body?.parentPhone || "").trim();
    if (!parentPhone) {
      return res.status(400).json({
        success: false,
        error: "parentPhone is required",
      });
    }

    const result = await triggerAbsentCall(parentPhone);
    const callSid = result?.Call?.Sid || null;
    return res.status(200).json({
      success: true,
      callSid,
    });
  } catch (error) {
    if (error instanceof CallProviderError) {
      return res.status(error.status).json({
        success: false,
        error: error.message,
        providerError: {
          provider: error.provider,
          status: error.status,
          code: error.providerCode,
          message: error.providerMessage,
        },
      });
    }

    return res.status(500).json({
      success: false,
      error: "Failed to initiate absent call",
    });
  }
});

router.get("/api/call/test", validateExotelCallConfig, async (_req, res) => {
  try {
    const result = await triggerAbsentCall(EXOTEL_TEST_PHONE);
    return res.status(200).json({
      success: true,
      testPhone: EXOTEL_TEST_PHONE,
      exotel: result,
    });
  } catch (error) {
    if (error instanceof CallProviderError) {
      return res.status(error.status).json({
        success: false,
        error: error.message,
        providerError: {
          provider: error.provider,
          status: error.status,
          code: error.providerCode,
          message: error.providerMessage,
        },
        details: error.details,
      });
    }
    return res.status(500).json({
      success: false,
      error: "Failed to run Exotel test call",
    });
  }
});

router.get("/exotel-voice.xml", (req, res) => {
  res.set("Content-Type", "text/xml");
  res.send(
    '<Response><Say voice="female">This is an automated call from School. Your child is marked absent today. Please contact the school if this is incorrect.</Say></Response>'
  );
});

export default router;
