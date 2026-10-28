import type { FC } from "react";
import { useDeckText } from "../../i18n";
import img_1 from "../../assets/imported-presentation/image_1.webp";
import img_2 from "../../assets/imported-presentation/image_4.webp";

const ImportedSlide2: FC = () => {
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
        left: "84.421875vw",
        top: "5.824074vh",
        width: "15.676042vw",
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
          fontSize: t.font("1.5vw", "PANORAMICA"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.5vw", "PANORAMICA"),
            fontFamily: "'Inter', sans-serif",
            fontWeight: "700",
            color: "#64748B"
          }}>{t("PANORAMICA")}</span></p></div><div key={5} style={{
        position: "absolute",
        left: "4vw",
        top: "16.014815vh",
        width: "68.748958vw",
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
          fontSize: t.font("4vw", "Dalla misura alla decisione"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("4vw", "Dalla misura alla decisione"),
            fontFamily: "'Inter', sans-serif",
            fontWeight: "700",
            color: "#1E3A5F"
          }}>{t("Dalla misura alla decisione")}</span></p></div><div key={6} style={{
        position: "absolute",
        left: "4vw",
        top: "29.661111vh",
        width: "45vw",
        height: "32.314815vh",
        boxSizing: "border-box",
        backgroundColor: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "9.6px",
        boxShadow: "0px 4.8px 14.4px rgba(30, 58, 95, 0.05)"
      }} /><div key={7} style={{
        position: "absolute",
        left: "6.051042vw",
        top: "32.324074vh",
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
            color: "#0D9488"
          }}>{t("RILIEVO")}</span></p></div><div key={8} style={{
        position: "absolute",
        left: "6.051042vw",
        top: "37.67037vh",
        width: "52.884375vw",
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
          fontSize: t.font("2vw", "Cinque letture NDVI per ogni osservazione"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Cinque letture NDVI per ogni osservazione"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Cinque letture NDVI per ogni osservazione")}</span></p></div><div key={9} style={{
        position: "absolute",
        left: "6.051042vw",
        top: "43.97037vh",
        width: "48.0875vw",
        height: "9.059259vh",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "0vh 0vw 0vh 0vw",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.62",
          fontSize: t.font("2vw", "Confronto con il riferimento fenologico"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Confronto con il riferimento fenologico"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Confronto con il riferimento fenologico")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.62",
          fontSize: t.font("2vw", "della coltura"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "della coltura"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("della coltura")}</span></p></div><div key={10} style={{
        position: "absolute",
        left: "51vw",
        top: "29.661111vh",
        width: "45vw",
        height: "32.314815vh",
        boxSizing: "border-box",
        backgroundColor: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "9.6px",
        boxShadow: "0px 4.8px 14.4px rgba(30, 58, 95, 0.05)"
      }} /><div key={11} style={{
        position: "absolute",
        left: "53.051042vw",
        top: "32.324074vh",
        width: "16.154167vw",
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
          fontSize: t.font("1.694444vw", "INDICAZIONE"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.694444vw", "INDICAZIONE"),
            fontFamily: "'Inter', sans-serif",
            fontWeight: "700",
            color: "#0D9488"
          }}>{t("INDICAZIONE")}</span></p></div><div key={12} style={{
        position: "absolute",
        left: "53.051042vw",
        top: "37.67037vh",
        width: "50.348958vw",
        height: "9.059259vh",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "0vh 0vw 0vh 0vw",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.62",
          fontSize: t.font("2vw", "Dose N proporzionale al deficit e limitata"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Dose N proporzionale al deficit e limitata"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Dose N proporzionale al deficit e limitata")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.62",
          fontSize: t.font("2vw", "dal piano"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "dal piano"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("dal piano")}</span></p></div><div key={13} style={{
        position: "absolute",
        left: "53.051042vw",
        top: "48.77037vh",
        width: "44.876042vw",
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
          fontSize: t.font("2vw", "Registrazione GPS e analisi spaziale"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Registrazione GPS e analisi spaziale"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Registrazione GPS e analisi spaziale")}</span></p></div><div key={14} style={{
        position: "absolute",
        left: "53.051042vw",
        top: "55.07037vh",
        width: "40.239583vw",
        height: "4.998148vh",
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
          fontSize: t.font("2vw", "Export tabellari, PDF e Geotiff e Shapefile"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Export tabellari, PDF e Geotiff e Shapefile"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Export tabellari, PDF e Geotiff e Shapefile")}</span></p></div><div key={15} style={{
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
          }}>{t("Taurus Agriculture Solution")}</span></p></div><div key={16} style={{
        position: "absolute",
        left: "89.852083vw",
        top: "91.918519vh",
        width: "8.617708vw",
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
          fontSize: t.font("1.5vw", "Pagina 2"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.5vw", "Pagina 2"),
            fontFamily: "'Inter', sans-serif",
            color: "#94A3B8"
          }}>{t("Pagina 2")}</span></p></div><img key={17} src={img_1} alt="preencoded.png" style={{
        position: "absolute",
        left: "4.010417vw",
        top: "3.97963vh",
        width: "91.979167vw",
        height: "7.037037vh",
        boxSizing: "border-box",
        objectFit: "fill"
      }} /><img key={18} src={img_2} alt="Google Shape;57;p2" style={{
        position: "absolute",
        left: "2.50625vw",
        top: "88.972222vh",
        width: "5.0375vw",
        height: "9.059259vh",
        boxSizing: "border-box",
        objectFit: "fill"
      }} />
</div>
);
};
export default ImportedSlide2;
