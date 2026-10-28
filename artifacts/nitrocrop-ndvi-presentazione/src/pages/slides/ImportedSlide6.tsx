import type { FC } from "react";
import { useDeckText } from "../../i18n";
import { LocalizedFigure } from "../../components/LocalizedFigure";
import img_1 from "../../assets/imported-presentation/image_1.webp";
import img_2 from "../../assets/imported-presentation/image_5.webp";
import img_3 from "../../assets/imported-presentation/image_4.webp";

const ImportedSlide6: FC = () => {
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
        left: "0vw",
        top: "2.5vh",
        width: "100vw",
        height: "8.6vh",
        boxSizing: "border-box",
        background: "linear-gradient(180deg, #F6B42C 0%, #F09A1F 100%)",
        borderBottom: "1px solid #C97A12"
      }} /><div key={2} style={{
        position: "absolute",
        left: "4.010417vw",
        top: "4.6vh",
        width: "19.5vw",
        height: "5.6vh",
        boxSizing: "border-box",
        backgroundColor: "#FFD36B",
        border: "1px solid #C97A12",
        borderRadius: "999px"
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
            color: "#2A1A05"
          }}>{t("NitroCrop NDVI")}</span></p></div><div key={4} style={{
        position: "absolute",
        left: "87.748958vw",
        top: "5.824074vh",
        width: "11.351042vw",
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
          fontSize: t.font("1.5vw", "TABACCO"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.5vw", "TABACCO"),
            fontFamily: "'Inter', sans-serif",
            fontWeight: "700",
            color: "#2A1A05"
          }}>{t("TABACCO")}</span></p></div><div key={5} style={{
        position: "absolute",
        left: "4vw",
        top: "15.47037vh",
        width: "53.49375vw",
        height: "7.961111vh",
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
          fontSize: t.font("3.694444vw", "Risultati per il tabacco"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("3.694444vw", "Risultati per il tabacco"),
            fontFamily: "'Inter', sans-serif",
            fontWeight: "700",
            color: "#1F3D2B"
          }}>{t("Risultati per il tabacco")}</span></p></div><div key={6} style={{
        position: "absolute",
        left: "89.838542vw",
        top: "91.918519vh",
        width: "8.635417vw",
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
          fontSize: t.font("1.5vw", "Pagina 6"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.5vw", "Pagina 6"),
            fontFamily: "'Inter', sans-serif",
            color: "#94A3B8"
          }}>{t("Pagina 6")}</span></p></div><img key={7} src={img_1} alt="preencoded.png" style={{
        position: "absolute",
        left: "4.010417vw",
        top: "3.97963vh",
        width: "91.979167vw",
        height: "7.037037vh",
        boxSizing: "border-box",
        objectFit: "fill"
      }} /><div key={8} style={{
        position: "absolute",
        left: "3.348958vw",
        top: "29.342593vh",
        width: "39.757292vw",
        height: "43.337037vh",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "0vh 0vw 0vh 0vw",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.56",
          fontSize: t.font("2vw", "NDVI medio e NDVI ottimale della fase"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "NDVI medio e NDVI ottimale della fase"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("NDVI medio e NDVI ottimale della fase")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.56",
          marginTop: "1.6vh",
          fontSize: t.font("2vw", "Scostamento e variabilità delle cinque letture"),
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Scostamento e variabilità delle cinque letture"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Scostamento e variabilità delle cinque letture")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.56",
          marginTop: "1.6vh",
          fontSize: t.font("2vw", "Fabbisogno N derivato da resa, asportazione e densità"),
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Fabbisogno N derivato da resa, asportazione e densità"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Fabbisogno N derivato da resa, asportazione e densità")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.56",
          marginTop: "1.6vh",
          fontSize: t.font("2vw", "Dose nulla quando il NDVI è pari o superiore al riferimento"),
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Dose nulla quando il NDVI è pari o superiore al riferimento"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Dose nulla quando il NDVI è pari o superiore al riferimento")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.56",
          marginTop: "1.6vh",
          fontSize: t.font("2vw", "Dose proporzionale al deficit e mai superiore al residuo del piano"),
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Dose proporzionale al deficit e mai superiore al residuo del piano"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Dose proporzionale al deficit e mai superiore al residuo del piano")}</span></p></div><LocalizedFigure key={9} imageId={5} module="maps" source={img_2} alt="Google Shape;145;p8" style={{
        position: "absolute",
        left: "43.1vw",
        top: "29.34vh",
        width: "56.26vw",
        height: "58.3vh",
        boxSizing: "border-box",
        objectFit: "fill"
      }} /><img key={10} src={img_3} alt="Google Shape;146;p8" style={{
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
export default ImportedSlide6;
