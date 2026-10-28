import type { ReactNode } from "react";
import { t, useLanguage } from "../i18n/runtime";
import tobaccoPhoto from "../assets/crops/tobacco.webp";
import wheatPhoto from "../assets/crops/wheat.webp";

export interface ModuleHeadingProps {
  title: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function ModuleHeading({ title, children, className = "" }: ModuleHeadingProps) {
  useLanguage();
  return (
    <div className={`nc-modhead ${className}`} data-testid="module-heading">
      <div className="nc-modhead-row">
        <img src={tobaccoPhoto} alt="" aria-hidden="true" className="nc-modhead-photo" loading="lazy" decoding="async" />
        <h1 className="nc-display nc-modhead-title" data-testid="text-module-title">{typeof title === "string" ? t(title) : title}</h1>
        <img src={wheatPhoto} alt="" aria-hidden="true" className="nc-modhead-photo" loading="lazy" decoding="async" />
      </div>
      {children && <div className="nc-modhead-sub">{children}</div>}
    </div>
  );
}

export default ModuleHeading;
