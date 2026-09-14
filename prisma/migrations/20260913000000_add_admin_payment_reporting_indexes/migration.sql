CREATE INDEX "payment_providerMode_status_appliedAt_idx"
ON "payment"("providerMode", "status", "appliedAt");

CREATE INDEX "payment_providerMode_createdAt_id_idx"
ON "payment"("providerMode", "createdAt", "id");
