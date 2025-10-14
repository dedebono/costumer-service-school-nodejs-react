export default function CanvaEmbed({ src, title = "Canva Design", ratio = "230%" }) {
  // ratio: "56.25%" = 16:9; use "75%" (4:3) or "100vh" full viewport below
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        paddingTop: ratio, // for 16:9; see full-height variant below
        background: "transparent",
      }}
    >
      <iframe
        title={title}
        src={src}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          border: 0,
        }}
        loading="lazy"
        allow="fullscreen"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
