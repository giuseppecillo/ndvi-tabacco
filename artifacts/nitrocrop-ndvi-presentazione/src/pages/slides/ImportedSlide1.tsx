import type { FC } from "react";
import { useDeckText } from "../../i18n";
import { useFitText } from "../../hooks/useFitText";
import { FigureLabels } from "../../components/FigureLabels";
import img_1 from "../../assets/uploaded-presentation/image_1.jpg";
import img_2 from "../../assets/uploaded-presentation/image_2.png";
import img_3 from "../../assets/uploaded-presentation/image_3.png";
import img_4 from "../../assets/uploaded-presentation/image_4.jpg";
import img_5 from "../../assets/uploaded-presentation/image_5.jpg";
import img_6 from "../../assets/uploaded-presentation/image_6.png";
import svg_image1 from "../../assets/uploaded-presentation/svg/image1.png";
import svg_image2 from "../../assets/uploaded-presentation/svg/image2.png";
import svg_image4 from "../../assets/uploaded-presentation/svg/image4.png";
import svg_image7 from "../../assets/uploaded-presentation/svg/image7.png";
const ImportedSlide1: FC = () => {
const t = useDeckText();
const fitRef = useFitText<HTMLDivElement>();
return (
<div ref={fitRef} data-slide-root className="w-screen h-screen overflow-hidden relative" style={{ backgroundColor: "#FAFBFC", color: "#000000" }}>
<svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true"><defs><clipPath id="s1c0" clipPathUnits="objectBoundingBox"><path d="M 0.9559 0.0189 C 0.9581 0.0189 0.9601 0.0192 0.9621 0.0199 C 0.9641 0.0207 0.9658 0.0217 0.9673 0.023 C 0.9688 0.0243 0.97 0.0258 0.9708 0.0276 C 0.9716 0.0293 0.972 0.0311 0.972 0.033 L 0.972 0.9556 C 0.972 0.9575 0.9716 0.9593 0.9708 0.961 C 0.97 0.9627 0.9688 0.9643 0.9673 0.9656 C 0.9658 0.9669 0.9641 0.9679 0.9621 0.9686 C 0.9601 0.9693 0.9581 0.9697 0.9559 0.9697 L 0.0442 0.9697 C 0.042 0.9697 0.04 0.9693 0.038 0.9686 C 0.0361 0.9679 0.0343 0.9669 0.0328 0.9656 C 0.0313 0.9643 0.0301 0.9627 0.0293 0.961 C 0.0285 0.9593 0.0281 0.9575 0.0281 0.9556 L 0.0281 0.0329 C 0.0281 0.0311 0.0285 0.0293 0.0293 0.0276 C 0.0301 0.0258 0.0313 0.0243 0.0328 0.023 C 0.0343 0.0217 0.0361 0.0207 0.038 0.0199 C 0.04 0.0192 0.042 0.0189 0.0442 0.0189 Z M 0 0 L 0 1 L 1 1 L 1 0 Z" /></clipPath><clipPath id="s1c1" clipPathUnits="objectBoundingBox"><path d="M 0.1916 0 C 0.1664 0 0.142 0.0049 0.1187 0.0146 C 0.0953 0.0244 0.0744 0.0382 0.0563 0.0563 C 0.0382 0.0744 0.0244 0.0951 0.0146 0.1187 C 0.0049 0.1423 0 0.1667 0 0.1921 L 0 0.8081 C 0 0.8335 0.0049 0.8579 0.0146 0.8813 C 0.0244 0.9047 0.0382 0.9256 0.0563 0.9437 C 0.0744 0.9618 0.0951 0.9756 0.1187 0.9854 C 0.1422 0.9951 0.1668 1 0.1922 1 L 0.8078 1 C 0.8332 1 0.8578 0.9951 0.8813 0.9854 C 0.9049 0.9756 0.9256 0.9618 0.9437 0.9437 C 0.9618 0.9256 0.9756 0.9049 0.9854 0.8813 C 0.9951 0.8577 1 0.8331 1 0.8077 L 1 0.1923 C 1 0.1669 0.9951 0.1423 0.9854 0.1187 C 0.9756 0.0951 0.9618 0.0744 0.9437 0.0563 C 0.9256 0.0382 0.9049 0.0244 0.8813 0.0146 C 0.8578 0.0049 0.8336 0 0.8082 0 Z" /></clipPath><clipPath id="s1c2" clipPathUnits="objectBoundingBox"><path d="M 0.1917 0 C 0.1665 0 0.1421 0.0049 0.1187 0.0146 C 0.0953 0.0244 0.0744 0.0382 0.0563 0.0563 C 0.0382 0.0744 0.0244 0.0951 0.0146 0.1187 C 0.0049 0.1422 0 0.1666 0 0.1918 L 0 0.8082 C 0 0.8336 0.0049 0.858 0.0146 0.8813 C 0.0244 0.9047 0.0382 0.9256 0.0563 0.9437 C 0.0744 0.9618 0.0951 0.9756 0.1187 0.9854 C 0.1423 0.9951 0.1669 1 0.1923 1 L 0.8077 1 C 0.8331 1 0.8577 0.9951 0.8813 0.9854 C 0.9049 0.9756 0.9256 0.9618 0.9437 0.9437 C 0.9618 0.9256 0.9756 0.9049 0.9854 0.8813 C 0.9951 0.858 1 0.8336 1 0.8084 L 1 0.1918 C 1 0.1664 0.9951 0.142 0.9854 0.1187 C 0.9756 0.0953 0.9618 0.0744 0.9437 0.0563 C 0.9256 0.0382 0.9051 0.0244 0.8815 0.0146 C 0.8579 0.0049 0.8337 0 0.8083 0 Z" /></clipPath></defs></svg><div key={0} style={{
        position: "absolute",
        left: "3.7193vw",
        top: "66.5565vh",
        width: "17.6214vw",
        height: "12.438vh",
        boxSizing: "border-box",
        backgroundColor: "#00B050"
      }} /><div key={1} style={{
        position: "absolute",
        left: "21.6359vw",
        top: "66.5565vh",
        width: "17.6214vw",
        height: "12.438vh",
        boxSizing: "border-box",
        backgroundColor: "#00B050"
      }} /><div key={2} style={{
        position: "absolute",
        left: "-0.3474vw",
        top: "1.8824vh",
        width: "100.6943vw",
        height: "9.8454vh",
        boxSizing: "border-box",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
          backgroundImage: `url(${svg_image1})`
        }} /><div key={3} style={{
        position: "absolute",
        left: "39.9521vw",
        top: "67.1741vh",
        width: "16.9271vw",
        height: "11.2037vh",
        boxSizing: "border-box",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
          backgroundImage: `url(${svg_image2})`
        }} /><div key={4} style={{
        position: "absolute",
        left: "59.7333vw",
        top: "13.5704vh",
        width: "37.3vw",
        height: "75.763vh"
      }}><div key={0} style={{
          position: "absolute",
          left: "0vw",
          top: "0vh",
          width: "37.3vw",
          height: "75.763vh",
          boxSizing: "border-box",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          clipPath: "url(#s1c0)",
          backgroundImage: `url(${img_1})`
        }} /></div><div key={5} style={{
        position: "absolute",
        left: "59.3859vw",
        top: "12.9528vh",
        width: "37.9943vw",
        height: "76.9972vh",
        boxSizing: "border-box",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
          backgroundImage: `url(${svg_image4})`
        }} /><div key={6} style={{
        position: "absolute",
        left: "4.0104vw",
        top: "3.9815vh",
        width: "75.9896vw",
        height: "7.963vh"
      }}><div key={0} style={{
          position: "absolute",
          left: "0vw",
          top: "0vh",
          width: "75.9896vw",
          height: "7.963vh",
          boxSizing: "border-box",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundImage: `url(${img_2})`
        }} /></div><div key={7} style={{
        position: "absolute",
        left: "4.0104vw",
        top: "91.0185vh",
        width: "23.5417vw",
        height: "4.2593vh"
      }}><div key={0} style={{
          position: "absolute",
          left: "0vw",
          top: "0vh",
          width: "23.5417vw",
          height: "4.2593vh",
          boxSizing: "border-box",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundImage: `url(${img_3})`
        }} /></div><div key={8} style={{
        position: "absolute",
        left: "60.4339vw",
        top: "18.3639vh",
        width: "36.4234vw",
        height: "64.3824vh",
        boxSizing: "border-box",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
          backgroundImage: `url(${svg_image7})`
        }} /><div key={9} style={{
        position: "absolute",
        left: "67.9901vw",
        top: "25.1148vh",
        width: "2.563vw",
        height: "4.5565vh"
      }}><div key={0} style={{
          position: "absolute",
          left: "0vw",
          top: "0vh",
          width: "2.563vw",
          height: "4.5556vh",
          boxSizing: "border-box",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          clipPath: "url(#s1c1)",
          backgroundImage: `url(${img_4})`
        }} /></div><div key={10} style={{
        position: "absolute",
        left: "93.0281vw",
        top: "25.1148vh",
        width: "2.563vw",
        height: "4.5565vh"
      }}><div key={0} style={{
          position: "absolute",
          left: "0vw",
          top: "0vh",
          width: "2.5625vw",
          height: "4.5565vh",
          boxSizing: "border-box",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          clipPath: "url(#s1c2)",
          backgroundImage: `url(${img_5})`
        }} /></div><div key={11} style={{
        position: "absolute",
        left: "67.3vw",
        top: "31.4241vh",
        width: "28.9807vw",
        height: "49.9556vh"
      }}><div key={0} style={{
          position: "absolute",
          left: "0vw",
          top: "0vh",
          width: "28.9807vw",
          height: "49.9556vh",
          boxSizing: "border-box",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundImage: `url(${img_6})`
        }}><FigureLabels imageId={3} /></div></div><div key={12} style={{
        position: "absolute",
        left: "5.3068vw",
        top: "69.1333vh",
        width: "10.337vw",
        height: "9.1519vh",
        boxSizing: "border-box",
        padding: "0vh 0vw 0vh 0vw",
        overflowWrap: "normal"
      }}><p style={{
          textAlign: "left",
          lineHeight: "2.7083vw",
          fontSize: "1.5vw",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.5vw", "Rilievi NDVI in campo"),
            fontFamily: "'Inter', sans-serif",
            color: "#ffffff"
          }}>{t("Rilievi NDVI in campo")}</span></p></div><div key={13} style={{
        position: "absolute",
        left: "6.999vw",
        top: "5.7556vh",
        width: "11.4281vw",
        height: "3.2565vh",
        boxSizing: "border-box",
        padding: "0vh 0vw 0vh 0vw",
        overflowWrap: "normal"
      }}><p style={{
          textAlign: "left",
          lineHeight: "2.1vw",
          fontSize: "1.5vw",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.5vw", "NitroCrop NDVI"),
            fontFamily: "'Inter', sans-serif",
            color: "#2A1A05"
          }}>{t("NitroCrop NDVI")}</span></p></div><div key={14} style={{
        position: "absolute",
        left: "4vw",
        top: "91.7741vh",
        width: "19.6281vw",
        height: "3.2565vh",
        boxSizing: "border-box",
        padding: "0vh 0vw 0vh 0vw",
        overflowWrap: "normal"
      }}><p style={{
          textAlign: "left",
          lineHeight: "2.1vw",
          fontSize: "1.5vw",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.5vw", "Taurus Agriculture Solution"),
            fontFamily: "'Inter', sans-serif",
            color: "#94A3B8"
          }}>{t("Taurus Agriculture Solution")}</span></p></div><div key={15} style={{
        position: "absolute",
        left: "23.2396vw",
        top: "69.1333vh",
        width: "14.4193vw",
        height: "9.1519vh",
        boxSizing: "border-box",
        backgroundColor: "#00B050",
        padding: "0vh 0vw 0vh 0vw",
        overflowWrap: "normal"
      }}><p style={{
          textAlign: "left",
          lineHeight: "2.7083vw",
          fontSize: "1.5vw",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.5vw", "Indicazioni di azoto georiferite"),
            fontFamily: "'Inter', sans-serif",
            color: "#ffffff"
          }}>{t.part("Indicazioni di azoto georiferite", 0, "Indicazioni")}</span><span style={{
            fontSize: t.font("1.5vw", "Indicazioni di azoto georiferite"),
            fontFamily: "'Inter', sans-serif",
            color: "#ffffff"
          }}>{t.part("Indicazioni di azoto georiferite", 1, " di ")}</span><span style={{
            fontSize: t.font("1.5vw", "Indicazioni di azoto georiferite"),
            fontFamily: "'Inter', sans-serif",
            color: "#ffffff"
          }}>{t.part("Indicazioni di azoto georiferite", 2, "azoto")}</span><span style={{
            fontSize: t.font("1.5vw", "Indicazioni di azoto georiferite"),
            fontFamily: "'Inter', sans-serif",
            color: "#ffffff"
          }}>{t.part("Indicazioni di azoto georiferite", 3, " ")}</span><span style={{
            fontSize: t.font("1.5vw", "Indicazioni di azoto georiferite"),
            fontFamily: "'Inter', sans-serif",
            color: "#ffffff"
          }}>{t.part("Indicazioni di azoto georiferite", 4, "georiferite")}</span></p></div><div key={16} style={{
        position: "absolute",
        left: "40.5693vw",
        top: "69.0407vh",
        width: "16.0635vw",
        height: "8.9046vh",
        boxSizing: "border-box",
        padding: "0vh 0vw 0vh 0vw",
        overflowWrap: "normal"
      }}><p style={{
          textAlign: "left",
          lineHeight: "2.7083vw",
          fontSize: "1.5vw",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.5vw", "Mappe e stima"),
            fontFamily: "'Inter', sans-serif",
            color: "#FFFFFF"
          }}>{t("Mappe e stima")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "2.7083vw",
          fontSize: "1.5vw",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.5vw", "del risparmio di azoto"),
            fontFamily: "'Inter', sans-serif",
            color: "#FFFFFF"
          }}>{t("del risparmio di azoto")}</span></p></div><div key={17} style={{
        position: "absolute",
        left: "4.9115vw",
        top: "24.9148vh",
        width: "43.3865vw",
        height: "13.1352vh",
        boxSizing: "border-box",
        padding: "0vh 0vw 0vh 0vw",
        overflowWrap: "normal"
      }}><p style={{
          textAlign: "left",
          lineHeight: "2.2854vw",
          fontSize: "1.9993vw",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.9993vw", "AGRICOLTURA DI PRECISIONE"),
            fontFamily: "'Inter', sans-serif",
            color: "#A85E06"
          }}>{t("AGRICOLTURA DI PRECISIONE")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "6.5083vw",
          fontSize: "5.6937vw",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("5.6937vw", "NitroCrop NDVI"),
            fontFamily: "'Inter', sans-serif",
            color: "#1F3D2B"
          }}>{t.part("NitroCrop NDVI", 0, "NitroCrop")}</span><span style={{
            fontSize: t.font("5.6937vw", "NitroCrop NDVI"),
            fontFamily: "'Inter', sans-serif",
            color: "#1F3D2B"
          }}>{t.part("NitroCrop NDVI", 1, " NDVI")}</span></p></div><div key={18} style={{
        position: "absolute",
        left: "23.0594vw",
        top: "48.9509vh",
        width: "0.6016vw",
        height: "4.4611vh",
        boxSizing: "border-box"
      }} /><div key={19} style={{
        position: "absolute",
        left: "4vw",
        top: "48.9509vh",
        width: "48.9167vw",
        height: "4.8269vh",
        boxSizing: "border-box",
        padding: "0vh 0vw 0vh 0vw",
        overflowWrap: "normal"
      }}><p style={{
          textAlign: "left",
          lineHeight: "2.9354vw",
          fontSize: "2.0965vw",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2.0965vw", "Supporto operativo alla fertilizzazione azotata di"),
            fontFamily: "'Inter', sans-serif",
            color: "#475569"
          }}>{t.part("Supporto operativo alla fertilizzazione azotata di", 0, "Supporto")}</span><span style={{
            fontSize: t.font("2.0965vw", "Supporto operativo alla fertilizzazione azotata di"),
            fontFamily: "'Inter', sans-serif",
            color: "#475569"
          }}>{t.part("Supporto operativo alla fertilizzazione azotata di", 1, " ")}</span><span style={{
            fontSize: t.font("2.0965vw", "Supporto operativo alla fertilizzazione azotata di"),
            fontFamily: "'Inter', sans-serif",
            color: "#475569"
          }}>{t.part("Supporto operativo alla fertilizzazione azotata di", 2, "operativo")}</span><span style={{
            fontSize: t.font("2.0965vw", "Supporto operativo alla fertilizzazione azotata di"),
            fontFamily: "'Inter', sans-serif",
            color: "#475569"
          }}>{t.part("Supporto operativo alla fertilizzazione azotata di", 3, " alla ")}</span><span style={{
            fontSize: t.font("2.0965vw", "Supporto operativo alla fertilizzazione azotata di"),
            fontFamily: "'Inter', sans-serif",
            color: "#475569"
          }}>{t.part("Supporto operativo alla fertilizzazione azotata di", 4, "fertilizzazione")}</span><span style={{
            fontSize: t.font("2.0965vw", "Supporto operativo alla fertilizzazione azotata di"),
            fontFamily: "'Inter', sans-serif",
            color: "#475569"
          }}>{t.part("Supporto operativo alla fertilizzazione azotata di", 5, " ")}</span><span style={{
            fontSize: t.font("2.0965vw", "Supporto operativo alla fertilizzazione azotata di"),
            fontFamily: "'Inter', sans-serif",
            color: "#475569"
          }}>{t.part("Supporto operativo alla fertilizzazione azotata di", 6, "azotata")}</span><span style={{
            fontSize: t.font("2.0965vw", "Supporto operativo alla fertilizzazione azotata di"),
            fontFamily: "'Inter', sans-serif",
            color: "#475569"
          }}>{t.part("Supporto operativo alla fertilizzazione azotata di", 7, " di")}</span></p></div><div key={20} style={{
        position: "absolute",
        left: "4vw",
        top: "55.3398vh",
        width: "21.7057vw",
        height: "4.4611vh",
        boxSizing: "border-box",
        padding: "0vh 0vw 0vh 0vw",
        overflowWrap: "normal"
      }}><p style={{
          textAlign: "left",
          lineHeight: "2.9354vw",
          fontSize: "2.0965vw",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("2.0965vw", "tabacco e grano duro"),
            fontFamily: "'Inter', sans-serif",
            color: "#475569"
          }}>{t("tabacco e grano duro")}</span></p></div><div key={21} style={{
        position: "absolute",
        left: "62.2719vw",
        top: "20.3926vh",
        width: "6.3807vw",
        height: "1.838vh",
        boxSizing: "border-box",
        padding: "0vh 0vw 0vh 0vw",
        overflowWrap: "normal"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.1722vw",
          fontSize: "0.8368vw",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("0.8368vw", "NitroCrop NDVI"),
            fontFamily: "'Inter', sans-serif",
            color: "#2A1A05"
          }}>{t("NitroCrop NDVI")}</span></p></div><div key={22} style={{
        position: "absolute",
        left: "87.2156vw",
        top: "20.6352vh",
        width: "7.5323vw",
        height: "1.3787vh",
        boxSizing: "border-box",
        padding: "0vh 0vw 0vh 0vw",
        overflowWrap: "normal"
      }}><p style={{
          textAlign: "left",
          lineHeight: "0.8965vw",
          fontSize: "0.6403vw",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("0.6403vw", "Schema dell\u02BCinterfaccia"),
            fontFamily: "'Inter', sans-serif",
            color: "#FFE7A8"
          }}>{t("Schema dell\u02BCinterfaccia")}</span></p></div><div key={23} style={{
        position: "absolute",
        left: "61.5828vw",
        top: "50.1083vh",
        width: "1.2214vw",
        height: "1.1935vh",
        boxSizing: "border-box",
        padding: "0vh 0vw 0vh 0vw",
        overflowWrap: "normal"
      }}><p style={{
          textAlign: "left",
          lineHeight: "0.8271vw",
          fontSize: "0.591vw",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("0.591vw", "Esci"),
            fontFamily: "'Inter', sans-serif",
            color: "#2A1A05"
          }}>{t("Esci")}</span></p></div><div key={24} style={{
        position: "absolute",
        left: "61.5828vw",
        top: "41.1704vh",
        width: "2.2141vw",
        height: "1.1935vh",
        boxSizing: "border-box",
        padding: "0vh 0vw 0vh 0vw",
        overflowWrap: "normal"
      }}><p style={{
          textAlign: "left",
          lineHeight: "0.8271vw",
          fontSize: "0.591vw",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("0.591vw", "Privacy"),
            fontFamily: "'Inter', sans-serif",
            color: "#2A1A05"
          }}>{t("Privacy")}</span></p></div><div key={25} style={{
        position: "absolute",
        left: "61.5828vw",
        top: "33.4583vh",
        width: "2.7646vw",
        height: "1.1935vh",
        boxSizing: "border-box",
        padding: "0vh 0vw 0vh 0vw",
        overflowWrap: "normal"
      }}><p style={{
          textAlign: "left",
          lineHeight: "0.8271vw",
          fontSize: "0.591vw",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("0.591vw", "Istruzioni"),
            fontFamily: "'Inter', sans-serif",
            color: "#2A1A05"
          }}>{t("Istruzioni")}</span></p></div><div key={26} style={{
        position: "absolute",
        left: "61.5828vw",
        top: "25.7491vh",
        width: "3.712vw",
        height: "1.1935vh",
        boxSizing: "border-box",
        padding: "0vh 0vw 0vh 0vw",
        overflowWrap: "normal"
      }}><p style={{
          textAlign: "left",
          lineHeight: "0.8271vw",
          fontSize: "0.591vw",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("0.591vw", "Rilievo e dati"),
            fontFamily: "'Inter', sans-serif",
            color: "#2A1A05"
          }}>{t("Rilievo e dati")}</span></p></div><div key={27} style={{
        position: "absolute",
        left: "61.5828vw",
        top: "37.3139vh",
        width: "4.1005vw",
        height: "1.1935vh",
        boxSizing: "border-box",
        padding: "0vh 0vw 0vh 0vw",
        overflowWrap: "normal"
      }}><p style={{
          textAlign: "left",
          lineHeight: "0.8271vw",
          fontSize: "0.591vw",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("0.591vw", "Il mio account"),
            fontFamily: "'Inter', sans-serif",
            color: "#2A1A05"
          }}>{t("Il mio account")}</span></p></div><div key={28} style={{
        position: "absolute",
        left: "61.5828vw",
        top: "29.6046vh",
        width: "5.1281vw",
        height: "1.1935vh",
        boxSizing: "border-box",
        padding: "0vh 0vw 0vh 0vw",
        overflowWrap: "normal"
      }}><p style={{
          textAlign: "left",
          lineHeight: "0.8271vw",
          fontSize: "0.591vw",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("0.591vw", "Elaborazioni e Mappe"),
            fontFamily: "'Inter', sans-serif",
            color: "#2A1A05"
          }}>{t("Elaborazioni e Mappe")}</span></p></div><div key={29} style={{
        position: "absolute",
        left: "61.5828vw",
        top: "45.0259vh",
        width: "5.1276vw",
        height: "1.1935vh",
        boxSizing: "border-box",
        padding: "0vh 0vw 0vh 0vw",
        overflowWrap: "normal"
      }}><p style={{
          textAlign: "left",
          lineHeight: "0.8271vw",
          fontSize: "0.591vw",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("0.591vw", "Scrivi al supporto tecnico"),
            fontFamily: "'Inter', sans-serif",
            color: "#2A1A05"
          }}>{t("Scrivi al supporto tecnico")}</span></p></div><div key={30} style={{
        position: "absolute",
        left: "78.1479vw",
        top: "26.2481vh",
        width: "7.4297vw",
        height: "2.4806vh",
        boxSizing: "border-box",
        padding: "0vh 0vw 0vh 0vw",
        overflowWrap: "normal"
      }}><p style={{
          textAlign: "left",
          lineHeight: "1.6556vw",
          fontSize: "1.1826vw",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.1826vw", "Rilievo e dati"),
            fontFamily: "'Inter', sans-serif",
            color: "#1F3D2B"
          }}>{t("Rilievo e dati")}</span></p></div></div>
);
};
export default ImportedSlide1;
