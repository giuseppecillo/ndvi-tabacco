import type { FC } from "react";
import { useDeckText } from "../../i18n";
import { LocalizedFigure } from "../../components/LocalizedFigure";
import img_1 from "../../assets/imported-presentation/image_1.webp";
import img_2 from "../../assets/imported-presentation/image_7.webp";
import img_3 from "../../assets/imported-presentation/image_4.webp";

const ImportedSlide9: FC = () => {
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
            color: "#64748B"
          }}>{t("GRANO DURO")}</span></p></div><div key={5} style={{
        position: "absolute",
        left: "4vw",
        top: "12.818519vh",
        width: "55.93125vw",
        height: "17.82963vh",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "0vh 0vw 0vh 0vw",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.803",
          fontSize: t.font("3.694444vw", "Risultati per il grano duro"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("3.694444vw", "Risultati per il grano duro"),
            fontFamily: "'Inter', sans-serif",
            fontWeight: "700",
            color: "#1E3A5F"
          }}>{t("Risultati per il grano duro")}</span></p></div><div key={6} style={{
        position: "absolute",
        left: "89.545833vw",
        top: "91.918519vh",
        width: "9.015625vw",
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
          fontSize: t.font("1.5vw", "Pagina 9"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.5vw", "Pagina 9"),
            fontFamily: "'Inter', sans-serif",
            color: "#94A3B8"
          }}>{t("Pagina 9")}</span></p></div><img key={7} src={img_1} alt="preencoded.png" style={{
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
        top: "29.542593vh",
        width: "44.478125vw",
        height: "34.166667vh",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "0vh 0vw 0vh 0vw",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.56",
          fontSize: t.font("2vw", "Profilo NDVI coerente con BBCH o DAS"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Profilo NDVI coerente con BBCH o DAS"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Profilo NDVI coerente con BBCH o DAS")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.56",
          marginTop: "1.6vh",
          fontSize: t.font("2vw", "Fabbisogno totale legato alla resa obiettivo"),
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Fabbisogno totale legato alla resa obiettivo"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Fabbisogno totale legato alla resa obiettivo")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.56",
          marginTop: "1.6vh",
          fontSize: t.font("2vw", "Quota N della fase corretta per densità"),
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Quota N della fase corretta per densità"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Quota N della fase corretta per densità")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.56",
          marginTop: "1.6vh",
          fontSize: t.font("2vw", "Indicazione proporzionale al deficit NDVI"),
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Indicazione proporzionale al deficit NDVI"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Indicazione proporzionale al deficit NDVI")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.56",
          marginTop: "1.6vh",
          fontSize: t.font("2vw", "Limite al residuo disponibile del piano"),
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Limite al residuo disponibile del piano"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Limite al residuo disponibile del piano")}</span></p></div><LocalizedFigure key={9} imageId={7} source={img_2} alt="Google Shape;207;p11" style={{
        position: "absolute",
        left: "56.802083vw",
        top: "10.131481vh",
        width: "37.984375vw",
        height: "80.718519vh",
        boxSizing: "border-box",
        objectFit: "fill"
      }} /><img key={10} src={img_3} alt="Google Shape;208;p11" style={{
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
export default ImportedSlide9;
