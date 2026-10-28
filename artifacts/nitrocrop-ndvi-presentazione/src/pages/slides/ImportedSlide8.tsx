import type { FC } from "react";
import { useDeckText } from "../../i18n";
import img_1 from "../../assets/imported-presentation/image_1.webp";
import img_2 from "../../assets/imported-presentation/image_4.webp";

const ImportedSlide8: FC = () => {
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
        width: "84.527083vw",
        height: "7.962963vh",
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
          fontSize: t.font("3.694444vw", "Fase fenologica e piano N del grano"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("3.694444vw", "Fase fenologica e piano N del grano"),
            fontFamily: "'Inter', sans-serif",
            fontWeight: "700",
            color: "#1F3D2B"
          }}>{t("Fase fenologica e piano N del grano")}</span></p></div><div key={6} style={{
        position: "absolute",
        left: "3.994792vw",
        top: "27.883333vh",
        width: "45.260417vw",
        height: "30.277778vh",
        boxSizing: "border-box",
        backgroundColor: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "9.6px",
        boxShadow: "0px 4.8px 14.4px rgba(30, 58, 95, 0.05)"
      }} /><div key={7} style={{
        position: "absolute",
        left: "6.051042vw",
        top: "30.525926vh",
        width: "9.788542vw",
        height: "3.703704vh",
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
          fontSize: t.font("1.694444vw", "RILIEVO"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.694444vw", "RILIEVO"),
            fontFamily: "'Inter', sans-serif",
            fontWeight: "700",
            color: "#A85E06"
          }}>{t("RILIEVO")}</span></p></div><div key={8} style={{
        position: "absolute",
        left: "6.051042vw",
        top: "35.872222vh",
        width: "41.123958vw",
        height: "9.059259vh",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "0vh 0vw 0vh 0vw",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.62",
          fontSize: t.font("2vw", "Il BBCH osservato è il riferimento"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Il BBCH osservato è il riferimento"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Il BBCH osservato è il riferimento")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.62",
          fontSize: t.font("2vw", "autorevole"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "autorevole"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("autorevole")}</span></p></div><div key={9} style={{
        position: "absolute",
        left: "6.051042vw",
        top: "46.472222vh",
        width: "50.265625vw",
        height: "9.059259vh",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "0vh 0vw 0vh 0vw",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.62",
          fontSize: t.font("2vw", "Il DAS locale è un supporto modificabile,"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Il DAS locale è un supporto modificabile,"),
            fontFamily: "'Inter', sans-serif",
            color: "#64748B"
          }}>{t("Il DAS locale è un supporto modificabile,")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.62",
          fontSize: t.font("2vw", "non sostituisce il rilievo"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "non sostituisce il rilievo"),
            fontFamily: "'Inter', sans-serif",
            color: "#64748B"
          }}>{t("non sostituisce il rilievo")}</span></p></div><div key={10} style={{
        position: "absolute",
        left: "50.744792vw",
        top: "27.883333vh",
        width: "45.260417vw",
        height: "30.277778vh",
        boxSizing: "border-box",
        backgroundColor: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "9.6px",
        boxShadow: "0px 4.8px 14.4px rgba(30, 58, 95, 0.05)"
      }} /><div key={11} style={{
        position: "absolute",
        left: "52.801042vw",
        top: "30.525926vh",
        width: "11.232292vw",
        height: "3.703704vh",
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
          fontSize: t.font("1.694444vw", "QUOTE N"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.694444vw", "QUOTE N"),
            fontFamily: "'Inter', sans-serif",
            fontWeight: "700",
            color: "#A85E06"
          }}>{t("QUOTE N")}</span></p></div><div key={12} style={{
        position: "absolute",
        left: "52.801042vw",
        top: "35.872222vh",
        width: "49.382292vw",
        height: "9.059259vh",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "0vh 0vw 0vh 0vw",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.62",
          fontSize: t.font("2vw", "Quote N distinte per emergenza,"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Quote N distinte per emergenza,"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Quote N distinte per emergenza,")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.62",
          fontSize: t.font("2vw", "accestimento, levata e foglia a bandiera"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "accestimento, levata e foglia a bandiera"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("accestimento, levata e foglia a bandiera")}</span></p></div><div key={13} style={{
        position: "absolute",
        left: "3.994792vw",
        top: "60.842593vh",
        width: "45.260417vw",
        height: "19.722222vh",
        boxSizing: "border-box",
        backgroundColor: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "9.6px",
        boxShadow: "0px 4.8px 14.4px rgba(30, 58, 95, 0.05)"
      }} /><div key={14} style={{
        position: "absolute",
        left: "6.051042vw",
        top: "63.509259vh",
        width: "10.858333vw",
        height: "3.703704vh",
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
          fontSize: t.font("1.694444vw", "DENSITÀ"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.694444vw", "DENSITÀ"),
            fontFamily: "'Inter', sans-serif",
            fontWeight: "700",
            color: "#A85E06"
          }}>{t("DENSITÀ")}</span></p></div><div key={15} style={{
        position: "absolute",
        left: "6.051042vw",
        top: "68.855556vh",
        width: "47.788542vw",
        height: "9.059259vh",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "0vh 0vw 0vh 0vw",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.62",
          fontSize: t.font("2vw", "Conversioni di densità basate sul PMG"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Conversioni di densità basate sul PMG"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Conversioni di densità basate sul PMG")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.62",
          fontSize: t.font("2vw", "derivato"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "derivato"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("derivato")}</span></p></div><div key={16} style={{
        position: "absolute",
        left: "50.744792vw",
        top: "60.842593vh",
        width: "45.260417vw",
        height: "19.722222vh",
        boxSizing: "border-box",
        backgroundColor: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "9.6px",
        boxShadow: "0px 4.8px 14.4px rgba(30, 58, 95, 0.05)"
      }} /><div key={17} style={{
        position: "absolute",
        left: "52.801042vw",
        top: "63.509259vh",
        width: "10.708333vw",
        height: "3.703704vh",
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
          fontSize: t.font("1.694444vw", "VARIETÀ"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.694444vw", "VARIETÀ"),
            fontFamily: "'Inter', sans-serif",
            fontWeight: "700",
            color: "#A85E06"
          }}>{t("VARIETÀ")}</span></p></div><div key={18} style={{
        position: "absolute",
        left: "52.801042vw",
        top: "68.855556vh",
        width: "49.947917vw",
        height: "9.059259vh",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "0vh 0vw 0vh 0vw",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.62",
          fontSize: t.font("2vw", "Intervalli varietali separati per semi/m² e"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Intervalli varietali separati per semi/m² e"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Intervalli varietali separati per semi/m² e")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.62",
          fontSize: t.font("2vw", "kg/ha"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "kg/ha"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("kg/ha")}</span></p></div><div key={19} style={{
        position: "absolute",
        left: "89.209375vw",
        top: "91.918519vh",
        width: "9.452083vw",
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
          fontSize: t.font("1.5vw", "Pagina 8"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.5vw", "Pagina 8"),
            fontFamily: "'Inter', sans-serif",
            color: "#94A3B8"
          }}>{t("Pagina 8")}</span></p></div><img key={20} src={img_1} alt="preencoded.png" style={{
        position: "absolute",
        left: "4.010417vw",
        top: "3.97963vh",
        width: "91.979167vw",
        height: "7.037037vh",
        boxSizing: "border-box",
        objectFit: "fill"
      }} /><img key={21} src={img_2} alt="Google Shape;191;p10" style={{
        position: "absolute",
        left: "2.50625vw",
        top: "88.972222vh",
        width: "5.0375vw",
        height: "9.059259vh",
        boxSizing: "border-box",
        objectFit: "fill"
      }} /><div key={22} style={{
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
export default ImportedSlide8;
