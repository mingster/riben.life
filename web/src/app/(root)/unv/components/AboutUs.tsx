import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import { slideIn } from "@/lib/motion";
import { useI18n } from "@/providers/i18n-provider";
import emailjs from "@emailjs/browser";
import { motion } from "framer-motion";
import { FaDiscord, FaFacebook, FaInstagram, FaLine } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import type React from "react";
import { useRef, useState } from "react";
import { BigText, Caption, IconContainer, Paragraph } from "./common";

export function AboutUs({ className, ...props }: { className?: string }) {
  const { lng } = useI18n();
  const { t } = useTranslation(lng, "landing");

  return (
    <section id="aboutUs" className="relative min-h-screen">
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.25 }}
        className="px-1 lg:px-10 w-full py-10"
      >
        <div className="px-4 mx-auto max-w-7xl sm:px-6 md:px-8 overflow-hidden">
          <motion.div
            //variants={slideIn("left", "tween", 0.2, 1)}
            className="flex-[0.75] bg-black-100 p-2 rounded-2xl"
          >
            <div className="flex gap-2">
              <IconContainer
                className="dark:bg-sky-500 dark:highlight-white/20"
                light={require("@/img/icons/home/editor-tools.png").default.src}
                dark={
                  require("@/img/icons/home/dark/editor-tools.png").default.src
                }
              />
              <Caption className="text-sky-500">
                {t("landing_contactus")}
              </Caption>
            </div>

            <BigText>World-class system integration.</BigText>
            <Paragraph>
              We are a team of engineers, designers, and developers who love to
              improve things in life.
            </Paragraph>
            <ContactForm />
          </motion.div>
        </div>
      </motion.section>
    </section>
  );
}

export const ContactForm = () => {
  const formRef = useRef(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);

  const { lng } = useI18n();
  const { t } = useTranslation(lng, "landing");

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;

    setForm((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const email_service_id = "service_l69dues";
  const email_template_id = "template_1d4knec";
  const email_publicKey = "l9AmZKlWsOgwo0aGQ";
  //console.log('email_publicKey: ', email_publicKey);

  const lineId = "line";
  const facebookUrl = "fb";
  const igUrl = "ig";

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    emailjs
      .send(
        email_service_id,
        email_template_id,
        {
          from_name: form.name,
          to_name: t("landing_contactus"),
          from_email: form.email,
          to_email: "support@riben.life",
          message: form.message,
        },
        email_publicKey,
      )
      .then(
        () => {
          setLoading(false);
          alert(t("landing_submitMessage"));

          setForm({
            name: "",
            email: "",
            message: "",
          });
        },
        (error) => {
          setLoading(false);
          console.error(error);

          alert("Ahh, something went wrong. Please try again.");
        },
      );
  };
  return (
    <div className="">
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.25 }}
        className="px-1 lg:px-10 w-full py-10 mx-auto relative z-0"
      >
        <span className="hash-span" id="nav_contact">
          &nbsp;
        </span>

        <div className="flex xl:flex-row flex-col-reverse gap-2 overflow-hidden">
          <motion.div
            variants={slideIn("left", "tween", 0.2, 1)}
            className="flex-[0.75] bg-black-100 rounded-2xl"
          >
            <div className="font-semibold mb-4 grid grid-cols-3">
              <div className="hover:text-slate">
                {lineId && <LineLink url={lineId} />}
              </div>
              <div className="hover:text-slate">
                {facebookUrl && <FacebookLink url={facebookUrl} />}
              </div>
              <div className="hover:text-slate">
                {igUrl && <InstagramLink url={igUrl} />}
              </div>
            </div>

            <form
              ref={formRef}
              onSubmit={handleFormSubmit}
              className="mt-2 flex flex-col gap-8"
            >
              <Label className="flex flex-col">
                <span className="font-medium mb-4">
                  {t("landing_contactus_form_name_label")}
                </span>
                <Input
                  autoComplete="on"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleInputChange}
                  placeholder={t("landing_contactus_form_name")}
                  className="py-4 px-6 placeholder:text-gray-700 rounded-lg outline-none font-mono"
                />
              </Label>
              <Label className="flex flex-col">
                <span className="font-medium mb-4">
                  {t("landing_contactus_form_email_label")}
                </span>
                <Input
                  autoComplete="on"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleInputChange}
                  placeholder={t("landing_contactus_form_email")}
                  className="py-4 px-6 placeholder:text-gray-700 rounded-lg outline-none font-mono"
                />
              </Label>
              <Label className="flex flex-col">
                <span className="font-medium mb-4">
                  {t("landing_contactus_form_msg_Label")}
                </span>
                <Textarea
                  rows={7}
                  name="message"
                  value={form.message}
                  onChange={handleInputChange}
                  placeholder={t("landing_contactus_form_msg")}
                  className="py-4 px-6 placeholder:text-gray-700 rounded-lg outline-none font-mono"
                />
              </Label>

              <Button type="submit" className="btn-primary">
                {loading
                  ? t("landing_contactus_form_sending")
                  : t("landing_contactus_form_sendButton")}
              </Button>
            </form>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
};

type Props = {
  url: string;
};

const FacebookLink = ({ url }: Props) => (
  <a
    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
    target="_blank"
    rel="noreferrer"
  >
    <div className="flex items-center justify-center gap-1">
      <FaFacebook className="w-5 h-5 text-[#4267B2]" />
      Facebook
    </div>
  </a>
);

const InstagramLink = ({ url }: Props) => (
  <a href={url} target="_blank" rel="noreferrer">
    <div className="flex items-center justify-center gap-1">
      <FaInstagram className="w-5 h-5" />
      Instagram
    </div>
  </a>
);

const LineLink = ({ url }: Props) => (
  <a
    href={`https://line.me/R/ti/p/${encodeURIComponent(url)}`}
    target="_blank"
    rel="noreferrer"
  >
    <div className="flex items-center justify-center gap-1">
      <FaLine className="w-5 h-5 text-[#06C755]" />
      LINE
    </div>
  </a>
);
