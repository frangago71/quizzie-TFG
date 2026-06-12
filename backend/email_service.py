import os
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from dotenv import load_dotenv

load_dotenv(override=True)


def send_email(to_email: str, subject: str, html_content: str):
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT")
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM")

    body_text = f"Asunto: {subject}\nPara: {to_email}\n\nCuerpo HTML:\n{html_content}"

    log_dir = os.path.dirname(os.path.abspath(__file__))
    log_file = os.path.join(log_dir, "email_mock.log")
    try:
        with open(log_file, "a", encoding="utf-8") as f:
            f.write("\n========================================\n")
            f.write(f"FECHA/HORA: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(body_text)
            f.write("\n========================================\n")
    except Exception as e:
        print(f"Error escribiendo log de email: {e}")

    print(f"SMTP Mock: Email guardado en {log_file} para {to_email} con asunto '{subject}'")

    if smtp_host and smtp_port:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = smtp_from
            msg["To"] = to_email

            part = MIMEText(html_content, "html")
            msg.attach(part)

            port = int(smtp_port)
            if port == 465:
                server = smtplib.SMTP_SSL(smtp_host, port)
            else:
                server = smtplib.SMTP(smtp_host, port)
                server.starttls()

            if smtp_username and smtp_password:
                server.login(smtp_username, smtp_password)

            server.sendmail(smtp_from, to_email, msg.as_string())
            server.quit()
            print(f"Correo real enviado exitosamente a {to_email}")
        except Exception as e:
            print(f"SMTP Error: {e}")
