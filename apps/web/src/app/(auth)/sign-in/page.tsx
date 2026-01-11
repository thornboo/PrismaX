import { SignInForm } from "./SignInForm";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignInPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const callbackURLParam = params.callbackURL;
  const callbackURL =
    typeof callbackURLParam === "string" ? callbackURLParam : "/app";

  return <SignInForm callbackURL={callbackURL} />;
}

