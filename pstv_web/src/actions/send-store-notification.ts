import { sqlClient } from "@/lib/prismadb";
import { toDateTime } from "@/lib/utils";
import { Prisma } from "@prisma/client";
import nodemailer from "nodemailer";

const notificationObj = Prisma.validator<Prisma.StoreNotificationDefaultArgs>()(
  {
    include: {
      Sender: true,
      Recipent: true,
    },
  },
);
export type StoreNotification = Prisma.StoreNotificationGetPayload<
  typeof notificationObj
>;

export async function sendStoreNotification(mailtoSend: StoreNotification) {
  if (mailtoSend === null) return;
  if (mailtoSend.id === null) return;
  if (mailtoSend === null) return;
  if (mailtoSend.Sender.email === null) return;
  if (mailtoSend.Recipent.email === null) return;
  if (
    process.env.EMAIL_SERVER_HOST === null ||
    process.env.EMAIL_SERVER_HOST === undefined
  )
    return;
  if (
    process.env.EMAIL_SERVER_PORT === null ||
    process.env.EMAIL_SERVER_PORT === undefined
  )
    return;

  /*
  const mailtoSend = await sqlClient.storeNotification.findUnique({
    where: {
      id: id,
    },
    include: {
      Recipent: true,
      Sender: true,
    },
  });
  */

  const host = process.env.EMAIL_SERVER_HOST.toString() as string;
  const port = Number(process.env.EMAIL_SERVER_PORT);

  const transport = nodemailer.createTransport({
    host: host,
    port: port,
    //secure: true, // upgrade later with STARTTLS
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
    tls: {
      // do NOT fail on invalid certs
      rejectUnauthorized: false,
    },
  });

  //const server = `smtp://${process.env.EMAIL_SERVER_USER}:${process.env.EMAIL_SERVER_PASSWORD}@${process.env.EMAIL_SERVER_HOST}:${process.env.EMAIL_SERVER_PORT}`;

  const result = await transport.sendMail({
    //from: mailtoSend.Sender.email,
    from: "support@5ik.tv",
    to: mailtoSend.Recipent.email,
    replyTo: mailtoSend.Sender.email,
    subject: mailtoSend.subject,
    text: `${mailtoSend.message}`,
    html: `${mailtoSend.message}`,
  });

  const failed = result.rejected.concat(result.pending).filter(Boolean);

  if (failed.length) {
    throw new Error(`Email (${failed.join(", ")}) could not be sent`);
  }

  // update sent status
  const obj = await sqlClient.storeNotification.update({
    where: {
      id: mailtoSend.id,
    },
    data: {
      sentOn: toDateTime(Date.now() / 1000),
      sendTries: mailtoSend.sendTries + 1,
    },
  });

  return obj;
}

export default sendStoreNotification;
