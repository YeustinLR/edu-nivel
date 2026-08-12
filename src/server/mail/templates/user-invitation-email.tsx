import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from "@react-email/components";

export function UserInvitationEmail({
  name,
  inviterName,
  roleLabel,
  invitationUrl,
}: {
  name: string;
  inviterName: string;
  roleLabel: string;
  invitationUrl: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>{inviterName} te invitó a EduNivel</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>Completa tu cuenta de EduNivel</Heading>
          <Text style={styles.text}>Hola, {name}.</Text>
          <Text style={styles.text}>
            {inviterName} te invitó a participar como {roleLabel.toLowerCase()}.
            Revisa los datos, acepta las condiciones y crea tu propia contraseña.
          </Text>
          <Button href={invitationUrl} style={styles.button}>
            Aceptar invitación
          </Button>
          <Text style={styles.help}>
            La invitación expira en 72 horas y solo puede utilizarse una vez.
          </Text>
          <Hr style={styles.hr} />
          <Text style={styles.footer}>
            Si no esperabas esta invitación, puedes ignorar este mensaje.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    margin: 0,
    backgroundColor: "#f5f7fb",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
  button: {
    display: "inline-block",
    margin: "6px 0 20px",
    borderRadius: "8px",
    backgroundColor: "#4f46e5",
    color: "#ffffff",
    padding: "12px 20px",
    fontSize: "15px",
    fontWeight: "600",
    textDecoration: "none",
  },
  help: {
    margin: "0 0 18px",
    color: "#6b7280",
    fontSize: "14px",
    lineHeight: "21px",
  },
  hr: { margin: "24px 0 16px", borderColor: "#e5e7eb" },
  footer: {
    margin: 0,
    color: "#6b7280",
    fontSize: "13px",
    lineHeight: "20px",
  },
};
