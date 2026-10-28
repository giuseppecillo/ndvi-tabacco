import type { FC } from "react";
import { useDeckText } from "../../i18n";
import { LocalizedFigure } from "../../components/LocalizedFigure";
import img_1 from "../../assets/imported-presentation/image_1.webp";
import img_2 from "../../assets/imported-presentation/image_2.webp";
import img_3 from "../../assets/imported-presentation/image_3.webp";

const ImportedSlide1: FC = () => {
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
        left: "4vw",
        top: "29.016667vh",
        width: "43.944792vw",
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
          fontSize: t.font("2vw", "AGRICOLTURA DI PRECISIONE"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2vw", "AGRICOLTURA DI PRECISIONE"),
            fontFamily: "'Inter', sans-serif",
            fontWeight: "700",
            color: "#A85E06"
          }}>{t("AGRICOLTURA DI PRECISIONE")}</span></p></div><div key={5} style={{
        position: "absolute",
        left: "4vw",
        top: "34.183333vh",
        width: "54.007292vw",
        height: "12.222222vh",
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
          fontSize: t.font("5.694444vw", "NitroCrop NDVI"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("5.694444vw", "NitroCrop NDVI"),
            fontFamily: "'Inter', sans-serif",
            fontWeight: "700",
            color: "#1F3D2B"
          }}>{t("NitroCrop NDVI")}</span></p></div><div key={6} style={{
        position: "absolute",
        left: "4vw",
        top: "48.092593vh",
        width: "62.770833vw",
        height: "9.762963vh",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "0vh 0vw 0vh 0vw",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.682",
          fontSize: t.font("2.097222vw", "Supporto operativo alla fertilizzazione azotata di"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2.097222vw", "Supporto operativo alla fertilizzazione azotata di"),
            fontFamily: "'Inter', sans-serif",
            color: "#475569"
          }}>{t("Supporto operativo alla fertilizzazione azotata di")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.682",
          fontSize: t.font("2.097222vw", "tabacco e grano duro"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2.097222vw", "tabacco e grano duro"),
            fontFamily: "'Inter', sans-serif",
            color: "#475569"
          }}>{t("tabacco e grano duro")}</span></p></div><div key={7} style={{
        position: "absolute",
        left: "4.003125vw",
        top: "62.253704vh",
        width: "16.927083vw",
        height: "11.203704vh",
        boxSizing: "border-box",
        backgroundColor: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "7.68px"
      }} /><div key={8} style={{
        position: "absolute",
        left: "5.251042vw",
        top: "64.227778vh",
        width: "13.801042vw",
        height: "7.238889vh",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "0vh 0vw 0vh 0vw",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.8",
          fontSize: t.font("1.5vw", "Rilievi NDVI in"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.5vw", "Rilievi NDVI in"),
            fontFamily: "'Inter', sans-serif",
            fontWeight: "700",
            color: "#1E3A5F"
          }}>{t("Rilievi NDVI in")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.8",
          fontSize: t.font("1.5vw", "campo"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.5vw", "campo"),
            fontFamily: "'Inter', sans-serif",
            fontWeight: "700",
            color: "#1E3A5F"
          }}>{t("campo")}</span></p></div><div key={9} style={{
        position: "absolute",
        left: "21.936458vw",
        top: "62.253704vh",
        width: "16.927083vw",
        height: "11.203704vh",
        boxSizing: "border-box",
        backgroundColor: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "7.68px"
      }} /><div key={10} style={{
        position: "absolute",
        left: "23.184375vw",
        top: "64.227778vh",
        width: "19.002083vw",
        height: "7.238889vh",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "0vh 0vw 0vh 0vw",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.8",
          fontSize: t.font("1.5vw", "Indicazioni di azoto"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.5vw", "Indicazioni di azoto"),
            fontFamily: "'Inter', sans-serif",
            fontWeight: "700",
            color: "#1E3A5F"
          }}>{t("Indicazioni di azoto")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.8",
          fontSize: t.font("1.5vw", "georiferite"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.5vw", "georiferite"),
            fontFamily: "'Inter', sans-serif",
            fontWeight: "700",
            color: "#1E3A5F"
          }}>{t("georiferite")}</span></p></div><div key={11} style={{
        position: "absolute",
        left: "39.869792vw",
        top: "62.253704vh",
        width: "16.927083vw",
        height: "11.203704vh",
        boxSizing: "border-box",
        backgroundColor: "#F09A1F",
        borderRadius: "7.68px"
      }} /><div key={12} style={{
        position: "absolute",
        left: "40.513542vw",
        top: "64.135185vh",
        width: "18.917708vw",
        height: "7.238889vh",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        padding: "0vh 0vw 0vh 0vw",
        wordWrap: "break-word"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.8",
          fontSize: t.font("1.5vw", "Mappe e stima"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.5vw", "Mappe e stima"),
            fontFamily: "'Inter', sans-serif",
            fontWeight: "700",
            color: "#FFFFFF"
          }}>{t("Mappe e stima")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "1.8",
          fontSize: t.font("1.5vw", "del risparmio di azoto"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.5vw", "del risparmio di azoto"),
            fontFamily: "'Inter', sans-serif",
            fontWeight: "700",
            color: "#FFFFFF"
          }}>{t("del risparmio di azoto")}</span></p></div><div key={13} style={{
        position: "absolute",
        left: "60.795833vw",
        top: "14.981481vh",
        width: "35.208333vw",
        height: "72.037037vh",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        border: "1px solid #E2E8F0",
        borderRadius: "11.52px",
        boxShadow: "0px 4.8px 14.4px rgba(30, 58, 95, 0.08)"
      }} /><div key={14} style={{
        position: "absolute",
        left: "4vw",
        top: "91.918519vh",
        width: "25.640625vw",
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
          fontSize: t.font("1.5vw", "Taurus Agriculture Solution"),
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.5vw", "Taurus Agriculture Solution"),
            fontFamily: "'Inter', sans-serif",
            color: "#94A3B8"
          }}>{t("Taurus Agriculture Solution")}</span></p></div><img key={15} src={img_1} alt="preencoded.png" style={{
        position: "absolute",
        left: "4.010417vw",
        top: "3.97963vh",
        width: "75.985417vw",
        height: "7.948148vh",
        boxSizing: "border-box",
        objectFit: "fill"
      }} /><div key={16} style={{
        position: "absolute",
        left: "4.010417vw",
        top: "91.001852vh",
        width: "23.5625vw",
        height: "4.259259vh",
        boxSizing: "border-box",
        overflow: "hidden"
      }}><img src={img_2} alt="preencoded.png" style={{
          position: "absolute",
          left: "0vw",
          top: "0vh",
          width: "91.980208vw",
          height: "5vh",
          maxWidth: "none"
        }} /></div><LocalizedFigure key={17} imageId={3} source={img_3} alt="Google Shape;33;p1" style={{
        position: "absolute",
        left: "60.795833vw",
        top: "17.5vh",
        width: "35.711458vw",
        height: "70.5vh",
        boxSizing: "border-box",
        objectFit: "fill"
      }} />
</div>
);
};
export default ImportedSlide1;
