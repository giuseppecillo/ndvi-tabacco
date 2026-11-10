import {pool} from "@workspace/db";
import type {CropProfile} from "@workspace/crop-calculations";

export const proposalColumns = `id,crop,name,status,reference_id AS "referenceId",
  reference_name AS "referenceName",profile,created_at AS "createdAt",review_note AS "reviewNote"`;
export async function approvedVariety(crop:string,name:string):Promise<CropProfile|undefined> {
  const {rows}=await pool.query(`SELECT profile FROM agronomy_catalogue.variety_submissions
    WHERE crop=$1 AND name=$2 AND status='approved'`,[crop,name]);
  return rows[0]?.profile;
}
