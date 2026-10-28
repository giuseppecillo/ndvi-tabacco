import type { FC } from "react";
import { useDeckText } from "../../i18n";
import { LocalizedFigure } from "../../components/LocalizedFigure";
import img_1 from "../../assets/imported-presentation/image_1.webp";
import img_2 from "../../assets/imported-presentation/image_8.webp";
import img_3 from "../../assets/imported-presentation/image_4.webp";

const ImportedSlide10: FC = () => {
const t = useDeckText();
return (
<div className="w-screen h-screen overflow-hidden relative" style={{ backgroundColor: "#ffffff" }}>
<div key={0} style={{
        position: "absolute",
        left: "0vw",
        top: "0vh",
        width: "100vw",
        height: "100vh",
        boxSizing: "border-box",
        backgroundColor: "#FAFBFC"
      }} /><div key={1} style={{
        position: "absolute",
        left: "4.010417vw",
        top: "3.97963vh",
        width: "91.979167vw",
        height: "7.037037vh",
        boxSizing: "border-box",
        backgroundColor: "transparent"
      }} /><div key={2} style={{
        position: "absolute",
        left: "4.010417vw",
        top: "5.692593vh",
        width: "1.979167vw",
        height: "3.518519vh",
        boxSizing: "border-box",
        backgroundColor: "#0D9488",
        borderRadius: "3.84px"
      }} /><div key={3} style={{
        position: "absolute",
        left: "6.998958vw",
        top: "5.824074vh",
        width: "15.190625vw",
        height: "3.240741vh",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0vh 0vw 0vh 0vw",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.2",
          fontSize: t.font("1.5vw", "NitroCrop NDVI"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.5vw", "NitroCrop NDVI"),
            fontFamily: "'Inter', sans-serif",
            fontWeight: "700",
            color: "#1E3A5F"
          }}>{t("NitroCrop NDVI")}</span></p></div><div key={4} style={{
        position: "absolute",
        left: "86.169792vw",
        top: "5.824074vh",
        width: "13.405208vw",
        height: "3.242593vh",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0vh 0vw 0vh 0vw",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.2",
          fontSize: t.font("1.5vw", "MAPPE"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.5vw", "MAPPE"),
            fontFamily: "'Inter', sans-serif",
            fontWeight: "700",
            color: "#64748B"
          }}>{t("MAPPE")}</span></p></div><div key={5} style={{
        position: "absolute",
        left: "4vw",
        top: "15.922222vh",
        width: "48.829167vw",
        height: "8.240741vh",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0vh 0vw 0vh 0vw",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.2",
          fontSize: t.font("3.805556vw", "Lettura della mappa"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("3.805556vw", "Lettura della mappa"),
            fontFamily: "'Inter', sans-serif",
            fontWeight: "700",
            color: "#1E3A5F"
          }}>{t("Lettura della mappa")}</span></p></div><div key={6} style={{
        position: "absolute",
        left: "89.265625vw",
        top: "91.918519vh",
        width: "9.379167vw",
        height: "3.240741vh",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0vh 0vw 0vh 0vw",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.2",
          fontSize: t.font("1.5vw", "Pagina 10"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.5vw", "Pagina 10"),
            fontFamily: "'Inter', sans-serif",
            color: "#94A3B8"
          }}>{t("Pagina 10")}</span></p></div><img key={7} src={img_1} alt="preencoded.png" style={{
        position: "absolute",
        left: "4.010417vw",
        top: "3.97963vh",
        width: "91.979167vw",
        height: "7.037037vh",
        boxSizing: "border-box",
        objectFit: "fill"
      }} /><div key={8} style={{
        position: "absolute",
        left: "4.00625vw",
        top: "28.12963vh",
        width: "43.145833vw",
        height: "47.594444vh",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "0vh 0vw 0vh 0vw",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.56",
          fontSize: t.font("2vw", "Sovrapposizione mappa di prescrizione a quella satellite. Lettura della mappa:"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Sovrapposizione mappa di prescrizione a quella satellite. Lettura della mappa:"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Sovrapposizione mappa di prescrizione a quella satellite. Lettura della mappa:")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.56",
          marginTop: "1.498765vh",
          fontSize: t.font("2vw", "Verde: valori inferiori; rosso: valori superiori"),
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Verde: valori inferiori; rosso: valori superiori"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Verde: valori inferiori; rosso: valori superiori")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.56",
          marginTop: "1.498765vh",
          fontSize: t.font("2vw", "Punti blu: osservazioni di controllo"),
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Punti blu: osservazioni di controllo"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Punti blu: osservazioni di controllo")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.56",
          marginTop: "1.498765vh",
          fontSize: t.font("2vw", "Info click rispetto ai kg N/ha nei vari punti"),
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Info click rispetto ai kg N/ha nei vari punti"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Info click rispetto ai kg N/ha nei vari punti")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.56",
          marginTop: "1.498765vh",
          fontSize: t.font("2vw", "Statistiche di minimo, media, massimo e numero di celle"),
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Statistiche di minimo, media, massimo e numero di celle"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Statistiche di minimo, media, massimo e numero di celle")}</span></p></div><LocalizedFigure key={9} imageId={8} source={img_2} alt="Google Shape;224;p15" style={{
        position: "absolute",
        left: "51.925vw",
        top: "14.835185vh",
        width: "38.597917vw",
        height: "74.183333vh",
        boxSizing: "border-box",
        objectFit: "fill"
      }} /><img key={10} src={img_3} alt="Google Shape;225;p15" style={{
        position: "absolute",
        left: "2.50625vw",
        top: "88.972222vh",
        width: "5.0375vw",
        height: "9.059259vh",
        boxSizing: "border-box",
        objectFit: "fill"
      }} /><div key={11} style={{
        position: "absolute",
        left: "8.319792vw",
        top: "91.918519vh",
        width: "25.639583vw",
        height: "3.242593vh",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0vh 0vw 0vh 0vw",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.2",
          fontSize: t.font("1.5vw", "Taurus Agriculture Solution"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.5vw", "Taurus Agriculture Solution"),
            fontFamily: "'Inter', sans-serif",
            color: "#94A3B8"
          }}>{t("Taurus Agriculture Solution")}</span></p></div>
</div>
);
};
export default ImportedSlide10;
