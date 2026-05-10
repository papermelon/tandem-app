"use client";

import * as React from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHomeState } from "@/lib/home-state";
import { buildHandoverQR } from "@/lib/qr-handover";

export function HandoverShareCard() {
  const home = useHomeState();
  const [qr, setQr] = React.useState<string | null>(null);
  const [generating, setGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const selected = home.state.patients.find((p) => p.id === home.state.selectedPatientId);

  const generate = React.useCallback(async () => {
    if (!selected) return;
    setGenerating(true);
    setError(null);
    try {
      const code = await buildHandoverQR({
        recipient: {
          id: selected.id,
          name: selected.name,
          age: selected.age,
          relationship: selected.relationship,
          country: selected.country,
          avatar: selected.avatar,
          context: selected.context,
          address: selected.address,
          careCircleId: selected.careCircleId,
        },
        fromCircleLabel: home.state.caregiver.name ? `${home.state.caregiver.name}'s circle` : undefined,
        issuedAt: Date.now(),
      });
      setQr(code);
    } catch {
      setError("Couldn't generate the QR code.");
    } finally {
      setGenerating(false);
    }
  }, [selected, home.state.caregiver.name]);

  React.useEffect(() => {
    setQr(null);
  }, [selected?.id]);

  if (!home.hydrated) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="size-5 text-primary" />
          Share with a QR code
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selected ? (
          <p className="text-sm text-muted-foreground">
            Choose someone on the home screen first.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Generate an encrypted QR code so another family member can add{" "}
              <span className="font-semibold text-foreground">{selected.name}</span>&apos;s profile into
              their Tandem app.
            </p>

            {qr ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border bg-white p-4">
                <QRCodeSVG value={qr} size={220} level="M" includeMargin />
                <div className="text-center text-xs text-muted-foreground">
                  Ask them to scan this with their camera.
                </div>
                <Button variant="ghost" size="sm" className="gap-2" onClick={generate} disabled={generating}>
                  <RefreshCw className="size-3" />
                  Regenerate
                </Button>
              </div>
            ) : (
              <Button onClick={generate} disabled={generating} className="w-full">
                {generating ? "Generating…" : `Create QR for ${selected.name}`}
              </Button>
            )}

            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
