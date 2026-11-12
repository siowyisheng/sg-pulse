// Made-up people for the demo's fake Singpass. The identifiers are invented, never NRICs.
import type { SingpassPerson } from "@/core/ports";

export interface DemoPersona extends SingpassPerson {
  /** Why this persona is interesting, if it's an edge case. */
  note: string;
}

export const DEMO_PERSONAS: DemoPersona[] = [
  { subject: "demo-0001", name: "TAN JIA MIN", dateOfBirth: "1992-06-14", sex: "F", note: "" },
  { subject: "demo-0002", name: "MUHAMMAD BIN ABDULLAH", dateOfBirth: "1985-03-02", sex: "M", note: "name with a particle" },
  { subject: "demo-0003", name: "PRIYA D/O SURESH", dateOfBirth: "1961-09-30", sex: "F", note: "60+" },
  { subject: "demo-0004", name: "LIM WEI JIE", dateOfBirth: "2010-01-20", sex: "M", note: "under 18: no initials" },
  { subject: "demo-0005", name: "ALEX WONG", dateOfBirth: "1999-12-05", sex: "U", note: "sex unknown" },
  { subject: "demo-0006", name: "CHUA XIN YI", dateOfBirth: "2016-04-11", sex: "F", note: "under 13: refused" },
];
