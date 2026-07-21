import { getBooksForSettings } from "@/app/(app)/settings/actions";
import { BooksManager } from "@/components/settings/books-manager";

export default async function BooksSettingsPage() {
  const books = await getBooksForSettings();
  return <BooksManager books={books} />;
}
