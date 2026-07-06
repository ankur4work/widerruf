import { useState, useEffect } from "react";
import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "@remix-run/react";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Button,
  BlockStack,
  InlineStack,
  Checkbox,
  Badge,
  Text,
  Banner,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { SUPPORTED_LOCALES, t } from "~/lib/i18n";
import { defaultDecisionTemplate } from "~/lib/email-templates";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const [settings, sub] = await Promise.all([
    prisma.settings.upsert({
      where: { shop: session.shop },
      update: {},
      create: { shop: session.shop },
    }),
    prisma.shopSubscription.findUnique({ where: { shop: session.shop } }),
  ]);
  return json({ settings, isPro: sub?.plan === "PRO" });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();

  // Pro-gated fields are only persisted for Pro shops (never trust the client).
  const sub = await prisma.shopSubscription.findUnique({
    where: { shop: session.shop },
  });
  const isPro = sub?.plan === "PRO";

  const bool = (name: string) => form.get(name) === "true";

  const data: Record<string, unknown> = {
    buttonMode: String(form.get("buttonMode") || "FOOTER"),
    defaultLocale: String(form.get("defaultLocale") || "en"),
    buttonLabel: (form.get("buttonLabel") as string) || null,
    formTitle: (form.get("formTitle") as string) || null,
    formIntro: (form.get("formIntro") as string) || null,
    itemsFieldLabel: (form.get("itemsFieldLabel") as string) || null,
    itemsFieldHelp: (form.get("itemsFieldHelp") as string) || null,
    excludedNote: (form.get("excludedNote") as string) || null,
    accentColor: String(form.get("accentColor") || "#2563EB"),
    senderName: (form.get("senderName") as string) || null,
    emailReplyTo: (form.get("emailReplyTo") as string) || null,
    collectReason: bool("collectReason"),
    requireValidOrder: bool("requireValidOrder"),
    emailProcessedSubject: (form.get("emailProcessedSubject") as string) || null,
    emailProcessedBody: (form.get("emailProcessedBody") as string) || null,
    emailRejectedSubject: (form.get("emailRejectedSubject") as string) || null,
    emailRejectedBody: (form.get("emailRejectedBody") as string) || null,
  };

  if (isPro) {
    data.emailFrom = (form.get("emailFrom") as string) || null;
    data.autoCancelUnfulfilled = bool("autoCancelUnfulfilled");
    data.autoRefundOnProcess = bool("autoRefundOnProcess");
  }

  await prisma.settings.update({ where: { shop: session.shop }, data });
  return json({ ok: true });
};

