import LegacyHome from "@/components/home/LegacyHome";

/** 旗標關閉時的首頁。KP_HOME_ENABLED 由 middleware 改寫到 /city-home，這份靜態頁不會被換掉。 */
export default function HomePage() {
  return <LegacyHome />;
}
