import { useState } from "react";
import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import {
  AppProvider,
  Page,
  Card,
  FormLayout,
  TextField,
  Button,
  Text,
} from "@shopify/polaris";
import polarisTranslations from "@shopify/polaris/locales/en.json";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { login } from "~/shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const errors = await login(request);
  return json({ errors, polarisTranslations });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const errors = await login(request);
  return json({ errors });
};

export default function Auth() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [shop, setShop] = useState("");
  const errors = (actionData as any)?.errors ?? (loaderData as any)?.errors ?? {};

  return (
    <AppProvider i18n={loaderData.polarisTranslations}>
      <Page>
        <Card>
          <Form method="post">
            <FormLayout>
              <Text variant="headingMd" as="h2">
                Log in
              </Text>
              <TextField
                type="text"
                name="shop"
                label="Shop domain"
                helpText="example.myshopify.com"
                value={shop}
                onChange={setShop}
                autoComplete="on"
                error={errors.shop}
              />
              <Button submit>Log in</Button>
            </FormLayout>
          </Form>
        </Card>
      </Page>
    </AppProvider>
  );
}
