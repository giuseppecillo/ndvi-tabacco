import type { FC } from "react";
import { useDeckText } from "../../i18n";
import img_1 from "../../assets/imported-presentation/image_1.webp";
import img_2 from "../../assets/imported-presentation/image_4.webp";

const ImportedSlide4: FC = () => {
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
        left: "82.019792vw",
        top: "5.822222vh",
        width: "13.969792vw",
        height: "4.257407vh",
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
          fontSize: t.font("1.5vw", "RILIEVO IN CAMPO"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.5vw", "RILIEVO IN CAMPO"),
            fontFamily: "'Inter', sans-serif",
            fontWeight: "700",
            color: "#2A1A05"
          }}>{t("RILIEVO IN CAMPO")}</span></p></div><div key={5} style={{
        position: "absolute",
        left: "4vw",
        top: "21.985185vh",
        width: "56.602083vw",
        height: "8.611111vh",
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
          fontSize: t.font("4vw", "Rilievo NDVI in campo"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("4vw", "Rilievo NDVI in campo"),
            fontFamily: "'Inter', sans-serif",
            fontWeight: "700",
            color: "#1F3D2B"
          }}>{t("Rilievo NDVI in campo")}</span></p></div><div key={6} style={{
        position: "absolute",
        left: "4.003125vw",
        top: "35.485185vh",
        width: "1.09375vw",
        height: "1.944444vh",
        boxSizing: "border-box",
        backgroundColor: "#F09A1F",
        borderRadius: "2.4px"
      }} /><div key={7} style={{
        position: "absolute",
        left: "6.298958vw",
        top: "34.816667vh",
        width: "51.064583vw",
        height: "4.259259vh",
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
          fontSize: t.font("2vw", "Cinque misurazioni"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Cinque misurazioni"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Cinque misurazioni")}</span></p></div><div key={8} style={{
        position: "absolute",
        left: "4.003125vw",
        top: "42.285185vh",
        width: "1.09375vw",
        height: "1.944444vh",
        boxSizing: "border-box",
        backgroundColor: "#F09A1F",
        borderRadius: "2.4px"
      }} /><div key={9} style={{
        position: "absolute",
        left: "6.298958vw",
        top: "41.616667vh",
        width: "52.261458vw",
        height: "9.059259vh",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "0vh 0vw 0vh 0vw",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.62",
          fontSize: t.font("2vw", "Punti scelti per rappresentare la variabilità"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Punti scelti per rappresentare la variabilità"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Punti scelti per rappresentare la variabilità")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.62",
          fontSize: t.font("2vw", "dell’appezzamento"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "dell’appezzamento"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("dell’appezzamento")}</span></p></div><div key={10} style={{
        position: "absolute",
        left: "4.003125vw",
        top: "53.885185vh",
        width: "1.09375vw",
        height: "1.944444vh",
        boxSizing: "border-box",
        backgroundColor: "#F09A1F",
        borderRadius: "2.4px"
      }} /><div key={11} style={{
        position: "absolute",
        left: "6.298958vw",
        top: "53.216667vh",
        width: "48.629167vw",
        height: "9.059259vh",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "0vh 0vw 0vh 0vw",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.62",
          fontSize: t.font("2vw", "Media, varianza, deviazione standard e"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Media, varianza, deviazione standard e"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Media, varianza, deviazione standard e")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.62",
          fontSize: t.font("2vw", "coefficiente di variazione"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "coefficiente di variazione"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("coefficiente di variazione")}</span></p></div><div key={12} style={{
        position: "absolute",
        left: "4.003125vw",
        top: "65.485185vh",
        width: "1.09375vw",
        height: "1.944444vh",
        boxSizing: "border-box",
        backgroundColor: "#F09A1F",
        borderRadius: "2.4px"
      }} /><div key={13} style={{
        position: "absolute",
        left: "6.298958vw",
        top: "64.816667vh",
        width: "53.873958vw",
        height: "9.059259vh",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "0vh 0vw 0vh 0vw",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.62",
          fontSize: t.font("2vw", "Coordinate GPS acquisite automaticamente"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Coordinate GPS acquisite automaticamente"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Coordinate GPS acquisite automaticamente")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.62",
          fontSize: t.font("2vw", "da Tablet GNSS Rtk o da smartphone"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "da Tablet GNSS Rtk o da smartphone"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("da Tablet GNSS Rtk o da smartphone")}</span></p></div><div key={14} style={{
        position: "absolute",
        left: "4.003125vw",
        top: "77.085185vh",
        width: "1.09375vw",
        height: "1.944444vh",
        boxSizing: "border-box",
        backgroundColor: "#F09A1F",
        borderRadius: "2.4px"
      }} /><div key={15} style={{
        position: "absolute",
        left: "6.298958vw",
        top: "76.416667vh",
        width: "57.573958vw",
        height: "4.259259vh",
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
          fontSize: t.font("2vw", "Il salvataggio resta possibile anche senza coordinate GPS"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Il salvataggio resta possibile anche senza coordinate GPS"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Il salvataggio resta possibile anche senza coordinate GPS")}</span></p></div><div key={16} style={{
        position: "absolute",
        left: "56.408333vw",
        top: "27.944444vh",
        width: "39.583333vw",
        height: "46.111111vh",
        boxSizing: "border-box",
        backgroundColor: "#E8F5F2",
        borderRadius: "9.6px"
      }} /><div key={17} style={{
        position: "absolute",
        left: "58.398958vw",
        top: "32.97037vh",
        width: "7.216667vw",
        height: "17.222222vh",
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
          fontSize: t.font("8vw", "5"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("8vw", "5"),
            fontFamily: "'Inter', sans-serif",
            fontWeight: "700",
            color: "#A85E06"
          }}>{t("5")}</span></p></div><div key={18} style={{
        position: "absolute",
        left: "58.398958vw",
        top: "52.82037vh",
        width: "36.185417vw",
        height: "5vh",
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
          fontSize: t.font("2.305556vw", "letture per osservazione"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2.305556vw", "letture per osservazione"),
            fontFamily: "'Inter', sans-serif",
            fontWeight: "700",
            color: "#1E3A5F"
          }}>{t("letture per osservazione")}</span></p></div><div key={19} style={{
        position: "absolute",
        left: "58.398958vw",
        top: "60.861111vh",
        width: "46.179167vw",
        height: "9.592593vh",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "0vh 0vw 0vh 0vw",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.8",
          fontSize: t.font("2vw", "Rilievo puntuale, mappe e statistiche"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Rilievo puntuale, mappe e statistiche"),
            fontFamily: "'Inter', sans-serif",
            color: "#64748B"
          }}>{t("Rilievo puntuale, mappe e statistiche")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.8",
          fontSize: t.font("2vw", "immediate con posizione GPS."),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "immediate con posizione GPS."),
            fontFamily: "'Inter', sans-serif",
            color: "#64748B"
          }}>{t("immediate con posizione GPS.")}</span></p></div><div key={20} style={{
        position: "absolute",
        left: "89.876042vw",
        top: "91.918519vh",
        width: "8.586458vw",
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
          fontSize: t.font("1.5vw", "Pagina 4"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.5vw", "Pagina 4"),
            fontFamily: "'Inter', sans-serif",
            color: "#94A3B8"
          }}>{t("Pagina 4")}</span></p></div><img key={21} src={img_1} alt="preencoded.png" style={{
        position: "absolute",
        left: "4.010417vw",
        top: "3.927778vh",
        width: "80.429167vw",
        height: "6.153704vh",
        boxSizing: "border-box",
        objectFit: "fill"
      }} /><img key={22} src={img_2} alt="Google Shape;112;p5" style={{
        position: "absolute",
        left: "2.50625vw",
        top: "88.972222vh",
        width: "5.0375vw",
        height: "9.059259vh",
        boxSizing: "border-box",
        objectFit: "fill"
      }} /><div key={23} style={{
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
export default ImportedSlide4;
