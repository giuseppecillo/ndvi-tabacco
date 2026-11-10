import {pool} from "@workspace/db";
import {cropCatalogue} from "@workspace/crop-calculations";
import {assertCatalogueRows,catalogueVersion} from "./catalogue-manifest";

let verified:Promise<typeof cropCatalogue>|undefined;
/** Development remains isolated; Production verifies the immutable release in
 * Supabase before using the identical compiled calculation/display dataset. */
export function operationalCatalogue() {
  if((process.env.NITROCROP_DB_BACKEND??"replit")==="replit")return Promise.resolve(cropCatalogue);
  if(!verified)verified=pool.query(
    `SELECT crop,variety,model,parameters,record_hash FROM agronomy_catalogue.model_profiles WHERE version=$1`,
    [catalogueVersion]).then(result=>{
      assertCatalogueRows(result.rows);
      return cropCatalogue;
    }).catch(()=>{
      verified=undefined;
      throw new Error("CATALOGUE_DATABASE_RELEASE_UNAVAILABLE");
    });
  return verified;
}
