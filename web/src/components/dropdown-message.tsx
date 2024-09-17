import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import type { StoreAnnouncement } from "@prisma/client";
import { CookiesProvider, useCookies } from "react-cookie";

interface props {
  messages: StoreAnnouncement[] | undefined | null;
}

// display store messages/announcements to store visitors
//
export default function DropdownMessage({ messages }: props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifying, setNotifying] = useState(true);
  const [hasMessage, setHasMessage] = useState(true);
  const { lng } = useI18n();
  const { t } = useTranslation(lng);

  const cookieName = "messageRead";
  const [cookies, setCookies] = useCookies([cookieName]); //https://github.com/bendotcodes/cookies/tree/main/packages/react-cookie

  const trigger = useRef<any>(null);
  const dropdown = useRef<any>(null);

  useEffect(() => {
    // if no messages, don't show
    if (messages === null) {
      setHasMessage(false);
      setNotifying(false);
    } else {
      setHasMessage(true);
    }

    // if there's cookie, user has already seem the message, so don't show
    /*
    if (cookies.messageRead) {
      setNotifying(false);
      return;
    }
      */

    // finally, show the message if available.
    messages ? setNotifying(true) : setNotifying(false);
  }, [messages]);

  //console.log(`hasMessage: ${hasMessage}`);
  //console.log(`cookie: ${cookies.messageRead}`);

  const handleClick = () => {
    //console.log('change language to: ' + value);

    // TODO - add mark as read button
    //
    setCookies(cookieName, true, {
      path: "/",
      expires: new Date(Date.now() + 60 * 1000),
    });
  };

  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!dropdown.current) return;
      if (
        !dropdownOpen ||
        dropdown.current.contains(target) ||
        trigger.current.contains(target)
      )
        return;
      setDropdownOpen(false);
    };
    document.addEventListener("click", clickHandler);
    return () => document.removeEventListener("click", clickHandler);
  });

  // close if the esc key is pressed
  useEffect(() => {
    const keyHandler = ({ keyCode }: KeyboardEvent) => {
      if (!dropdownOpen || keyCode !== 27) return;
      setDropdownOpen(false);
    };
    document.addEventListener("keydown", keyHandler);
    return () => document.removeEventListener("keydown", keyHandler);
  });

  return (
    <div className="relative">
      <Link
        ref={trigger}
        onClick={() => {
          setNotifying(false);
          setDropdownOpen(!dropdownOpen);
          handleClick();
        }}
        href="#"
        className="relative flex h-8.5 w-8.5 items-center justify-center rounded-full border-[0.5px]
        border-gray/20 bg-stroke/20 hover:text-meta-1 dark:border-strokedark dark:bg-meta-4 dark:text-primary dark:hover:text-meta-1"
      >
        {hasMessage && (
          <>
            <span
              className={`absolute -top-0.5 right-0 z-1 h-2 w-2 rounded-full bg-meta-1 ${
                notifying === false ? "hidden" : "inline"
              }`}
            >
              <span className="absolute -z-1 inline-flex h-full w-full animate-ping rounded-full bg-meta-1 opacity-75"></span>
            </span>
          </>
        )}
        <Bell className="text-slate-400 hover:opacity-50 duration-300 ease-in-out w-5 h-5" />
      </Link>

      <div
        ref={dropdown}
        onFocus={() => setDropdownOpen(true)}
        onBlur={() => setDropdownOpen(false)}
        className={`absolute -right-27 mt-2.5 flex h-90 w-75 flex-col rounded-sm border
           border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark sm:right-0 sm:w-80 ${
             dropdownOpen === true ? "block" : "hidden"
           }`}
      >
        <div className="px-4.5 py-3">
          <h5 className="text-sm font-medium text-bodydark2">
            {t("StoreAnnouncement_title")}
          </h5>
        </div>

        <ul className="flex h-auto flex-col overflow-y-auto">
          {messages?.map((message) => (
            <li key={message.id}>
              <Link
                className="flex flex-col gap-2.5 border-t border-stroke px-4.5 py-3 hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
                href="#"
              >
                <p className="text-sm">
                  <span className="text-black dark:text-primary">
                    {message.message}
                  </span>
                </p>
                <p className="text-xs">{message.updatedAt.toDateString()}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
