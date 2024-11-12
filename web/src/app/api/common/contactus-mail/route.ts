import { sendMail } from "@/actions/send-store-notification";
import axios from "axios";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log(JSON.stringify(body));

    const { name, email, message, captcha } = body;

    if (!name) {
      return new NextResponse("name is requried", { status: 400 });
    }
    if (!email) {
      return new NextResponse("email is requried", { status: 401 });
    }
    if (!message) {
      return new NextResponse("message is requried", { status: 402 });
    }
    if (!captcha) {
      return new NextResponse("captcha is requried", { status: 403 });
    }

    let okToSendMail = false;
    const captchakey = process.env.RECAPTCHA_SECRET;
    const formData = `secret=${captchakey}&response=${captcha}`;
    try {
      const res = await axios.post(
        "https://www.google.com/recaptcha/api/siteverify",
        formData,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      if (res?.data?.success) {
        // if (res?.data?.success && res.data?.score > 0.5) { // scroe is for react-google-recaptcha-v3
        // all good
        okToSendMail = true;
      } else {
        console.log("fail: res.data?.score:", res.data?.score);
        return NextResponse.json({
          success: false,
          name,
          score: res.data?.score,
        });
      }
    } catch (e) {
      console.log("recaptcha error:", e);
      return new NextResponse("Captcha failed", { status: 404 });
    }

    // if captcha is good, send mail
    //
    if (okToSendMail) {
      const sender = `${name} <${email}>`;
      const result = await sendMail(
        sender,
        "support@riben.life",
        "contact Us",
        `${sender}\n\n${email}\n\n${message}`,
      );

      console.log(`send result: ${JSON.stringify(result)}`);
      //console.log(`create announcement: ${JSON.stringify(obj)}`);
      return NextResponse.json(result, { status: 200 });
    }

    return new NextResponse("Captcha failed", { status: 404 });
  } catch (error) {
    console.log("[contactus_mail]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}
