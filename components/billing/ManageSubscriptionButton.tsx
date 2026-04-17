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
      });
      const body = (await response.json()) as PortalResponse;

      if (!response.ok || !body.url) {
        throw new Error(body.error ?? "Failed to open billing portal.");
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