export default function SettingsPage() {
  const { settings, isPro } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const nav = useNavigation();
  const shopify = useAppBridge();
  const saving = nav.state === "submitting";

  useEffect(() => {
    if ((actionData as any)?.ok) {
      shopify.toast.show("Settings saved");
    }
  }, [actionData, shopify]);

  const [buttonMode, setButtonMode] = useState(settings.buttonMode);
  const [defaultLocale, setDefaultLocale] = useState(settings.defaultLocale);
  const [buttonLabel, setButtonLabel] = useState(settings.buttonLabel ?? "");
  const [formTitle, setFormTitle] = useState(settings.formTitle ?? "");
  const [formIntro, setFormIntro] = useState(settings.formIntro ?? "");
  const [itemsLabel, setItemsLabel] = useState(settings.itemsFieldLabel ?? "");
  const [itemsHelp, setItemsHelp] = useState(settings.itemsFieldHelp ?? "");
  const [excludedNote, setExcludedNote] = useState(settings.excludedNote ?? "");
  const [accentColor, setAccentColor] = useState(settings.accentColor);
  const [senderName, setSenderName] = useState(settings.senderName ?? "");
  const [replyTo, setReplyTo] = useState(settings.emailReplyTo ?? "");
  const [emailFrom, setEmailFrom] = useState(settings.emailFrom ?? "");
  const [collectReason, setCollectReason] = useState(settings.collectReason);
  const [requireValidOrder, setRequireValidOrder] = useState(settings.requireValidOrder);
  const [autoCancel, setAutoCancel] = useState(settings.autoCancelUnfulfilled);
  const [autoRefund, setAutoRefund] = useState(settings.autoRefundOnProcess);
  const [procSubject, setProcSubject] = useState(settings.emailProcessedSubject ?? "");
  const [procBody, setProcBody] = useState(settings.emailProcessedBody ?? "");
  const [rejSubject, setRejSubject] = useState(settings.emailRejectedSubject ?? "");
  const [rejBody, setRejBody] = useState(settings.emailRejectedBody ?? "");

  const defaults = t(defaultLocale);
  const procDefault = defaultDecisionTemplate("PROCESSED", defaultLocale);
  const rejDefault = defaultDecisionTemplate("REJECTED", defaultLocale);

  function save() {
    const fd = new FormData();
    fd.set("buttonMode", buttonMode);
    fd.set("defaultLocale", defaultLocale);
    fd.set("buttonLabel", buttonLabel);
    fd.set("formTitle", formTitle);
    fd.set("formIntro", formIntro);
    fd.set("itemsFieldLabel", itemsLabel);
    fd.set("itemsFieldHelp", itemsHelp);
    fd.set("excludedNote", excludedNote);
    fd.set("accentColor", accentColor);
    fd.set("senderName", senderName);
    fd.set("emailReplyTo", replyTo);
    fd.set("collectReason", String(collectReason));
    fd.set("requireValidOrder", String(requireValidOrder));
    fd.set("emailFrom", emailFrom);
    fd.set("autoCancelUnfulfilled", String(autoCancel));
    fd.set("autoRefundOnProcess", String(autoRefund));
    fd.set("emailProcessedSubject", procSubject);
    fd.set("emailProcessedBody", procBody);
    fd.set("emailRejectedSubject", rejSubject);
    fd.set("emailRejectedBody", rejBody);
    submit(fd, { method: "post" });
  }

  return (
    <Page
      title="Settings"
      primaryAction={{ content: "Save", onAction: save, loading: saving }}
    >
      <Layout>
        <Layout.Section>
          <Banner tone="info">
            All form text below is editable on every plan — including free.
          </Banner>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Button & language
              </Text>
              <FormLayout>
                <Select
                  label="Button placement"
                  options={[
                    { label: "Footer link", value: "FOOTER" },
                    { label: "Floating button", value: "FLOATING" },
                  ]}
                  value={buttonMode}
                  onChange={setButtonMode}
                />
                <Select
                  label="Default language"
                  options={SUPPORTED_LOCALES.map((l) => ({ label: l.toUpperCase(), value: l }))}
                  value={defaultLocale}
                  onChange={setDefaultLocale}
                />
                <TextField
                  label="Button label"
                  value={buttonLabel}
                  onChange={setButtonLabel}
                  placeholder={defaults.withdrawButton}
                  helpText="Leave blank to use the legally-correct default for the chosen language."
                  autoComplete="off"
                />
              </FormLayout>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Form text
              </Text>
              <FormLayout>
                <TextField
                  label="Form title"
                  value={formTitle}
                  onChange={setFormTitle}
                  placeholder={defaults.formTitle}
                  autoComplete="off"
                />
                <TextField
                  label="Intro text"
                  value={formIntro}
                  onChange={setFormIntro}
                  placeholder={defaults.intro}
                  multiline={2}
                  autoComplete="off"
                />
                <TextField
                  label="Items field label"
                  value={itemsLabel}
                  onChange={setItemsLabel}
                  placeholder={defaults.itemsLabel}
                  helpText="Tip: change to 'Product / service' if you sell digital goods."
                  autoComplete="off"
                />
                <TextField
                  label="Items field help text"
                  value={itemsHelp}
                  onChange={setItemsHelp}
                  placeholder={defaults.itemsHelp}
                  autoComplete="off"
                />
                <TextField
                  label="Excluded goods note (optional)"
                  value={excludedNote}
                  onChange={setExcludedNote}
                  multiline={2}
                  autoComplete="off"
                />
                <Checkbox
                  label="Ask customers for a reason (optional field)"
                  checked={collectReason}
                  onChange={setCollectReason}
                  helpText="Adds an optional 'reason for withdrawal' dropdown. Powers your Analytics. Never blocks a withdrawal."
                />
                <Checkbox
                  label="Require a valid order number to submit"
                  checked={requireValidOrder}
                  onChange={setRequireValidOrder}
                  helpText="The order number + email must match a real order, or the form won't submit. Reduces spam. Note: a customer who mistypes their order number won't be able to withdraw — leave this off if you'd rather never block a genuine withdrawal (we still warn them). If the order can't be checked, we let it through."
                />
              </FormLayout>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Email (sender)
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Confirmation emails show your store name to customers. Replies go
                to your reply-to address.
              </Text>
              <FormLayout>
                <TextField
                  label="Sender name shown to customers"
                  value={senderName}
                  onChange={setSenderName}
                  placeholder="Your store name"
                  autoComplete="off"
                />
                <TextField
                  label="Reply-to email"
                  type="email"
                  value={replyTo}
                  onChange={setReplyTo}
                  placeholder="support@yourstore.com"
                  helpText="Customer replies to withdrawal emails go here."
                  autoComplete="off"
                />
              </FormLayout>

              <BlockStack gap="200">
                <InlineStack gap="200" blockAlign="center">
                  <Text as="h3" variant="headingSm">
                    Send from your own domain
                  </Text>
                  <Badge tone={isPro ? "success" : undefined}>Pro</Badge>
                </InlineStack>
                {isPro ? (
                  <TextField
                    label='Custom "From" address'
                    type="text"
                    value={emailFrom}
                    onChange={setEmailFrom}
                    placeholder="Your Store <withdrawals@yourstore.com>"
                    helpText="Emails are sent from this address. Add our SPF/DKIM records to your DNS so they don't land in spam — see the note below."
                    autoComplete="off"
                  />
                ) : (
                  <Banner tone="info">
                    <Text as="p" variant="bodyMd">
                      On Pro, confirmation emails are sent from your own verified
                      domain (e.g. <code>withdrawals@yourstore.com</code>) instead
                      of the shared sender.{" "}
                      <a href="/app/billing">Upgrade to Pro</a>.
                    </Text>
                  </Banner>
                )}
                {isPro && emailFrom.trim() !== "" && (
                  <Banner tone="warning">
                    <Text as="p" variant="bodyMd">
                      For deliverability, your domain must authorize our mail
                      server. Add these DNS records:
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      SPF: include <code>widerruf.onkra.online</code> in your TXT
                      SPF record. DKIM/DMARC: contact support to receive your
                      signing keys. Until verified, emails may be marked as spam.
                    </Text>
                  </Banner>
                )}
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack gap="200" blockAlign="center">
                <Text as="h2" variant="headingMd">
                  Order automation
                </Text>
                <Badge tone={isPro ? "success" : undefined}>Pro</Badge>
              </InlineStack>
              <Text as="p" variant="bodyMd" tone="subdued">
                When you mark a request as <b>Processed</b>, act on the matching
                Shopify order automatically. We match by the order number the
                customer entered.
              </Text>
              {!isPro && (
                <Banner tone="info">
                  <Text as="p" variant="bodyMd">
                    Order automation is a Pro feature.{" "}
                    <a href="/app/billing">Upgrade to Pro</a> to enable it.
                  </Text>
                </Banner>
              )}
              <Checkbox
                label="Auto-cancel unfulfilled orders on withdrawal"
                checked={autoCancel}
                onChange={setAutoCancel}
                disabled={!isPro}
                helpText="Cancels the order and restocks inventory — only if it hasn't shipped yet. Fulfilled orders are never auto-cancelled."
              />
              <Checkbox
                label="Create a refund when processing"
                checked={autoRefund}
                onChange={setAutoRefund}
                disabled={!isPro}
                helpText="Issues a full refund (items + shipping) via Shopify's suggested refund. Combined with auto-cancel, the refund happens in the same step."
              />
              {isPro && (autoCancel || autoRefund) && (
                <Banner tone="warning">
                  These actions modify real Shopify orders and money. They run
                  automatically each time you mark a request as Processed.
                </Banner>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Decision emails (accept / reject)
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                The default message customers receive when you accept or reject a
                request. You can still edit and preview each email before sending
                it from the dashboard. Placeholders:{" "}
                <code>{"{{customer_name}}"}</code>, <code>{"{{store_name}}"}</code>,{" "}
                <code>{"{{order}}"}</code>, <code>{"{{reason}}"}</code>.
              </Text>
              <FormLayout>
                <Text as="h3" variant="headingSm">
                  Accepted
                </Text>
                <TextField
                  label="Subject"
                  value={procSubject}
                  onChange={setProcSubject}
                  placeholder={procDefault.subject}
                  autoComplete="off"
                />
                <TextField
                  label="Message"
                  value={procBody}
                  onChange={setProcBody}
                  placeholder={procDefault.body}
                  multiline={5}
                  autoComplete="off"
                />
                <Text as="h3" variant="headingSm">
                  Rejected
                </Text>
                <TextField
                  label="Subject"
                  value={rejSubject}
                  onChange={setRejSubject}
                  placeholder={rejDefault.subject}
                  autoComplete="off"
                />
                <TextField
                  label="Message"
                  value={rejBody}
                  onChange={setRejBody}
                  placeholder={rejDefault.body}
                  multiline={5}
                  autoComplete="off"
                />
              </FormLayout>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Appearance
              </Text>
              <TextField
                label="Accent color"
                value={accentColor}
                onChange={setAccentColor}
                autoComplete="off"
              />
              <Button onClick={save} loading={saving} variant="primary">
                Save settings
              </Button>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
