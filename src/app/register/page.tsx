"use client";

import { useState } from "react";
import { useForm, useFieldArray, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { z } from "zod";
import { registrationSchema } from "@/lib/schemas";

type RegInput = z.input<typeof registrationSchema>;
type RegOutput = z.output<typeof registrationSchema>;

const STATES = [
  "NY", "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID",
  "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO",
  "MT", "NE", "NV", "NH", "NJ", "NM", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
  "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

export default function RegisterPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegInput, unknown, RegOutput>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      state: "NY",
      children: [{ name: "", age: "" as unknown as number }],
      smsOptIn: false,
      termsAccepted: false as unknown as true,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "children" });
  const adultArray = useFieldArray({ control, name: "adults" });
  const smsOptIn = watch("smsOptIn");
  const adults = watch("adults") ?? [];
  const adultsTotal = (adults?.length ?? 0) * 49.95;

  const onSubmit: SubmitHandler<RegOutput> = async (data) => {
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error || "Something went wrong. Try again.");
        setSubmitting(false);
        return;
      }
      // If adults were added, redirect to Stripe Checkout for payment.
      if (json.checkoutUrl) {
        window.location.href = json.checkoutUrl;
        return;
      }
      router.push("/register/thanks");
    } catch {
      setServerError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <Link href="/" className="text-xs text-sl-navy/60 hover:text-sl-navy">
        ← Back to Summer Strikes
      </Link>

      <div className="mt-4 rounded-2xl bg-sl-red px-5 py-4 text-center text-sm font-medium text-white">
        Please complete the form below to register your children
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-3 space-y-3">
        {/* Parent info */}
        <Section
          title="Parent account information"
          sub="One account per household. You manage all children from here."
        >
          <Row>
            <Field label="First name *" error={errors.firstName?.message}>
              <input
                {...register("firstName")}
                placeholder="Jane"
                autoComplete="given-name"
                className={inputCls(!!errors.firstName)}
              />
            </Field>
            <Field label="Last name *" error={errors.lastName?.message}>
              <input
                {...register("lastName")}
                placeholder="Smith"
                autoComplete="family-name"
                className={inputCls(!!errors.lastName)}
              />
            </Field>
          </Row>
          <Field label="Address *" error={errors.address?.message}>
            <input
              {...register("address")}
              placeholder="123 Main Street"
              autoComplete="street-address"
              className={inputCls(!!errors.address)}
            />
          </Field>
          <div className="grid grid-cols-[2fr_1fr_1fr] gap-2.5">
            <Field label="City *" error={errors.city?.message}>
              <input
                {...register("city")}
                placeholder="Amherst"
                autoComplete="address-level2"
                className={inputCls(!!errors.city)}
              />
            </Field>
            <Field label="State *" error={errors.state?.message}>
              <select {...register("state")} className={inputCls(!!errors.state)}>
                {STATES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="ZIP *" error={errors.zip?.message}>
              <input
                {...register("zip")}
                placeholder="14228"
                autoComplete="postal-code"
                inputMode="numeric"
                className={inputCls(!!errors.zip)}
              />
            </Field>
          </div>
        </Section>

        {/* Children */}
        <Section title="Children" sub="Add each child you'd like to enroll (ages 2–15).">
          <div className="space-y-2.5">
            {fields.map((field, i) => (
              <div
                key={field.id}
                className="grid grid-cols-[1fr_90px_auto] items-end gap-2.5"
              >
                <Field
                  label={i === 0 ? "Child's full name" : ""}
                  error={errors.children?.[i]?.name?.message}
                >
                  <input
                    {...register(`children.${i}.name` as const)}
                    placeholder="Emma Smith"
                    className={inputCls(!!errors.children?.[i]?.name)}
                  />
                </Field>
                <Field
                  label={i === 0 ? "Age" : ""}
                  error={errors.children?.[i]?.age?.message}
                >
                  <input
                    {...register(`children.${i}.age` as const)}
                    placeholder="8"
                    inputMode="numeric"
                    className={inputCls(!!errors.children?.[i]?.age)}
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => fields.length > 1 && remove(i)}
                  disabled={fields.length === 1}
                  aria-label="Remove child"
                  className="h-[34px] rounded-md border border-black/10 px-3 text-sl-navy/60 disabled:opacity-30 hover:border-sl-red hover:text-sl-red"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          {typeof errors.children?.message === "string" && (
            <p className="mt-2 text-xs text-sl-red">{errors.children.message}</p>
          )}
          <button
            type="button"
            onClick={() => fields.length < 8 && append({ name: "", age: "" as unknown as number })}
            disabled={fields.length >= 8}
            className="mt-2 text-xs font-medium text-sl-red hover:underline disabled:opacity-50"
          >
            + Add another child
          </button>
        </Section>

        {/* Adults (Family Pass) */}
        <Section
          title="Family Pass — adult members"
          sub={`Optional. Add additional family members to bowl 2 free games per day alongside your kids — $49.95 per person, one-time.`}
        >
          {adultArray.fields.length === 0 ? (
            <button
              type="button"
              onClick={() => adultArray.append({ name: "", age: "" as unknown as number })}
              className="text-sm font-medium text-sl-red hover:underline"
            >
              + Add a Family Pass member
            </button>
          ) : (
            <>
              <div className="space-y-2.5">
                {adultArray.fields.map((field, i) => (
                  <div
                    key={field.id}
                    className="grid grid-cols-[1fr_90px_auto] items-end gap-2.5"
                  >
                    <Field
                      label={i === 0 ? "Adult's full name" : ""}
                      error={errors.adults?.[i]?.name?.message}
                    >
                      <input
                        {...register(`adults.${i}.name` as const)}
                        placeholder="Chris Smith"
                        className={inputCls(!!errors.adults?.[i]?.name)}
                      />
                    </Field>
                    <Field
                      label={i === 0 ? "Age (optional)" : ""}
                      error={errors.adults?.[i]?.age?.message}
                    >
                      <input
                        {...register(`adults.${i}.age` as const)}
                        placeholder="—"
                        inputMode="numeric"
                        className={inputCls(!!errors.adults?.[i]?.age)}
                      />
                    </Field>
                    <button
                      type="button"
                      onClick={() => adultArray.remove(i)}
                      aria-label="Remove adult"
                      className="h-[34px] rounded-md border border-black/10 px-3 text-sl-navy/60 hover:border-sl-red hover:text-sl-red"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3 text-sm">
                <button
                  type="button"
                  onClick={() =>
                    adultArray.fields.length < 8 &&
                    adultArray.append({ name: "", age: "" as unknown as number })
                  }
                  disabled={adultArray.fields.length >= 8}
                  className="font-medium text-sl-red hover:underline disabled:opacity-50"
                >
                  + Add another adult
                </button>
                <div className="text-sl-navy">
                  <span className="text-sl-navy/60">Family Pass total: </span>
                  <span className="font-medium">${adultsTotal.toFixed(2)}</span>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-sl-navy/50">
                Payment is collected by Stripe when you submit. Kids are free
                either way — you can also add adults later from your dashboard.
              </p>
            </>
          )}
        </Section>

        {/* Contact & login */}
        <Section
          title="Contact & login"
          sub="All voucher notifications are sent via email. Enter a valid email address."
        >
          <Row>
            <Field label="Email *" error={errors.email?.message}>
              <input
                {...register("email")}
                placeholder="jane@email.com"
                type="email"
                autoComplete="email"
                className={inputCls(!!errors.email)}
              />
            </Field>
            <Field label="Confirm email *" error={errors.confirmEmail?.message}>
              <input
                {...register("confirmEmail")}
                placeholder="jane@email.com"
                type="email"
                className={inputCls(!!errors.confirmEmail)}
              />
            </Field>
          </Row>
          <Row>
            <Field label="Password *" error={errors.password?.message}>
              <input
                {...register("password")}
                type="password"
                placeholder="Min. 6 characters"
                autoComplete="new-password"
                className={inputCls(!!errors.password)}
              />
            </Field>
            <Field label="Confirm password *" error={errors.confirmPassword?.message}>
              <input
                {...register("confirmPassword")}
                type="password"
                autoComplete="new-password"
                className={inputCls(!!errors.confirmPassword)}
              />
            </Field>
          </Row>
          <Field
            label="Mobile phone (for text alerts)"
            error={errors.phone?.message}
          >
            <input
              {...register("phone")}
              placeholder="(716) 555-1234"
              type="tel"
              autoComplete="tel"
              className={inputCls(!!errors.phone)}
            />
          </Field>

          <div className="mt-3 space-y-3 border-t border-black/5 pt-3">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                {...register("smsOptIn")}
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-sl-red"
              />
              <span className="text-xs leading-relaxed text-sl-navy/70">
                I consent to receive SMS/text alerts from Manor Lanes about
                Summer Strikes vouchers and bowling updates. Message &amp; data
                rates may apply. Reply STOP to unsubscribe.
              </span>
            </label>
            {smsOptIn && (
              <p className="text-[11px] text-sl-navy/50 pl-7">
                Daily voucher reminder texts will be sent each morning during
                the program.
              </p>
            )}
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                {...register("termsAccepted")}
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-sl-red"
              />
              <span className="text-xs leading-relaxed text-sl-navy/70">
                I agree to the Terms of Use and certify I am the
                parent/guardian of all registered children, and they live in
                my household.
              </span>
            </label>
            {errors.termsAccepted?.message && (
              <p className="pl-7 text-xs text-sl-red">{errors.termsAccepted.message}</p>
            )}
          </div>

          {serverError && (
            <p className="mt-3 rounded-md bg-sl-red/10 px-3 py-2 text-sm text-sl-red">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-3 w-full rounded-md bg-sl-red px-4 py-3 text-sm font-medium text-white transition hover:bg-sl-red-dark disabled:opacity-50"
          >
            {submitting
              ? adultsTotal > 0
                ? "Sending you to checkout…"
                : "Registering…"
              : adultsTotal > 0
              ? `Continue to checkout · $${adultsTotal.toFixed(2)} →`
              : "Continue →"}
          </button>
        </Section>
      </form>
    </main>
  );
}

function Section({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-medium text-sl-navy">{title}</h3>
      <p className="mt-1 text-xs text-sl-navy/60">{sub}</p>
      <div className="mt-4 space-y-2.5">{children}</div>
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">{children}</div>;
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      {label && (
        <label className="mb-1 block text-xs text-sl-navy/60">{label}</label>
      )}
      {children}
      {error && <p className="mt-1 text-[11px] text-sl-red">{error}</p>}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `h-[34px] w-full rounded-md border bg-sl-light px-2.5 text-sm text-sl-navy placeholder:text-sl-navy/30 focus:outline-none focus:ring-2 focus:ring-sl-navy/20 ${
    hasError ? "border-sl-red" : "border-black/10"
  }`;
}
