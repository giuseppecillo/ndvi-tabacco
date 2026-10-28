import type { FC } from "react";
import { useDeckText } from "../../i18n";
import { useFitText } from "../../hooks/useFitText";
import img_1 from "../../assets/uploaded-presentation/image_7.jpg";
import img_2 from "../../assets/uploaded-presentation/image_8.jpg";
import img_3 from "../../assets/uploaded-presentation/image_2.png";
import img_4 from "../../assets/uploaded-presentation/image_9.jpg";
import svg_image11 from "../../assets/uploaded-presentation/svg/image11.png";
const ImportedSlide2: FC = () => {
const t = useDeckText();
const fitRef = useFitText<HTMLDivElement>();
return (
<div ref={fitRef} data-slide-root className="w-screen h-screen overflow-hidden relative" style={{ backgroundColor: "#FAFBFC", color: "#000000" }}>
<svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true"><defs><clipPath id="s2c0" clipPathUnits="objectBoundingBox"><path d="M 0.967 0.042 C 0.9682 0.042 0.9694 0.0426 0.9706 0.0437 C 0.9718 0.0448 0.9728 0.0464 0.9737 0.0485 C 0.9746 0.0505 0.9753 0.0529 0.9757 0.0556 C 0.9762 0.0583 0.9765 0.0611 0.9765 0.0641 L 0.9765 0.9109 C 0.9765 0.9139 0.9762 0.9167 0.9757 0.9194 C 0.9753 0.9221 0.9746 0.9245 0.9737 0.9265 C 0.9728 0.9286 0.9718 0.9302 0.9706 0.9313 C 0.9694 0.9324 0.9682 0.933 0.967 0.933 L 0.0328 0.933 C 0.0315 0.933 0.0303 0.9324 0.0291 0.9313 C 0.028 0.9302 0.0269 0.9286 0.0261 0.9265 C 0.0252 0.9245 0.0245 0.9221 0.024 0.9194 C 0.0235 0.9167 0.0233 0.9139 0.0233 0.9109 L 0.0233 0.0641 C 0.0233 0.0612 0.0235 0.0583 0.024 0.0556 C 0.0245 0.0529 0.0252 0.0506 0.0261 0.0485 C 0.0269 0.0464 0.028 0.0448 0.0291 0.0437 C 0.0303 0.0426 0.0315 0.042 0.0328 0.042 Z M 0 0 L 0 1 L 1 1 L 1 0 Z" /></clipPath><clipPath id="s2c1" clipPathUnits="objectBoundingBox"><path d="M 0 0.9739 L 0 0.0261 C 0 0.0244 0.0001 0.0227 0.0002 0.021 C 0.0003 0.0193 0.0005 0.0177 0.0008 0.0161 C 0.0011 0.0146 0.0014 0.013 0.0018 0.0116 C 0.0022 0.0102 0.0026 0.0089 0.0031 0.0077 C 0.0036 0.0065 0.0041 0.0054 0.0047 0.0044 C 0.0052 0.0034 0.0059 0.0026 0.0065 0.002 C 0.0071 0.0014 0.0078 0.0008 0.0085 0.0005 C 0.0092 0.0001 0.0098 0 0.0105 0 L 0.9895 0 C 0.9902 0 0.9908 0.0001 0.9915 0.0005 C 0.9922 0.0008 0.9929 0.0014 0.9935 0.002 C 0.9941 0.0026 0.9948 0.0034 0.9953 0.0044 C 0.9959 0.0054 0.9964 0.0064 0.9969 0.0077 C 0.9974 0.0089 0.9978 0.0102 0.9982 0.0116 C 0.9986 0.013 0.9989 0.0146 0.9992 0.0161 C 0.9995 0.0177 0.9997 0.0193 0.9998 0.021 C 0.9999 0.0227 1 0.0244 1 0.0261 L 1 0.9739 C 1 0.9756 0.9999 0.9773 0.9998 0.979 C 0.9997 0.9807 0.9995 0.9823 0.9992 0.9839 C 0.9989 0.9854 0.9986 0.987 0.9982 0.9884 C 0.9978 0.9898 0.9974 0.9911 0.9969 0.9923 C 0.9964 0.9935 0.9959 0.9946 0.9953 0.9956 C 0.9948 0.9966 0.9941 0.9974 0.9935 0.998 C 0.9929 0.9986 0.9922 0.9992 0.9915 0.9995 C 0.9908 0.9999 0.9902 1 0.9895 1 L 0.0105 1 C 0.0098 1 0.0092 0.9999 0.0085 0.9995 C 0.0078 0.9992 0.0071 0.9986 0.0065 0.998 C 0.0059 0.9974 0.0052 0.9966 0.0047 0.9956 C 0.0041 0.9946 0.0036 0.9936 0.0031 0.9923 C 0.0026 0.9911 0.0022 0.9898 0.0018 0.9884 C 0.0014 0.987 0.0011 0.9854 0.0008 0.9839 C 0.0005 0.9823 0.0003 0.9807 0.0002 0.979 C 0.0001 0.9773 0 0.9756 0 0.9739 Z" /></clipPath><clipPath id="s2c2" clipPathUnits="objectBoundingBox"><path d="M 0 0.9725 L 0 0.0275 L 0.0006 0.0275 L 0 0.0275 C 0 0.0257 0.0001 0.0239 0.0002 0.0221 L 0.0008 0.0224 L 0.0002 0.0221 C 0.0003 0.0204 0.0006 0.0187 0.0008 0.017 L 0.0014 0.0175 L 0.0008 0.017 C 0.0011 0.0153 0.0015 0.0138 0.0019 0.0123 C 0.0023 0.0108 0.0028 0.0094 0.0033 0.0081 L 0.0037 0.0091 L 0.0033 0.0081 C 0.0038 0.0068 0.0044 0.0057 0.005 0.0047 C 0.0056 0.0037 0.0062 0.0028 0.0069 0.0021 L 0.0071 0.0034 L 0.0069 0.0021 C 0.0075 0.0014 0.0082 0.0009 0.0089 0.0005 L 0.0091 0.0019 L 0.0089 0.0005 C 0.0097 0.0002 0.0104 0 0.0111 0 L 0.0111 0.0015 L 0.0111 0 L 0.9889 0 L 0.9889 0.0015 L 0.9889 0 C 0.9896 0 0.9903 0.0002 0.9911 0.0005 L 0.9909 0.0019 L 0.9911 0.0005 C 0.9918 0.0009 0.9925 0.0014 0.9931 0.0021 C 0.9938 0.0028 0.9944 0.0036 0.995 0.0047 C 0.9956 0.0056 0.9962 0.0068 0.9967 0.0081 C 0.9972 0.0094 0.9977 0.0108 0.9981 0.0123 C 0.9985 0.0138 0.9989 0.0154 0.9992 0.017 L 0.9986 0.0175 L 0.9992 0.017 C 0.9994 0.0187 0.9997 0.0204 0.9998 0.0221 L 0.9992 0.0224 L 0.9998 0.0221 C 0.9999 0.0239 1 0.0257 1 0.0275 L 1 0.9725 C 1 0.9743 0.9999 0.9761 0.9998 0.9779 L 0.9992 0.9776 L 0.9998 0.9779 C 0.9997 0.9796 0.9994 0.9813 0.9992 0.983 C 0.9989 0.9847 0.9985 0.9862 0.9981 0.9877 L 0.9976 0.9869 L 0.9981 0.9877 C 0.9977 0.9892 0.9972 0.9906 0.9967 0.9919 C 0.9962 0.9932 0.9956 0.9943 0.995 0.9953 L 0.9947 0.9942 L 0.995 0.9953 C 0.9944 0.9963 0.9938 0.9972 0.9931 0.9979 C 0.9925 0.9986 0.9918 0.9991 0.9911 0.9995 C 0.9903 0.9998 0.9896 1 0.9889 1 L 0.0111 1 C 0.0104 1 0.0097 0.9998 0.0089 0.9995 L 0.0091 0.9981 L 0.0089 0.9995 C 0.0082 0.9991 0.0075 0.9986 0.0069 0.9979 C 0.0062 0.9972 0.0056 0.9964 0.005 0.9953 L 0.0053 0.9942 L 0.005 0.9953 C 0.0044 0.9944 0.0038 0.9932 0.0033 0.9919 C 0.0028 0.9906 0.0023 0.9892 0.0019 0.9877 L 0.0024 0.9869 L 0.0019 0.9877 C 0.0015 0.9862 0.0011 0.9846 0.0008 0.983 C 0.0006 0.9813 0.0003 0.9796 0.0002 0.9779 L 0.0008 0.9776 L 0.0002 0.9779 C 0.0001 0.9761 0 0.9743 0 0.9725 L 0.0006 0.9725 L 0 0.9725 M 0.0012 0.9725 C 0.0012 0.9741 0.0012 0.9757 0.0013 0.9773 C 0.0015 0.9789 0.0017 0.9804 0.0019 0.9819 L 0.0014 0.9825 L 0.0019 0.9819 C 0.0022 0.9834 0.0025 0.9848 0.0028 0.9862 C 0.0032 0.9876 0.0036 0.9888 0.0041 0.9899 L 0.0037 0.991 L 0.0041 0.9899 C 0.0045 0.9911 0.005 0.9921 0.0056 0.993 C 0.0061 0.9939 0.0067 0.9946 0.0073 0.9953 L 0.0071 0.9966 L 0.0073 0.9953 C 0.0079 0.9959 0.0085 0.9964 0.0092 0.9967 C 0.0098 0.997 0.0105 0.9972 0.0111 0.9972 L 0.0111 0.9986 L 0.0111 0.9971 L 0.9889 0.9971 L 0.9889 0.9986 L 0.9889 0.9972 C 0.9895 0.9972 0.9902 0.997 0.9908 0.9967 L 0.991 0.9981 L 0.9908 0.9967 C 0.9915 0.9964 0.9921 0.9959 0.9927 0.9953 L 0.9929 0.9966 L 0.9927 0.9953 C 0.9933 0.9947 0.9939 0.9939 0.9944 0.993 C 0.995 0.9921 0.9955 0.9911 0.996 0.9899 L 0.9964 0.991 L 0.996 0.9899 C 0.9964 0.9888 0.9968 0.9875 0.9972 0.9862 C 0.9976 0.9849 0.9978 0.9835 0.9981 0.982 L 0.9987 0.9825 L 0.9981 0.982 C 0.9984 0.9805 0.9986 0.9789 0.9987 0.9773 C 0.9988 0.9757 0.9989 0.9742 0.9989 0.9725 L 0.9994 0.9725 L 0.9989 0.9725 L 0.9989 0.0275 L 0.9994 0.0275 L 0.9989 0.0275 C 0.9989 0.0259 0.9988 0.0243 0.9987 0.0227 C 0.9986 0.0211 0.9984 0.0196 0.9981 0.0181 C 0.9978 0.0166 0.9976 0.0152 0.9972 0.0138 L 0.9977 0.013 L 0.9972 0.0138 C 0.9968 0.0125 0.9964 0.0112 0.996 0.0101 L 0.9964 0.009 L 0.996 0.0101 C 0.9955 0.0089 0.995 0.0079 0.9944 0.007 L 0.9948 0.0058 L 0.9944 0.007 C 0.9939 0.0061 0.9933 0.0054 0.9927 0.0047 L 0.9929 0.0034 L 0.9927 0.0047 C 0.9921 0.0041 0.9915 0.0036 0.9908 0.0033 C 0.9902 0.003 0.9896 0.0028 0.9889 0.0028 L 0.0111 0.0028 C 0.0105 0.0028 0.0098 0.003 0.0092 0.0033 C 0.0085 0.0036 0.0079 0.004 0.0073 0.0047 C 0.0067 0.0054 0.0061 0.0061 0.0056 0.007 L 0.0053 0.0058 L 0.0056 0.007 C 0.005 0.0079 0.0045 0.0089 0.0041 0.0101 C 0.0036 0.0112 0.0032 0.0125 0.0028 0.0138 L 0.0023 0.013 L 0.0028 0.0138 C 0.0025 0.0151 0.0022 0.0165 0.0019 0.0181 C 0.0017 0.0196 0.0015 0.0211 0.0013 0.0227 C 0.0012 0.0243 0.0011 0.0259 0.0011 0.0275 L 0.0011 0.9725 Z" /></clipPath><clipPath id="s2c3" clipPathUnits="objectBoundingBox"><path d="M 0.9672 0.042 C 0.9685 0.042 0.9697 0.0426 0.9709 0.0437 C 0.972 0.0448 0.9731 0.0464 0.9739 0.0485 C 0.9748 0.0505 0.9755 0.0529 0.976 0.0556 C 0.9765 0.0583 0.9767 0.0611 0.9767 0.0641 L 0.9767 0.9109 C 0.9767 0.9139 0.9765 0.9167 0.976 0.9194 C 0.9755 0.9221 0.9748 0.9245 0.9739 0.9265 C 0.9731 0.9286 0.972 0.9302 0.9709 0.9313 C 0.9697 0.9324 0.9685 0.933 0.9672 0.933 L 0.033 0.933 C 0.0318 0.933 0.0306 0.9324 0.0294 0.9313 C 0.0282 0.9302 0.0272 0.9286 0.0263 0.9265 C 0.0254 0.9245 0.0247 0.9221 0.0243 0.9194 C 0.0238 0.9167 0.0235 0.9139 0.0235 0.9109 L 0.0235 0.0641 C 0.0235 0.0612 0.0238 0.0583 0.0243 0.0556 C 0.0247 0.0529 0.0254 0.0506 0.0263 0.0485 C 0.0272 0.0464 0.0282 0.0448 0.0294 0.0437 C 0.0306 0.0426 0.0318 0.042 0.033 0.042 Z M 0 0 L 0 1 L 1 1 L 1 0 Z" /></clipPath><clipPath id="s2c4" clipPathUnits="objectBoundingBox"><path d="M 0 0.9739 L 0 0.0261 C 0 0.0244 0.0001 0.0227 0.0002 0.021 C 0.0003 0.0193 0.0005 0.0177 0.0008 0.0161 C 0.0011 0.0146 0.0014 0.013 0.0018 0.0116 C 0.0022 0.0102 0.0026 0.0089 0.0031 0.0077 C 0.0036 0.0065 0.0041 0.0054 0.0047 0.0044 C 0.0052 0.0034 0.0059 0.0026 0.0065 0.002 C 0.0071 0.0014 0.0078 0.0008 0.0085 0.0005 C 0.0092 0.0001 0.0098 0 0.0105 0 L 0.9895 0 C 0.9902 0 0.9908 0.0001 0.9915 0.0005 C 0.9922 0.0008 0.9929 0.0014 0.9935 0.002 C 0.9941 0.0026 0.9948 0.0034 0.9953 0.0044 C 0.9959 0.0054 0.9964 0.0064 0.9969 0.0077 C 0.9974 0.0089 0.9978 0.0102 0.9982 0.0116 C 0.9986 0.013 0.9989 0.0146 0.9992 0.0161 C 0.9995 0.0177 0.9997 0.0193 0.9998 0.021 C 0.9999 0.0227 1 0.0244 1 0.0261 L 1 0.9739 C 1 0.9756 0.9999 0.9773 0.9998 0.979 C 0.9997 0.9807 0.9995 0.9823 0.9992 0.9839 C 0.9989 0.9854 0.9986 0.987 0.9982 0.9884 C 0.9978 0.9898 0.9974 0.9911 0.9969 0.9923 C 0.9964 0.9935 0.9959 0.9946 0.9953 0.9956 C 0.9948 0.9966 0.9941 0.9974 0.9935 0.998 C 0.9929 0.9986 0.9922 0.9992 0.9915 0.9995 C 0.9908 0.9999 0.9902 1 0.9895 1 L 0.0105 1 C 0.0098 1 0.0092 0.9999 0.0085 0.9995 C 0.0078 0.9992 0.0071 0.9986 0.0065 0.998 C 0.0059 0.9974 0.0052 0.9966 0.0047 0.9956 C 0.0041 0.9946 0.0036 0.9936 0.0031 0.9923 C 0.0026 0.9911 0.0022 0.9898 0.0018 0.9884 C 0.0014 0.987 0.0011 0.9854 0.0008 0.9839 C 0.0005 0.9823 0.0003 0.9807 0.0002 0.979 C 0.0001 0.9773 0 0.9756 0 0.9739 Z" /></clipPath><clipPath id="s2c5" clipPathUnits="objectBoundingBox"><path d="M 0 0.9725 L 0 0.0275 L 0.0006 0.0275 L 0 0.0275 C 0 0.0257 0.0001 0.0239 0.0003 0.0221 C 0.0004 0.0204 0.0006 0.0187 0.0009 0.017 L 0.0014 0.0175 L 0.0009 0.017 C 0.0012 0.0153 0.0015 0.0138 0.0019 0.0123 C 0.0023 0.0108 0.0028 0.0094 0.0033 0.0081 L 0.0037 0.0091 L 0.0033 0.0081 C 0.0038 0.0068 0.0044 0.0057 0.005 0.0047 C 0.0056 0.0037 0.0062 0.0028 0.0069 0.0021 L 0.0071 0.0034 L 0.0069 0.0021 C 0.0076 0.0014 0.0083 0.0009 0.009 0.0005 L 0.0091 0.0019 L 0.009 0.0005 C 0.0097 0.0002 0.0104 0 0.0111 0 L 0.0111 0.0015 L 0.0111 0 L 0.9889 0 L 0.9889 0.0015 L 0.9889 0 C 0.9896 0 0.9903 0.0002 0.9911 0.0005 L 0.9909 0.0019 L 0.9911 0.0005 C 0.9918 0.0009 0.9925 0.0014 0.9931 0.0021 L 0.9929 0.0034 L 0.9931 0.0021 C 0.9938 0.0028 0.9944 0.0036 0.995 0.0047 C 0.9956 0.0056 0.9962 0.0068 0.9967 0.0081 L 0.9963 0.0091 L 0.9967 0.0081 C 0.9972 0.0094 0.9977 0.0108 0.9981 0.0123 C 0.9985 0.0138 0.9989 0.0154 0.9992 0.017 L 0.9986 0.0175 L 0.9992 0.017 C 0.9994 0.0187 0.9997 0.0204 0.9998 0.0221 L 0.9992 0.0224 L 0.9998 0.0221 C 0.9999 0.0239 1 0.0257 1 0.0275 L 1 0.9725 C 1 0.9743 0.9999 0.9761 0.9998 0.9779 L 0.9992 0.9776 L 0.9998 0.9779 C 0.9997 0.9796 0.9994 0.9813 0.9992 0.983 C 0.9989 0.9847 0.9985 0.9862 0.9981 0.9877 L 0.9976 0.9869 L 0.9981 0.9877 C 0.9977 0.9892 0.9972 0.9906 0.9967 0.9919 C 0.9962 0.9932 0.9956 0.9943 0.995 0.9953 L 0.9947 0.9942 L 0.995 0.9953 C 0.9944 0.9963 0.9938 0.9972 0.9931 0.9979 C 0.9925 0.9986 0.9918 0.9991 0.9911 0.9995 C 0.9903 0.9998 0.9896 1 0.9889 1 L 0.0111 1 C 0.0104 1 0.0097 0.9998 0.009 0.9995 L 0.0091 0.9981 L 0.009 0.9995 C 0.0083 0.9991 0.0076 0.9986 0.0069 0.9979 C 0.0062 0.9972 0.0056 0.9964 0.005 0.9953 C 0.0044 0.9944 0.0038 0.9932 0.0033 0.9919 C 0.0028 0.9906 0.0023 0.9892 0.0019 0.9877 L 0.0024 0.9869 L 0.0019 0.9877 C 0.0015 0.9862 0.0012 0.9846 0.0009 0.983 L 0.0014 0.9825 L 0.0009 0.983 C 0.0006 0.9813 0.0004 0.9796 0.0002 0.9779 C 0.0001 0.9761 0 0.9743 0 0.9725 L 0.0006 0.9725 L 0 0.9725 M 0.0012 0.9725 C 0.0012 0.9741 0.0012 0.9757 0.0013 0.9773 L 0.0008 0.9776 L 0.0013 0.9773 C 0.0015 0.9789 0.0017 0.9804 0.0019 0.9819 C 0.0022 0.9834 0.0025 0.9848 0.0028 0.9862 C 0.0032 0.9875 0.0036 0.9888 0.0041 0.9899 L 0.0037 0.991 L 0.0041 0.9899 C 0.0045 0.9911 0.005 0.9921 0.0056 0.993 L 0.0053 0.9942 L 0.0056 0.993 C 0.0061 0.9939 0.0067 0.9946 0.0073 0.9953 L 0.0071 0.9966 L 0.0073 0.9953 C 0.0079 0.9959 0.0085 0.9964 0.0092 0.9967 C 0.0098 0.997 0.0105 0.9972 0.0111 0.9972 L 0.0111 0.9986 L 0.0111 0.9971 L 0.9889 0.9971 L 0.9889 0.9986 L 0.9889 0.9972 C 0.9895 0.9972 0.9902 0.997 0.9908 0.9967 L 0.9909 0.9981 L 0.9908 0.9967 C 0.9915 0.9964 0.9921 0.9959 0.9927 0.9953 L 0.9929 0.9966 L 0.9927 0.9953 C 0.9933 0.9947 0.9939 0.9939 0.9944 0.993 C 0.995 0.9921 0.9955 0.9911 0.9959 0.9899 L 0.9963 0.991 L 0.9959 0.9899 C 0.9964 0.9888 0.9968 0.9875 0.9972 0.9862 C 0.9975 0.9849 0.9978 0.9835 0.9981 0.982 L 0.9986 0.9825 L 0.9981 0.982 C 0.9983 0.9805 0.9985 0.9789 0.9987 0.9773 C 0.9988 0.9757 0.9988 0.9742 0.9988 0.9725 L 0.9994 0.9725 L 0.9988 0.9725 L 0.9988 0.0275 L 0.9994 0.0275 L 0.9988 0.0275 C 0.9988 0.0259 0.9988 0.0243 0.9987 0.0227 C 0.9985 0.0211 0.9983 0.0196 0.9981 0.0181 C 0.9978 0.0166 0.9975 0.0152 0.9972 0.0138 L 0.9976 0.013 L 0.9972 0.0138 C 0.9968 0.0125 0.9964 0.0112 0.9959 0.0101 C 0.9955 0.0089 0.995 0.0079 0.9944 0.007 L 0.9947 0.0058 L 0.9944 0.007 C 0.9939 0.0061 0.9933 0.0054 0.9927 0.0047 C 0.9921 0.0041 0.9915 0.0036 0.9908 0.0033 C 0.9902 0.003 0.9895 0.0028 0.9889 0.0028 L 0.0111 0.0028 C 0.0105 0.0028 0.0098 0.003 0.0092 0.0033 C 0.0085 0.0036 0.0079 0.004 0.0073 0.0047 C 0.0067 0.0053 0.0061 0.0061 0.0056 0.007 L 0.0053 0.0058 L 0.0056 0.007 C 0.005 0.0079 0.0045 0.0089 0.0041 0.0101 C 0.0036 0.0112 0.0032 0.0125 0.0028 0.0138 L 0.0024 0.013 L 0.0028 0.0138 C 0.0025 0.0151 0.0022 0.0165 0.0019 0.0181 C 0.0017 0.0196 0.0015 0.0211 0.0013 0.0227 L 0.0008 0.0224 L 0.0013 0.0227 C 0.0012 0.0243 0.0012 0.0259 0.0012 0.0275 L 0.0012 0.9725 Z" /></clipPath></defs></svg><div key={0} style={{
        position: "absolute",
        left: "-0.3474vw",
        top: "1.8824vh",
        width: "100.6943vw",
        height: "9.8454vh",
        boxSizing: "border-box",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
          backgroundImage: `url(${svg_image11})`
        }} /><div key={1} style={{
        position: "absolute",
        left: "2.9667vw",
        top: "28.2074vh",
        width: "47.1vw",
        height: "36.0593vh"
      }}><div key={0} style={{
          position: "absolute",
          left: "0vw",
          top: "0vh",
          width: "47.1vw",
          height: "36.0593vh",
          boxSizing: "border-box",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          clipPath: "url(#s2c0)",
          backgroundImage: `url(${img_1})`
        }} /></div><div key={2} style={{
        position: "absolute",
        left: "2.6193vw",
        top: "27.5898vh",
        width: "47.7943vw",
        height: "37.2935vh"
      }}><div key={0} style={{
          position: "absolute",
          left: "0.3474vw",
          top: "0.6176vh",
          width: "47.1vw",
          height: "36.0593vh",
          boxSizing: "border-box",
          backgroundColor: "#C97A12"
        }} /><div key={1} style={{
          position: "absolute",
          left: "1.4172vw",
          top: "2.0861vh",
          width: "44.9474vw",
          height: "32.2213vh",
          boxSizing: "border-box",
          backgroundColor: "#FFFFFF",
          clipPath: "url(#s2c1)"
        }} /><div key={2} style={{
          position: "absolute",
          left: "1.3911vw",
          top: "2.0398vh",
          width: "45vw",
          height: "32.3148vh",
          boxSizing: "border-box",
          backgroundColor: "#E2E8F0",
          clipPath: "url(#s2c2)"
        }} /></div><div key={3} style={{
        position: "absolute",
        left: "49.9333vw",
        top: "28.2074vh",
        width: "47.1vw",
        height: "36.0593vh"
      }}><div key={0} style={{
          position: "absolute",
          left: "0vw",
          top: "0vh",
          width: "47.1vw",
          height: "36.0593vh",
          boxSizing: "border-box",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          clipPath: "url(#s2c3)",
          backgroundImage: `url(${img_2})`
        }} /></div><div key={4} style={{
        position: "absolute",
        left: "49.5859vw",
        top: "27.5898vh",
        width: "47.7943vw",
        height: "37.2935vh"
      }}><div key={0} style={{
          position: "absolute",
          left: "0.3474vw",
          top: "0.6176vh",
          width: "47.1vw",
          height: "36.0593vh",
          boxSizing: "border-box",
          backgroundColor: "#E2E8F0"
        }} /><div key={1} style={{
          position: "absolute",
          left: "1.4297vw",
          top: "2.0861vh",
          width: "44.9474vw",
          height: "32.2213vh",
          boxSizing: "border-box",
          backgroundColor: "#FFFFFF",
          clipPath: "url(#s2c4)"
        }} /><div key={2} style={{
          position: "absolute",
          left: "1.4026vw",
          top: "2.0398vh",
          width: "45.0016vw",
          height: "32.3148vh",
          boxSizing: "border-box",
          backgroundColor: "#E2E8F0",
          clipPath: "url(#s2c5)"
        }} /></div><div key={5} style={{
        position: "absolute",
        left: "4.0104vw",
        top: "3.9815vh",
        width: "91.9792vw",
        height: "7.037vh"
      }}><div key={0} style={{
          position: "absolute",
          left: "0vw",
          top: "0vh",
          width: "91.9792vw",
          height: "7.037vh",
          boxSizing: "border-box",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundImage: `url(${img_3})`
        }} /></div><div key={6} style={{
        position: "absolute",
        left: "2.5vw",
        top: "88.9815vh",
        width: "5.0521vw",
        height: "9.0741vh"
      }}><div key={0} style={{
          position: "absolute",
          left: "0vw",
          top: "0vh",
          width: "5.0521vw",
          height: "9.0741vh",
          boxSizing: "border-box",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundImage: `url(${img_4})`
        }} /></div><div key={7} style={{
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
          }}>{t("NitroCrop NDVI")}</span></p></div><div key={8} style={{
        position: "absolute",
        left: "8.3193vw",
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
          }}>{t("Taurus Agriculture Solution")}</span></p></div><div key={9} style={{
        position: "absolute",
        left: "84.4214vw",
        top: "5.7556vh",
        width: "10.5849vw",
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
            fontSize: t.font("1.5vw", "PANORAMICA"),
            fontFamily: "'Inter', sans-serif",
            color: "#2A1A05"
          }}>{t("PANORAMICA")}</span></p></div><div key={10} style={{
        position: "absolute",
        left: "89.8521vw",
        top: "91.7741vh",
        width: "6.2714vw",
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
            fontSize: t.font("1.5vw", "Pagina 2"),
            fontFamily: "'Inter', sans-serif",
            color: "#94A3B8"
          }}>{t("Pagina 2")}</span></p></div><div key={11} style={{
        position: "absolute",
        left: "4vw",
        top: "15.8722vh",
        width: "52.7411vw",
        height: "8.5611vh",
        boxSizing: "border-box",
        padding: "0vh 0vw 0vh 0vw",
        overflowWrap: "normal"
      }}><p style={{
          textAlign: "left",
          lineHeight: "5.5993vw",
          fontSize: "3.9993vw",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("3.9993vw", "Dalla misura alla decisione"),
            fontFamily: "'Inter', sans-serif",
            color: "#1F3D2B"
          }}>{t("Dalla misura alla decisione")}</span></p></div><div key={12} style={{
        position: "absolute",
        left: "5.9833vw",
        top: "37.9472vh",
        width: "41.0036vw",
        height: "7.1546vh",
        boxSizing: "border-box",
        padding: "0vh 0vw 0vh 0vw",
        overflowWrap: "normal"
      }}><p style={{
          textAlign: "left",
          lineHeight: "0.8465vw",
          fontSize: "1.6938vw",
          // Authored line height is half the label size, so the label sank
          // into the first body line; lift it to the INDICAZIONE baseline
          // without moving the body paragraphs that follow.
          position: "relative",
          top: "-2.5vw",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.6938vw", "RILIEVO"),
            fontFamily: "'Inter', sans-serif",
            color: "#A85E06"
          }}>{t("RILIEVO")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "0.9993vw",
          fontSize: "1.9993vw",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.9993vw", "\u00A0")
          }}>{t("\u00A0")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "0.9993vw",
          fontSize: "1.9993vw",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.9993vw", "\u00A0")
          }}>{t("\u00A0")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "0.9993vw",
          fontSize: "1.9993vw",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.9993vw", "Cinque letture NDVI per ogni osservazione"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t.part("Cinque letture NDVI per ogni osservazione", 0, "Cinque ")}</span><span style={{
            fontSize: t.font("1.9993vw", "Cinque letture NDVI per ogni osservazione"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t.part("Cinque letture NDVI per ogni osservazione", 1, "letture")}</span><span style={{
            fontSize: t.font("1.9993vw", "Cinque letture NDVI per ogni osservazione"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t.part("Cinque letture NDVI per ogni osservazione", 2, " NDVI per ogni ")}</span><span style={{
            fontSize: t.font("1.9993vw", "Cinque letture NDVI per ogni osservazione"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t.part("Cinque letture NDVI per ogni osservazione", 3, "osservazione")}</span></p></div><div key={13} style={{
        position: "absolute",
        left: "53.051vw",
        top: "32.1009vh",
        width: "11.3833vw",
        height: "3.7111vh",
        boxSizing: "border-box",
        padding: "0vh 0vw 0vh 0vw",
        overflowWrap: "normal"
      }}><p style={{
          textAlign: "left",
          lineHeight: "2.3715vw",
          fontSize: "1.6938vw",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.6938vw", "INDICAZIONE"),
            fontFamily: "'Inter', sans-serif",
            color: "#A85E06"
          }}>{t("INDICAZIONE")}</span></p></div><div key={14} style={{
        position: "absolute",
        left: "5.9833vw",
        top: "45.8167vh",
        width: "37.2401vw",
        height: "10.8546vh",
        boxSizing: "border-box",
        padding: "0vh 0vw 0vh 0vw",
        overflowWrap: "normal"
      }}><p style={{
          textAlign: "left",
          lineHeight: "3.2819vw",
          fontSize: "1.9993vw",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.9993vw", "Confronto con il riferimento fenologico della coltura"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t.part("Confronto con il riferimento fenologico della coltura", 0, "Confronto")}</span><span style={{
            fontSize: t.font("1.9993vw", "Confronto con il riferimento fenologico della coltura"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t.part("Confronto con il riferimento fenologico della coltura", 1, " con il ")}</span><span style={{
            fontSize: t.font("1.9993vw", "Confronto con il riferimento fenologico della coltura"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t.part("Confronto con il riferimento fenologico della coltura", 2, "riferimento")}</span><span style={{
            fontSize: t.font("1.9993vw", "Confronto con il riferimento fenologico della coltura"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t.part("Confronto con il riferimento fenologico della coltura", 3, " ")}</span><span style={{
            fontSize: t.font("1.9993vw", "Confronto con il riferimento fenologico della coltura"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t.part("Confronto con il riferimento fenologico della coltura", 4, "fenologico")}</span><span style={{
            fontSize: t.font("1.9993vw", "Confronto con il riferimento fenologico della coltura"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t.part("Confronto con il riferimento fenologico della coltura", 5, " della ")}</span><span style={{
            fontSize: t.font("1.9993vw", "Confronto con il riferimento fenologico della coltura"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t.part("Confronto con il riferimento fenologico della coltura", 6, "coltura")}</span></p></div><div key={15} style={{
        position: "absolute",
        left: "53.1583vw",
        top: "34.8861vh",
        width: "40.1589vw",
        height: "22.5213vh",
        boxSizing: "border-box",
        padding: "0vh 0vw 0vh 0vw",
        overflowWrap: "normal"
      }}><p style={{
          textAlign: "left",
          lineHeight: "3.7493vw",
          fontSize: "1.9993vw",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.9993vw", "Dose N proporzionale al deficit e limitata dal piano"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t.part("Dose N proporzionale al deficit e limitata dal piano", 0, "Dose N ")}</span><span style={{
            fontSize: t.font("1.9993vw", "Dose N proporzionale al deficit e limitata dal piano"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t.part("Dose N proporzionale al deficit e limitata dal piano", 1, "proporzionale")}</span><span style={{
            fontSize: t.font("1.9993vw", "Dose N proporzionale al deficit e limitata dal piano"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t.part("Dose N proporzionale al deficit e limitata dal piano", 2, " al deficit e ")}</span><span style={{
            fontSize: t.font("1.9993vw", "Dose N proporzionale al deficit e limitata dal piano"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t.part("Dose N proporzionale al deficit e limitata dal piano", 3, "limitata")}</span><span style={{
            fontSize: t.font("1.9993vw", "Dose N proporzionale al deficit e limitata dal piano"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t.part("Dose N proporzionale al deficit e limitata dal piano", 4, " dal piano")}</span></p><p style={{
          textAlign: "left",
          lineHeight: "3.7493vw",
          fontSize: "1.9993vw",
          marginTop: "0",
          marginBottom: "0"
        }}><span style={{
            fontSize: t.font("1.9993vw", "Registrazione GPS e analisi spaziale Export tabellari, PDF, GeoTIFF e Shapefile"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t.part("Registrazione GPS e analisi spaziale Export tabellari, PDF, GeoTIFF e Shapefile", 0, "Registrazione")}</span><span style={{
            fontSize: t.font("1.9993vw", "Registrazione GPS e analisi spaziale Export tabellari, PDF, GeoTIFF e Shapefile"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t.part("Registrazione GPS e analisi spaziale Export tabellari, PDF, GeoTIFF e Shapefile", 1, " GPS e ")}</span><span style={{
            fontSize: t.font("1.9993vw", "Registrazione GPS e analisi spaziale Export tabellari, PDF, GeoTIFF e Shapefile"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t.part("Registrazione GPS e analisi spaziale Export tabellari, PDF, GeoTIFF e Shapefile", 2, "analisi")}</span><span style={{
            fontSize: t.font("1.9993vw", "Registrazione GPS e analisi spaziale Export tabellari, PDF, GeoTIFF e Shapefile"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t.part("Registrazione GPS e analisi spaziale Export tabellari, PDF, GeoTIFF e Shapefile", 3, " ")}</span><span style={{
            fontSize: t.font("1.9993vw", "Registrazione GPS e analisi spaziale Export tabellari, PDF, GeoTIFF e Shapefile"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t.part("Registrazione GPS e analisi spaziale Export tabellari, PDF, GeoTIFF e Shapefile", 4, "spaziale")}</span><span style={{
            fontSize: t.font("1.9993vw", "Registrazione GPS e analisi spaziale Export tabellari, PDF, GeoTIFF e Shapefile"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t.part("Registrazione GPS e analisi spaziale Export tabellari, PDF, GeoTIFF e Shapefile", 5, " Export ")}</span><span style={{
            fontSize: t.font("1.9993vw", "Registrazione GPS e analisi spaziale Export tabellari, PDF, GeoTIFF e Shapefile"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t.part("Registrazione GPS e analisi spaziale Export tabellari, PDF, GeoTIFF e Shapefile", 6, "tabellari")}</span><span style={{
            fontSize: t.font("1.9993vw", "Registrazione GPS e analisi spaziale Export tabellari, PDF, GeoTIFF e Shapefile"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t.part("Registrazione GPS e analisi spaziale Export tabellari, PDF, GeoTIFF e Shapefile", 7, ", PDF, ")}</span><span style={{
            fontSize: t.font("1.9993vw", "Registrazione GPS e analisi spaziale Export tabellari, PDF, GeoTIFF e Shapefile"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t.part("Registrazione GPS e analisi spaziale Export tabellari, PDF, GeoTIFF e Shapefile", 8, "GeoTIFF")}</span><span style={{
            fontSize: t.font("1.9993vw", "Registrazione GPS e analisi spaziale Export tabellari, PDF, GeoTIFF e Shapefile"),
            fontFamily: "'Inter', sans-serif",
            color: "#1E3A5F"
          }}>{t.part("Registrazione GPS e analisi spaziale Export tabellari, PDF, GeoTIFF e Shapefile", 9, " e Shapefile")}</span></p></div></div>
);
};
export default ImportedSlide2;
