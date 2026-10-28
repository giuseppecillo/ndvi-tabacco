import type { FC } from "react";
import { useDeckText } from "../../i18n";
import { LocalizedFigure } from "../../components/LocalizedFigure";
import img_1 from "../../assets/imported-presentation/image_1.webp";
import img_2 from "../../assets/imported-presentation/image_3.webp";
import img_3 from "../../assets/imported-presentation/image_4.webp";

const ImportedSlide5: FC = () => {
const t = useDeckText();
return (
<div className="w-screen h-screen overflow-hidden relative" style={{ backgroundColor: "#ffffff" }}>
<div key={0} style={{
        position: "absolute",
        left: "0vw",
        top: "1.009259vh",
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
        top: "12.327778vh",
        width: "74.032292vw",
        height: "18.372222vh",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "0vh 0vw 0vh 0vw",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.797",
          fontSize: t.font("3.805556vw", "Esempio operativo: tabacco"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("3.805556vw", "Esempio operativo: tabacco"),
            fontFamily: "'Inter', sans-serif",
            fontWeight: "700",
            color: "#1F3D2B"
          }}>{t("Esempio operativo: tabacco")}</span></p></div><div key={6} style={{
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
          fontSize: t.font("1.5vw", "Pagina 5"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.5vw", "Pagina 5"),
            fontFamily: "'Inter', sans-serif",
            color: "#94A3B8"
          }}>{t("Pagina 5")}</span></p></div><img key={7} src={img_1} alt="preencoded.png" style={{
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
        top: "28.262963vh",
        width: "40.804167vw",
        height: "53.211111vh",
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
          marginTop: "1.498765vh",
          fontSize: t.font("2vw", "Data di trapianto e giorni dal trapianto (DAT)"),
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Data di trapianto e giorni dal trapianto (DAT)"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Data di trapianto e giorni dal trapianto (DAT)")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.56",
          marginTop: "1.498765vh",
          fontSize: t.font("2vw", "Età della piantina"),
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Età della piantina"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Età della piantina")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.56",
          marginTop: "1.498765vh",
          fontSize: t.font("2vw", "Densità in piante/ha o"),
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Densità in piante/ha o"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Densità in piante/ha o")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.56",
          marginTop: "1.498765vh",
          fontSize: t.font("2vw", "Piano azotato varietale corretto per resa e densità"),
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "Piano azotato varietale corretto per resa e densità"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t("Piano azotato varietale corretto per resa e densità")}</span></p></div><div key={9} style={{
        position: "absolute",
        left: "48.398958vw",
        top: "21.242593vh",
        width: "44.484375vw",
        height: "69.759259vh",
        boxSizing: "border-box",
        overflow: "hidden"
      }}><LocalizedFigure imageId={3} chrome={false} source={img_2} alt="Google Shape;128;p6" style={{
          position: "absolute",
          left: "0vw",
          top: "-30.08vh",
          width: "44.484375vw",
          height: "95.674074vh",
          maxWidth: "none"
        }} /></div><img key={10} src={img_3} alt="Google Shape;129;p6" style={{
        position: "absolute",
        left: "4.010417vw",
        top: "91.972222vh",
        width: "5.0375vw",
        height: "9.059259vh",
        boxSizing: "border-box",
        objectFit: "fill"
      }} /><div key={11} style={{
        position: "absolute",
        left: "9.986458vw",
        top: "94.881481vh",
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
export default ImportedSlide5;
