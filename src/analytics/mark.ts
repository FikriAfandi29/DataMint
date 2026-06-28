import { Mark } from "@crelora/mark";

let initialized = false;

export function initMark() {
  if (initialized) return;

  Mark.init({
    key: "pk_21c79d042c4022519766680d05f80d5e2c89645f4e19d4b6",
    require_consent: false,
    autocapture: {
      pageview: true,
    },
    site_id: "c97f1fb0-b51d-469b-b1ef-6085b14feab2",
    site_host: "datamintai.tech",
  });

  initialized = true;
}