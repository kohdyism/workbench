import Script from "next/script";

export default function Home() {
  return (
    <>
      <div id="app" />
      <div id="overlay" />
      <div id="pop" className="pop" hidden />
      <div id="tip" className="tip" hidden />
      <div id="toast" className="toast" hidden />
      <Script src="/workbench.js" strategy="afterInteractive" />
    </>
  );
}
