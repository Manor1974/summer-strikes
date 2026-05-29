import "server-only";

// Conqueror FBT export utilities.
//
// Format reverse-engineered from a live FBT.xml export from Manor Lanes'
// Conqueror system. The file is UTF-16 LE with a BOM and CRLF line endings.
// Root is <Data> with a single <Header> and a series of <Person> blocks.
//
// Key fields:
//   <ID>            4–5 digit numeric. Our Summer Strikes bowlers use the
//                   shared bowler_id_seq sequence starting at 1000.
//   <FirstName>     given name (split from the registered full name).
//   <LastName>      rest of the registered name.
//   <NickName>      what the lane overhead displays. We set this to first
//                   name only so kids show as "Emma" not "Emma Russo".
//   <RegistrationDate>  yyyy-MM-dd of when they joined Summer Strikes.
//   <CustomerType>  "Individual" for Summer Strikes registrants.
//   <IsActive>      "Yes" — we deactivate via a separate update if needed.

export type FbtBowler = {
  bowlerNumber: number;
  name: string; // full name from registration
  registeredAt: Date;
  kind: "child" | "adult";
  age?: number;
};

// Split a free-text name into first / last. For single-word names, last is empty.
function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function pad4(n: number): string {
  return String(n).padStart(4, "0");
}

// Builds a single <Person> block matching the FBT.xml structure. Most
// optional fields are emitted as self-closing tags to mirror the format
// Conqueror produces on export — keeps the import idempotent.
function personXml(b: FbtBowler, messageNumber: number): string {
  const { first, last } = splitName(b.name);
  const id = pad4(b.bowlerNumber);
  const regDate = b.registeredAt.toISOString().slice(0, 10);
  const notes = `Summer Strikes 2026 ${b.kind === "child" ? "kid" : "Family Pass adult"} (age ${b.age ?? "?"})`;

  const lines = [
    `\t<Person>`,
    `\t\t<ID>${escapeXml(id)}</ID>`,
    `\t\t<FirstName>${escapeXml(first)}</FirstName>`,
    `\t\t<LastName>${escapeXml(last)}</LastName>`,
    `\t\t<NickName>${escapeXml(first)}</NickName>`,
    `\t\t<MiddleInit />`,
    `\t\t<Address1 />`,
    `\t\t<Address2 />`,
    `\t\t<City />`,
    `\t\t<State />`,
    `\t\t<Zip />`,
    `\t\t<Country />`,
    `\t\t<OKToShareName>No</OKToShareName>`,
    `\t\t<DaytimePhone />`,
    `\t\t<EveningPhone />`,
    `\t\t<FaxNumber />`,
    `\t\t<Email />`,
    `\t\t<OKToSendEmail>No</OKToSendEmail>`,
    `\t\t<Birthdate />`,
    `\t\t<Gender />`,
    `\t\t<MaritalStatus>Other</MaritalStatus>`,
    `\t\t<SmokingPreference />`,
    `\t\t<PointBalance>0</PointBalance>`,
    `\t\t<FBTExpirationDate />`,
    `\t\t<CustomerType>Individual</CustomerType>`,
    `\t\t<CustTitle />`,
    `\t\t<CustSuffix />`,
    `\t\t<County />`,
    `\t\t<District />`,
    `\t\t<SecondaryEmail />`,
    `\t\t<WebSite />`,
    `\t\t<NationalCode />`,
    `\t\t<MarriageDate />`,
    `\t\t<VATNumber />`,
    `\t\t<Notes>${escapeXml(notes)}</Notes>`,
    `\t\t<RegistrationDate>${regDate}</RegistrationDate>`,
    `\t\t<IsActive>Yes</IsActive>`,
    `\t\t<Web>No</Web>`,
    `\t\t<AllowSms>No</AllowSms>`,
    `\t\t<AllowPhoneCalls>No</AllowPhoneCalls>`,
    `\t\t<WantMailing>No</WantMailing>`,
    `\t\t<IsMainContact>No</IsMainContact>`,
    `\t\t<IsContactActive>No</IsContactActive>`,
    `\t\t<WantShoes>No</WantShoes>`,
    `\t\t<IsTournamentPlayer>No</IsTournamentPlayer>`,
    `\t\t<IsLeaguePlayer>No</IsLeaguePlayer>`,
    `\t\t<IsDataAvailableForOthers>No</IsDataAvailableForOthers>`,
    `\t\t<AllowDirectSearch>Yes</AllowDirectSearch>`,
    `\t\t<ShoeSize />`,
    `\t\t<CompanyName />`,
    `\t\t<JobTitle />`,
    `\t\t<PresoldGames>0.0</PresoldGames>`,
    `\t\t<QCash>0</QCash>`,
    `\t\t<StatsReferent>Self</StatsReferent>`,
    `\t\t<CustFreeEntryCode />`,
    `\t\t<ContactDept />`,
    `\t\t<RegistrationOperator>SummerStrikes</RegistrationOperator>`,
    `\t\t<LastModOperator />`,
    `\t\t<TaxExemptionNumber />`,
    `\t\t<FBAccount>0.0000</FBAccount>`,
    `\t\t<FBAccountDebitLimit>0.0000</FBAccountDebitLimit>`,
    `\t\t<LastModCenter>0</LastModCenter>`,
    `\t\t<Hand>NotDeclared</Hand>`,
    `\t\t<RsrvStatsStartDate>${regDate}</RsrvStatsStartDate>`,
    `\t\t<RsrvCount>0</RsrvCount>`,
    `\t\t<RsrvNoshowCount>0</RsrvNoshowCount>`,
    `\t\t<RsrvCancCount>0</RsrvCancCount>`,
    `\t\t<RsrvAutoCancCount>0</RsrvAutoCancCount>`,
    `\t\t<BowlerTrackID />`,
    `\t\t<BowlerTrackSystemOfRecord />`,
    `\t\t<AgeBracket>NotDeclared</AgeBracket>`,
    `\t</Person>`,
  ];
  void messageNumber; // single MessageNumber for the file, not per-person
  return lines.join("\r\n");
}

