-- Un usuario solo puede mantener una operacion de pago abierta por nivel.
-- Los estados terminales quedan fuera para permitir renovaciones posteriores.
CREATE UNIQUE INDEX "payment_one_open_per_user_level_key"
ON "payment" ("userId", "levelId")
WHERE "status" IN ('INITIALIZING', 'PROCESSING', 'REQUIRES_REVIEW');

