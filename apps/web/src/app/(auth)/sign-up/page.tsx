import { SignUpForm } from "./SignUpForm";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignUpPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const callbackURLParam = params.callbackURL;
  const callbackURL =
    typeof callbackURLParam === "string" ? callbackURLParam : "/app";

  return <SignUpForm callbackURL={callbackURL} />;
}

