import { useState } from "react";

function getInitial(name = "") {
  const clean = String(name || "").trim();

  if (!clean) return "K";

  return clean.slice(0, 1).toUpperCase();
}

function isValidImageUrl(value = "") {
  const clean = String(value || "").trim();

  return clean.startsWith("http://") || clean.startsWith("https://");
}

export function CommentAvatar({ comment, size = "md" }) {
  const [failed, setFailed] = useState(false);

  const name = comment?.customer_name || comment?.customer_platform_id || "Khách";
  const avatar = String(comment?.customer_avatar || "").trim();

  const sizeClass =
    size === "lg"
      ? "h-14 w-14 text-base"
      : "h-11 w-11 text-sm";

  if (isValidImageUrl(avatar) && !failed) {
    return (
      <img
        src={avatar}
        alt={name}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setFailed(true)}
        className={`${sizeClass} shrink-0 rounded-full object-cover ring-2 ring-white bg-slate-100`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-700 to-emerald-500 font-black text-white ring-2 ring-white`}
      title={name}
    >
      {getInitial(name)}
    </div>
  );
}
