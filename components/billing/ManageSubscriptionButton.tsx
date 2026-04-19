"use client";

import { useState } from "react";
import AppButton from "@/components/AppButton";

type PortalResponse = {
  url?: string;
  error?: string;
};

export default function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);

  const openPortal = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const response = await fetch("/api/stripe/customer-portal", {
        method: "POST",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });

      const raw = await response.text();
      let body: PortalResponse = {};
      try {
        body = raw ? (JSON.parse(raw) as PortalResponse) : {};
      } catch {
        console.error("[billing] customer portal non-JSON body", {
          status: response.status,
          preview: raw.slice(0, 300),
        });
        alert(
          `Could not open subscription manager (${response.status}). If you were signed out, sign in and try again.`
        );
        return;
      }

      if (!response.ok || typeof body.url !== "string" || !body.url) {
        const msg =
          typeof body.error === "string" && body.error.trim().length > 0
            ? body.error.trim()
            : `Request failed (${response.status}).`;
        console.error("[billing] customer portal", { status: response.status, body });
        alert(msg);
        return;
      }

      window.location.href = body.url;
    } catch (error) {
      console.error("[billing] customer portal", error);
      alert("Could not open subscription manager. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppButton variant="primary" onClick={openPortal} disabled={loading}>
      {loading ? "Opening..." : "Manage Subscription"}
    </AppButton>
  );
}
