import React, { useState, useEffect } from "react";
import AppEn from "./AppEn";
import AppRu from "./AppRu";

export default function App() {
  const [lang, setLang] = useState<"en" | "ru">("en");

  useEffect(() => {
    // Basic language detection
    const path = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);

    if (path.startsWith("/ru") || urlParams.get("lang") === "ru") {
      setLang("ru");
    } else {
      setLang("en");
    }
  }, []);

  return (
    <div className="relative">
      <div className="bg-background fixed right-6 bottom-6 z-[100] flex items-center gap-1 rounded-full border p-1 shadow-2xl">
        <button
          onClick={() => setLang("en")}
          className={`size-10 rounded-full text-sm font-bold transition-all ${lang === "en" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted"}`}
        >
          EN
        </button>
        <button
          onClick={() => setLang("ru")}
          className={`size-10 rounded-full text-sm font-bold transition-all ${lang === "ru" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-muted"}`}
        >
          RU
        </button>
      </div>

      {lang === "en" ? <AppEn /> : <AppRu />}
    </div>
  );
}
