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
  RangeSlider,
  Button,
  BlockStack,
  Text,
  Banner,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { SUPPORTED_LOCALES, t } from "~/lib/i18n";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const settings = await prisma.settings.upsert({
    where: { shop: session.shop },
    update: {},
    create: { shop: session.shop },
  });
  return json({ settings });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();

  const withdrawalDays = Math.min(
    30,
    Math.max(14, Number(form.get("withdrawalDays") || 14)),
  );

  await prisma.settings.update({
    where: { shop: session.shop },
    data: {
      buttonMode: String(form.get("buttonMode") || "FOOTER"),
      defaultLocale: String(form.get("defaultLocale") || "en"),
      buttonLabel: (form.get("buttonLabel") as string) || null,
      formTitle: (form.get("formTitle") as string) || null,
      formIntro: (form.get("formIntro") as string) || null,
      itemsFieldLabel: (form.get("itemsFieldLabel") as string) || null,
      itemsFieldHelp: (form.get("itemsFieldHelp") as string) || null,
      withdrawalDays,
      excludedNote: (form.get("excludedNote") as string) || null,
      accentColor: String(form.get("accentColor") || "#2563EB"),
      senderName: (form.get("senderName") as string) || null,
      emailReplyTo: (form.get("emailReplyTo") as string) || null,
    },
  });
  return json({ ok: true });
};

export default function SettingsPage() {
  const { settings } = useLoaderData<typeof loader>();
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
  const [withdrawalDays, setWithdrawalDays] = useState(settings.withdrawalDays);
  const [excludedNote, setExcludedNote] = useState(settings.excludedNote ?? "");
  const [accentColor, setAccentColor] = useState(settings.accentColor);
  const [senderName, setSenderName] = useState(settings.senderName ?? "");
  const [replyTo, setReplyTo] = useState(settings.emailReplyTo ?? "");

  const defaults = t(defaultLocale);

  function save() {
    const fd = new FormData();
    fd.set("buttonMode", buttonMode);
    fd.set("defaultLocale", defaultLocale);
    fd.set("buttonLabel", buttonLabel);
    fd.set("formTitle", formTitle);
    fd.set("formIntro", formIntro);
    fd.set("itemsFieldLabel", itemsLabel);
    fd.set("itemsFieldHelp", itemsHelp);
    fd.set("withdrawalDays", String(withdrawalDays));
    fd.set("excludedNote", excludedNote);
    fd.set("accentColor", accentColor);
    fd.set("senderName", senderName);
    fd.set("emailReplyTo", replyTo);
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
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Compliance
              </Text>
              <RangeSlider
                label={`Withdrawal window: ${withdrawalDays} days`}
                min={14}
                max={30}
                value={withdrawalDays}
                onChange={(v) => setWithdrawalDays(Array.isArray(v) ? v[0] : v)}
                output
              />
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