// Build the complete UTF-16 LE BOM XML file Conqueror imports.
export function buildFbtXml(bowlers: FbtBowler[]): Buffer {
  const header = [
    `<Data>`,
    `\t<Header>`,
    `\t\t<Version>2.0</Version>`,
    `\t\t<SystemOfRecord>Conqueror_3254</SystemOfRecord>`,
    `\t\t<MessageNumber>1</MessageNumber>`,
    `\t</Header>`,
  ];
  const people = bowlers.map((b, i) => personXml(b, i + 1));
  const footer = [`</Data>`];

  const text = [...header, ...people, ...footer].join("\r\n");

  // UTF-16 LE with BOM (0xFF 0xFE) to match Conqueror's own export format
  const bom = Buffer.from([0xff, 0xfe]);
  const body = Buffer.from(text, "utf16le");
  return Buffer.concat([bom, body]);
}

// Compact JSON shape we POST to manorlanes.com/lm/summer-strikes-receiver.php.
// FRONTDESK1's poller picks these up and produces XML for FBT import.
export type FbtReceiverPayload = {
  bowler_id: string;
  first_name: string;
  last_name: string;
  nickname: string; // = first_name (overhead display)
  age: number;
  kind: "child" | "adult";
  is_active: "Yes";
  registration_date: string; // yyyy-MM-dd
  notes: string;
};

export function toReceiverPayload(b: FbtBowler): FbtReceiverPayload {
  const { first, last } = splitName(b.name);
  return {
    bowler_id: pad4(b.bowlerNumber),
    first_name: first,
    last_name: last,
    nickname: first,
    age: b.age ?? 0,
    kind: b.kind,
    is_active: "Yes",
    registration_date: b.registeredAt.toISOString().slice(0, 10),
    notes: `Summer Strikes 2026 ${b.kind === "child" ? "kid" : "Family Pass adult"} (age ${b.age ?? "?"})`,
  };
}

// Fire-and-forget POST to the WP receiver. Doesn't throw — registration
// flow must not fail if Manor Lanes' WP is briefly unreachable.
export async function postToFbtReceiver(bowlers: FbtBowler[]): Promise<void> {
  if (bowlers.length === 0) return;
  const url = process.env.FBT_RECEIVER_URL;
  const password = process.env.FBT_RECEIVER_PASSWORD;
  if (!url || !password) {
    console.warn("[fbt] receiver URL/password not configured — skipped");
    return;
  }
  const body = JSON.stringify({
    password,
    bowlers: bowlers.map(toReceiverPayload),
  });
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      // 8s timeout via AbortController
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error(`[fbt] receiver ${res.status}: ${txt.slice(0, 200)}`);
    }
  } catch (err) {
    console.error("[fbt] receiver POST failed:", err);
  }
}
