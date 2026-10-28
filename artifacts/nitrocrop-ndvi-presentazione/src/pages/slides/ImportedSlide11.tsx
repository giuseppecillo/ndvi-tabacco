import type { FC } from "react";
import { useDeckText } from "../../i18n";
import { LocalizedFigure } from "../../components/LocalizedFigure";
import img_1 from "../../assets/imported-presentation/image_1.webp";
import img_2 from "../../assets/imported-presentation/image_9.webp";
import img_3 from "../../assets/imported-presentation/image_4.webp";

const ImportedSlide11: FC = () => {
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
        left: "84.26875vw",
        top: "5.824074vh",
        width: "15.876042vw",
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
          fontSize: t.font("1.5vw", "EFFICIENZA N"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.5vw", "EFFICIENZA N"),
            fontFamily: "'Inter', sans-serif",
            fontWeight: "700",
            color: "#64748B"
          }}>{t("EFFICIENZA N")}</span></p></div><div key={5} style={{
        position: "absolute",
        left: "4vw",
        top: "15.831481vh",
        width: "74.859375vw",
        height: "17.375926vh",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "0vh 0vw 0vh 0vw",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.801",
          fontSize: t.font("3.597222vw", "Risparmio di azoto sul poligono"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("3.597222vw", "Risparmio di azoto sul poligono"),
            fontFamily: "'Inter', sans-serif",
            fontWeight: "700",
            color: "#1E3A5F"
          }}>{t("Risparmio di azoto sul poligono")}</span></p></div><div key={6} style={{
        position: "absolute",
        left: "89.226042vw",
        top: "91.918519vh",
        width: "9.43125vw",
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
          fontSize: t.font("1.5vw", "Pagina 11"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.5vw", "Pagina 11"),
            fontFamily: "'Inter', sans-serif",
            color: "#94A3B8"
          }}>{t("Pagina 11")}</span></p></div><img key={7} src={img_1} alt="preencoded.png" style={{
        position: "absolute",
        left: "4.010417vw",
        top: "3.97963vh",
        width: "91.979167vw",
        height: "7.037037vh",
        boxSizing: "border-box",
        objectFit: "fill"
      }} /><div key={8} style={{
        position: "absolute",
        left: "4vw",
        top: "30.016667vh",
        width: "40.052083vw",
        height: "52.685185vh",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "0vh 0vw 0vh 0vw",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.56",
          fontSize: t.font("2vw", "Piano: media interpolata dei Kg Azoto Totale"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Piano: media interpolata dei Kg Azoto Totale"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Piano: media interpolata dei Kg Azoto Totale")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.56",
          marginTop: "1.301235vh",
          fontSize: t.font("2vw", "Uso effettivo stimato: azoto già distribuito + dose IDW"),
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Uso effettivo stimato: azoto già distribuito + dose IDW"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Uso effettivo stimato: azoto già distribuito + dose IDW")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.56",
          marginTop: "1.301235vh",
          fontSize: t.font("2vw", "Risparmio = piano − uso effettivo stimato"),
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Risparmio = piano − uso effettivo stimato"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Risparmio = piano − uso effettivo stimato")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.56",
          marginTop: "1.301235vh",
          fontSize: t.font("2vw", "Risparmio % = risparmio / piano × 100"),
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Risparmio % = risparmio / piano × 100"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Risparmio % = risparmio / piano × 100")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.56",
          marginTop: "1.301235vh",
          fontSize: t.font("2vw", "Totali = valore per ettaro × superficie del poligono"),
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Totali = valore per ettaro × superficie del poligono"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Totali = valore per ettaro × superficie del poligono")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.56",
          marginTop: "1.301235vh",
          fontSize: t.font("2vw", ""),
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "")
          }}>{t("")}</span></p></div><LocalizedFigure key={9} imageId={9} source={img_2} alt="Google Shape;241;p16" style={{
        position: "absolute",
        left: "47.335417vw",
        top: "29.142593vh",
        width: "51.321875vw",
        height: "44.65vh",
        boxSizing: "border-box",
        objectFit: "fill"
      }} /><img key={10} src={img_3} alt="Google Shape;242;p16" style={{
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
          }}>{t("Taurus Agriculture Solution")}</span></p></div><div role="note" style={{ position: "absolute", left: "4vw", top: "78vh", width: "92vw", padding: "1vh 1vw", boxSizing: "border-box", borderRadius: "4px", background: "#fff5dc", color: "#775313", lineHeight: 1.35, fontSize: t.font("1.35vw", "Nota: i valori numerici della schermata originale non sono coerenti tra loro. Figura mantenuta dall’allegato; per i calcoli usare le formule e i dati aggiornati dell’app.") }}>{t("Nota: i valori numerici della schermata originale non sono coerenti tra loro. Figura mantenuta dall’allegato; per i calcoli usare le formule e i dati aggiornati dell’app.")}</div>
</div>
);
};
export default ImportedSlide11;
