import type { FC } from "react";
import { useDeckText } from "../../i18n";
import { LocalizedFigure } from "../../components/LocalizedFigure";
import img_1 from "../../assets/imported-presentation/image_1.webp";
import img_2 from "../../assets/imported-presentation/image_6.webp";
import img_3 from "../../assets/imported-presentation/image_4.webp";

const ImportedSlide7: FC = () => {
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
        left: "84.59375vw",
        top: "5.824074vh",
        width: "15.453125vw",
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
          fontSize: t.font("1.5vw", "GRANO DURO"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.5vw", "GRANO DURO"),
            fontFamily: "'Inter', sans-serif",
            fontWeight: "700",
            color: "#2A1A05"
          }}>{t("GRANO DURO")}</span></p></div><div key={5} style={{
        position: "absolute",
        left: "4vw",
        top: "15.922222vh",
        width: "59.878125vw",
        height: "18.372222vh",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "0vh 0vw 0vh 0vw",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.797",
          fontSize: t.font("3.805556vw", "Esempio operativo:grano duro"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("3.805556vw", "Esempio operativo:grano duro"),
            fontFamily: "'Inter', sans-serif",
            fontWeight: "700",
            color: "#1F3D2B"
          }}>{t("Esempio operativo:grano duro")}</span></p></div><div key={6} style={{
        position: "absolute",
        left: "89.836458vw",
        top: "91.918519vh",
        width: "8.6375vw",
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
          fontSize: t.font("1.5vw", "Pagina 7"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.5vw", "Pagina 7"),
            fontFamily: "'Inter', sans-serif",
            color: "#94A3B8"
          }}>{t("Pagina 7")}</span></p></div><img key={7} src={img_1} alt="preencoded.png" style={{
        position: "absolute",
        left: "4.010417vw",
        top: "3.97963vh",
        width: "91.979167vw",
        height: "7.037037vh",
        boxSizing: "border-box",
        objectFit: "fill"
      }} /><div key={8} style={{
        position: "absolute",
        left: "4.010417vw",
        top: "29.342593vh",
        width: "37.811458vw",
        height: "58.238889vh",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "0vh 0vw 0vh 0vw",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.56",
          fontSize: t.font("2vw", "Selezione della varietà e della resa attesa"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Selezione della varietà e della resa attesa"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Selezione della varietà e della resa attesa")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.56",
          marginTop: "1.6vh",
          fontSize: t.font("2vw", "Data di semina e giorni dalla semina (DAS)"),
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Data di semina e giorni dalla semina (DAS)"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Data di semina e giorni dalla semina (DAS)")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.56",
          marginTop: "1.6vh",
          fontSize: t.font("2vw", "Densità in semi/ha, semi/m² o kg/ha"),
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Densità in semi/ha, semi/m² o kg/ha"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Densità in semi/ha, semi/m² o kg/ha")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.56",
          marginTop: "1.6vh",
          fontSize: t.font("2vw", "Selezione e conferma del BBCH osservato"),
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Selezione e conferma del BBCH osservato"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Selezione e conferma del BBCH osservato")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.56",
          marginTop: "1.6vh",
          fontSize: t.font("2vw", "Piano N ripartito per fase fenologica"),
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Piano N ripartito per fase fenologica"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Piano N ripartito per fase fenologica")}</span></p></div><LocalizedFigure key={9} imageId={6} module="survey" source={img_2} alt="Google Shape;162;p9" style={{
        position: "absolute",
        left: "44.9vw",
        top: "25.43vh",
        width: "49.8vw",
        height: "63.5vh",
        boxSizing: "border-box",
        objectFit: "fill"
      }} /><img key={10} src={img_3} alt="Google Shape;163;p9" style={{
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
export default ImportedSlide7;
