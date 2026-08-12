import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import { AUTH_OTP_EXPIRES_SECONDS } from "@/modules/auth/lib/otp";

const EXPIRES_MINUTES = Math.round(AUTH_OTP_EXPIRES_SECONDS / 60);

type OtpEmailProps = {
  otp: string;
  preview: string;
  heading: string;
  intro: string;
  footer: string;
  codeBoxBackgroundColor?: string;
};

// Template unico de correos con codigo OTP. El copy de cada flujo (verificacion,
// restablecimiento, etc.) lo define `send-verification-otp.ts`.
export function OtpEmail({
  otp,
  preview,
  heading,
  intro,
  footer,
  codeBoxBackgroundColor = "#eef2ff",
}: OtpEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>{heading}</Heading>
          <Text style={styles.text}>{intro}</Text>
          <Section
            style={{
              ...styles.codeBox,
              backgroundColor: codeBoxBackgroundColor,
            }}
          >
            <Text style={styles.code}>{otp}</Text>
          </Section>
          <Text style={styles.text}>
            {`El codigo expira en ${EXPIRES_MINUTES} minutos. Si solicitas otro codigo, este dejara de ser valido.`}
          </Text>
          <Hr style={styles.hr} />
          <Text style={styles.footer}>{footer}</Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    margin: 0,
    backgroundColor: "#f5f7fb",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  container: {
    width: "100%",
    maxWidth: "520px",
    margin: "0 auto",
    padding: "32px 24px",
    backgroundColor: "#ffffff",
  },
  heading: {
    margin: "0 0 16px",
    color: "#111827",
    fontSize: "24px",
    lineHeight: "32px",
  },
  text: {
    margin: "0 0 18px",
    color: "#374151",
    fontSize: "16px",
    lineHeight: "24px",
  },
  codeBox: {
    margin: "24px 0",
    padding: "18px",
    borderRadius: "8px",
    textAlign: "center" as const,
  },
  code: {
    margin: 0,
    color: "#111827",
    fontSize: "32px",
    fontWeight: "700",
    letterSpacing: "8px",
    lineHeight: "40px",
  },
  hr: {
    margin: "28px 0 18px",
    borderColor: "#e5e7eb",
  },
  footer: {
    margin: 0,
    color: "#6b7280",
    fontSize: "13px",
    lineHeight: "20px",
  },
};
